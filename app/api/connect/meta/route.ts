import { NextResponse, type NextRequest } from 'next/server';
import { guard } from '@/lib/api';
import { baseUrl, env } from '@/lib/env';

export const runtime = 'nodejs';

const SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
  'business_management',
];

/** Step one of "Connect Facebook & Instagram": hand over to Meta's consent screen. */
export async function GET(req: NextRequest) {
  const blocked = await guard();
  if (blocked) return blocked;

  const settings = (query: string) => NextResponse.redirect(new URL(`/settings${query}`, req.url));

  if (!env.metaAppId || !env.metaAppSecret) {
    return settings('?error=' + encodeURIComponent('META_APP_ID and META_APP_SECRET are not set on this deployment.'));
  }

  const redirectUri = `${baseUrl(req.url)}/api/connect/callback/meta`;
  const state = crypto.randomUUID().replace(/-/g, '');
  const auth = new URL(`https://www.facebook.com/${env.graphVersion}/dialog/oauth`);
  auth.searchParams.set('client_id', env.metaAppId);
  auth.searchParams.set('redirect_uri', redirectUri);
  auth.searchParams.set('state', state);
  auth.searchParams.set('response_type', 'code');
  auth.searchParams.set('scope', SCOPES.join(','));

  const res = NextResponse.redirect(auth.toString());
  res.cookies.set('fenora_oauth_meta', state, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 900,
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}
