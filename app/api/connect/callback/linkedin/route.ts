import { NextResponse, type NextRequest } from 'next/server';
import { guard } from '@/lib/api';
import { baseUrl, env } from '@/lib/env';
import { sealLinkedIn } from '@/lib/connections';
import { getUserInfo, listOrganizations } from '@/lib/linkedin';
import { updateState } from '@/lib/store';
import type { LinkedInConnection } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

/** Step two: exchange the code, work out which Pages this account can post to. */
export async function GET(req: NextRequest) {
  const blocked = await guard();
  if (blocked) return blocked;

  const url = new URL(req.url);
  const back = (query: string) => {
    const res = NextResponse.redirect(new URL(`/settings${query}`, url.origin));
    res.cookies.set('fenora_oauth_li', '', { path: '/', maxAge: 0 });
    return res;
  };

  const denied = url.searchParams.get('error_description') ?? url.searchParams.get('error');
  if (denied) return back(`?error=${encodeURIComponent(denied)}`);

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieState = req.cookies.get('fenora_oauth_li')?.value;
  if (!code)
    return back('?error=' + encodeURIComponent('LinkedIn did not return an authorisation code.'));
  if (!state || !cookieState || state !== cookieState) {
    return back(
      '?error=' + encodeURIComponent('That sign-in attempt expired. Press Connect again.'),
    );
  }

  const redirectUri = `${baseUrl(req.url)}/api/connect/callback/linkedin`;

  try {
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: env.linkedInClientId,
        client_secret: env.linkedInClientSecret,
      }),
      cache: 'no-store',
    });
    const tokenJson = (await tokenRes.json()) as {
      access_token?: string;
      expires_in?: number;
      error_description?: string;
      error?: string;
    };
    if (!tokenJson.access_token) {
      throw new Error(
        tokenJson.error_description ?? tokenJson.error ?? 'LinkedIn would not exchange that code.',
      );
    }

    const token = tokenJson.access_token;
    const [me, orgs] = await Promise.all([
      getUserInfo(token).catch(() => null),
      listOrganizations(token).catch(() => []),
    ]);

    if (!me && !orgs.length) {
      return back(
        '?error=' +
          encodeURIComponent(
            'LinkedIn accepted the sign-in but returned no profile or Pages. Check the app has the "Share on LinkedIn" and "Sign In with LinkedIn" products.',
          ),
      );
    }

    const connection: LinkedInConnection = {
      token,
      expiresAt: tokenJson.expires_in
        ? new Date(Date.now() + tokenJson.expires_in * 1000).toISOString()
        : null,
      person: me ? { urn: `urn:li:person:${me.sub}`, name: me.name ?? null } : null,
      orgs,
      author: orgs.length ? 'organization' : 'person',
      selectedOrgUrn: orgs[0]?.urn ?? '',
      connectedAt: new Date().toISOString(),
      source: 'oauth',
      accountName: me?.name ?? orgs[0]?.name ?? null,
    };

    await updateState((draft) => {
      draft.connections.linkedin = sealLinkedIn(connection);
    });

    const name = orgs.length ? (orgs[0].name ?? 'your Page') : (me?.name ?? 'your profile');
    return back(`?connected=linkedin&as=${encodeURIComponent(name)}`);
  } catch (err) {
    return back(
      `?error=${encodeURIComponent((err as Error)?.message ?? 'Could not connect to LinkedIn.')}`,
    );
  }
}
