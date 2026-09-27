import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/lib/env';
import { readJson, fail } from '@/lib/api';
import { createSession, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const expected = env.deskPassword;
  if (!expected) {
    return fail('No password is set for this desk.', 503, {
      hint: 'Add DESK_PASSWORD in Vercel → Settings → Environment Variables and redeploy.',
    });
  }

  const { password } = await readJson<{ password?: string }>(req);
  const supplied = typeof password === 'string' ? password : '';
  if (!timingSafeEqual(supplied, expected)) {
    return fail('That password is not right.', 401);
  }

  const token = await createSession(expected);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const res = NextResponse.json({ ok: true });
  res.headers.append(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}${secure}`,
  );
  return res;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
