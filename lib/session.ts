/**
 * Desk session cookie. Signed with HMAC-SHA-256 over DESK_PASSWORD using Web
 * Crypto only, so the same code runs in the Edge middleware and in Node route
 * handlers. No dependencies, no server-side session store.
 */

export const SESSION_COOKIE = 'fenora_desk';
const SESSION_DAYS = 30;
const encoder = new TextEncoder();

function base64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sign(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return base64url(new Uint8Array(mac));
}

function equals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSession(password: string, days = SESSION_DAYS): Promise<string> {
  const expires = Date.now() + days * 864e5;
  const payload = `v1.${expires}`;
  return `${payload}.${await sign(password, payload)}`;
}

export async function verifySession(
  value: string | undefined | null,
  password: string,
): Promise<boolean> {
  if (!value || !password) return false;
  const parts = value.split('.');
  if (parts.length !== 3) return false;
  const [version, expires, signature] = parts;
  if (version !== 'v1') return false;
  const expiry = Number(expires);
  if (!Number.isFinite(expiry) || expiry < Date.now()) return false;
  return equals(signature, await sign(password, `${version}.${expires}`));
}

export const SESSION_MAX_AGE = SESSION_DAYS * 86400;
