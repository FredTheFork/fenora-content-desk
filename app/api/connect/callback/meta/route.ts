import { NextResponse, type NextRequest } from 'next/server';
import { guard } from '@/lib/api';
import { baseUrl, env } from '@/lib/env';
import { sealMeta } from '@/lib/connections';
import { listUserPages } from '@/lib/meta';
import { updateState } from '@/lib/store';
import type { MetaConnection } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

/** Step two: swap the code for a long-lived token, find the Page, remember it. */
export async function GET(req: NextRequest) {
  const blocked = await guard();
  if (blocked) return blocked;

  const url = new URL(req.url);
  const back = (query: string) => {
    const res = NextResponse.redirect(new URL(`/settings${query}`, url.origin));
    res.cookies.set('fenora_oauth_meta', '', { path: '/', maxAge: 0 });
    return res;
  };

  const denied = url.searchParams.get('error_description') ?? url.searchParams.get('error');
  if (denied) return back(`?error=${encodeURIComponent(denied)}`);

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieState = req.cookies.get('fenora_oauth_meta')?.value;
  if (!code)
    return back('?error=' + encodeURIComponent('Meta did not return an authorisation code.'));
  if (!state || !cookieState || state !== cookieState) {
    return back(
      '?error=' + encodeURIComponent('That sign-in attempt expired. Press Connect again.'),
    );
  }

  const redirectUri = `${baseUrl(req.url)}/api/connect/callback/meta`;

  try {
    const tokenRes = await fetch(
      `https://graph.facebook.com/${env.graphVersion}/oauth/access_token?` +
        new URLSearchParams({
          client_id: env.metaAppId,
          client_secret: env.metaAppSecret,
          redirect_uri: redirectUri,
          code,
        }),
      { cache: 'no-store' },
    );
    const tokenJson = (await tokenRes.json()) as {
      access_token?: string;
      error?: { message?: string };
    };
    if (!tokenJson.access_token) {
      throw new Error(tokenJson.error?.message ?? 'Meta would not exchange that code for a token.');
    }

    // A short-lived token lasts an hour; the long-lived one lasts 60 days and
    // passes that longevity on to the Page tokens we are about to read.
    const longRes = await fetch(
      `https://graph.facebook.com/${env.graphVersion}/oauth/access_token?` +
        new URLSearchParams({
          grant_type: 'fb_exchange_token',
          client_id: env.metaAppId,
          client_secret: env.metaAppSecret,
          fb_exchange_token: tokenJson.access_token,
        }),
      { cache: 'no-store' },
    );
    const longJson = (await longRes.json()) as {
      access_token?: string;
      expires_in?: number;
      error?: { message?: string };
    };
    const userToken = longJson.access_token ?? tokenJson.access_token;
    const expiresAt = longJson.expires_in
      ? new Date(Date.now() + longJson.expires_in * 1000).toISOString()
      : null;

    const pages = await listUserPages(userToken);
    if (!pages.length) {
      return back(
        '?error=' +
          encodeURIComponent(
            'That Facebook account does not administer any Page. Connect a Page, then try again.',
          ),
      );
    }

    const preferred = pages.find((p) => p.instagram_business_account?.id) ?? pages[0];
    const connection: MetaConnection = {
      userToken,
      expiresAt,
      pages: pages.map((p) => ({
        id: p.id,
        name: p.name,
        token: p.access_token,
        ig: p.instagram_business_account?.id
          ? {
              id: p.instagram_business_account.id,
              username: p.instagram_business_account.username ?? null,
            }
          : null,
      })),
      selectedPageId: preferred.id,
      connectedAt: new Date().toISOString(),
      source: 'oauth',
      accountName: preferred.name,
    };

    await updateState((draft) => {
      draft.connections.meta = sealMeta(connection);
    });

    const igNote = preferred.instagram_business_account?.username
      ? `&instagram=${encodeURIComponent(preferred.instagram_business_account.username)}`
      : '&instagramMissing=1';
    return back(`?connected=meta&page=${encodeURIComponent(preferred.name)}${igNote}`);
  } catch (err) {
    return back(
      `?error=${encodeURIComponent((err as Error)?.message ?? 'Could not connect to Meta.')}`,
    );
  }
}
