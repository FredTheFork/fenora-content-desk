import { NextResponse, type NextRequest } from 'next/server';
import { guard } from '@/lib/api';
import { baseUrl, env } from '@/lib/env';

export const runtime = 'nodejs';

const SCOPES = ['w_organization_social', 'r_organization_social', 'w_member_social', 'openid', 'profile'];

/** Step one of "Connect LinkedIn". */
export async function GET(req: NextRequest) {
  const blocked = await guard();
  if (blocked) return blocked;

  if (!env.linkedInClientId || !env.linkedInClientSecret) {
    return NextResponse.redirect(
      new URL(
        '/settings?error=' +
          encodeURIComponent('LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET are not set on this deployment.'),
        req.url,
      ),
    );
  }

  const redirectUri = `${baseUrl(req.url)}/api/connect/callback/linkedin`;
  const state = crypto.randomUUID().replace(/-/g, '');
  const auth = new URL('https://www.linkedin.com/oauth/v2/authorization');
  auth.searchParams.set('response_type', 'code');
  auth.searchParams.set('client_id', env.linkedInClientId);
  auth.searchParams.set('redirect_uri', redirectUri);
  auth.searchParams.set('state', state);
  auth.searchParams.set('scope', SCOPES.join(' '));

  const res = NextResponse.redirect(auth.toString());
  res.cookies.set('fenora_oauth_li', state, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 900,
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}
