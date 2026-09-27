import 'server-only';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySession } from './session';
import { env } from './env';

/** Standard JSON envelopes so the browser never has to guess. */
export function ok<T extends Record<string, unknown>>(data: T = {} as T): Response {
  return Response.json({ ok: true, ...data });
}

export function fail(error: string, status = 400, extra: Record<string, unknown> = {}): Response {
  return Response.json({ ok: false, error, ...extra }, { status });
}

/** Middleware already blocks unauthenticated calls; this is the belt to its braces. */
export async function isAuthenticated(): Promise<boolean> {
  if (!env.deskPassword) return true;
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value, env.deskPassword);
}

export async function guard(): Promise<Response | null> {
  if (!env.deskPassword) {
    // Local development runs open; anything deployed stays shut (middleware
    // sends people to /setup until a password exists).
    if (!env.isProduction || env.allowPublicDesk) return null;
    return fail(
      'The desk is locked: set DESK_PASSWORD in Vercel → Settings → Environment Variables, then redeploy.',
      503,
    );
  }
  if (!(await isAuthenticated())) return fail('Please sign in again.', 401);
  return null;
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

export function str(value: unknown, max = 5000): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}
