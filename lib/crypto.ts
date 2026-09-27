import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { env } from './env';

/**
 * Access tokens are sealed before they are written to storage. With DESK_SECRET
 * set they are encrypted with AES-256-GCM; without it they are stored as plain
 * JSON (still inside your private database) so the desk keeps working.
 */

const VERSION = 'v1';

function key(): Buffer | null {
  const secret = env.deskSecret;
  if (!secret) return null;
  return createHash('sha256').update(secret).digest();
}

export function seal(value: unknown): string {
  const json = JSON.stringify(value ?? null);
  const k = key();
  if (!k) return `plain:${json}`;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', k, iv);
  const enc = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${iv.toString('base64url')}:${tag.toString('base64url')}:${enc.toString('base64url')}`;
}

export type OpenResult<T> = { ok: true; value: T | null } | { ok: false; reason: string };

export function open<T>(sealed: string | undefined | null): OpenResult<T> {
  if (!sealed) return { ok: true, value: null };
  if (sealed.startsWith('plain:')) {
    try {
      return { ok: true, value: JSON.parse(sealed.slice(6)) as T };
    } catch {
      return { ok: false, reason: 'Stored credentials could not be read.' };
    }
  }
  const k = key();
  if (!k) {
    return { ok: false, reason: 'These credentials are encrypted but DESK_SECRET is not set.' };
  }
  const [version, ivB64, tagB64, dataB64] = sealed.split(':');
  if (version !== VERSION || !ivB64 || !tagB64 || !dataB64) {
    return { ok: false, reason: 'Stored credentials are in an unknown format.' };
  }
  try {
    const decipher = createDecipheriv('aes-256-gcm', k, Buffer.from(ivB64, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    const json = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
    return { ok: true, value: JSON.parse(json) as T };
  } catch {
    return {
      ok: false,
      reason:
        'Stored credentials could not be decrypted — DESK_SECRET has changed since they were saved.',
    };
  }
}

export function encryptionOn(): boolean {
  return Boolean(env.deskSecret);
}
