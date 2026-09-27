import 'server-only';
import { env } from './env';

/**
 * Meta Graph API client — Instagram and Facebook publishing.
 *
 * Instagram publishes in two steps: create a media container that points at a
 * publicly reachable image, wait for Meta to finish processing it, then publish
 * the container. Facebook posts a photo from the same public URL.
 */

export class PlatformError extends Error {
  hint?: string;
  code?: number;
  constructor(message: string, hint?: string, code?: number) {
    super(message);
    this.name = 'PlatformError';
    this.hint = hint;
    this.code = code;
  }
}

interface GraphErrorBody {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    error_user_title?: string;
    error_user_msg?: string;
  };
}

type Params = Record<string, string | number | undefined>;

let versionFallback = false;

/** Overridable so tools/selftest.mjs can point the client at a mock Graph API. */
export function graphBase(): string {
  return (process.env.META_GRAPH_BASE || 'https://graph.facebook.com').replace(/\/+$/, '');
}

function endpoint(path: string, version: string | null): string {
  const clean = path.replace(/^\/+/, '');
  return version ? `${graphBase()}/${version}/${clean}` : `${graphBase()}/${clean}`;
}

function looksLikeVersionProblem(status: number, body: GraphErrorBody): boolean {
  const message = body.error?.message ?? '';
  const code = body.error?.code;
  if (code === 2635) return true; // deprecated API version
  if (/unsupported get request/i.test(message)) return true;
  if (status === 400 && /version/i.test(message)) return true;
  if (/does not exist/i.test(message) && /v\d+\.\d+/i.test(message)) return true;
  return false;
}

async function call<T>(path: string, method: 'GET' | 'POST' | 'DELETE', params: Params = {}): Promise<T> {
  const attempts: (string | null)[] = versionFallback ? [null] : [env.graphVersion, null];
  let lastError: PlatformError | null = null;

  for (const version of attempts) {
    const url = new URL(endpoint(path, version));
    const cleanup = Object.entries(params).filter(([, v]) => v !== undefined) as [string, string | number][];
    let init: RequestInit;
    if (method === 'GET') {
      for (const [k, v] of cleanup) url.searchParams.set(k, String(v));
      init = { method, cache: 'no-store' };
    } else {
      const body = new URLSearchParams();
      for (const [k, v] of cleanup) body.set(k, String(v));
      init = {
        method,
        cache: 'no-store',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      };
    }

    let response: Response;
    try {
      response = await fetch(url.toString(), { ...init, signal: AbortSignal.timeout(30_000) });
    } catch (err) {
      throw new PlatformError(
        `Could not reach Meta: ${(err as Error).message}`,
        'Check that the deployment can make outbound requests, then try again.',
      );
    }

    const text = await response.text();
    let json: unknown = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      if (!response.ok) {
        throw new PlatformError(`Meta returned HTTP ${response.status}`, text.slice(0, 200));
      }
      continue;
    }

    const body = json as GraphErrorBody & T;
    if (body && typeof body === 'object' && 'error' in body && body.error) {
      if (!versionFallback && version && looksLikeVersionProblem(response.status, body)) {
        // The pinned Graph version is not available — fall back to the app default.
        versionFallback = true;
        lastError = describe(body);
        continue;
      }
      throw describe(body);
    }
    if (!response.ok) {
      throw new PlatformError(`Meta returned HTTP ${response.status}`, text.slice(0, 200));
    }
    return body as T;
  }

  throw lastError ?? new PlatformError('Meta rejected the request');
}

function describe(body: GraphErrorBody): PlatformError {
  const e = body.error ?? {};
  const message = e.error_user_msg || e.message || 'Meta rejected the request';
  const code = e.code;
  let hint: string | undefined;
  switch (code) {
    case 190:
      hint = 'The access token has expired or been revoked. Reconnect the account in Settings.';
      break;
    case 200:
    case 10:
      hint = 'The app is missing a permission. Instagram needs instagram_content_publish and pages_manage_posts; Facebook needs pages_manage_posts.';
      break;
    case 4:
    case 17:
    case 32:
    case 613:
      hint = 'You have hit a Meta rate limit. Wait a few minutes and try again.';
      break;
    case 100:
      hint = 'Meta could not find that object — check the Page ID and Instagram account ID in Settings.';
      break;
    case 36003:
      hint = 'Instagram rejected the image size or aspect ratio. The desk posts 4:5 (1080×1350), which Instagram accepts.';
      break;
    case 9007:
    case 2207026:
      hint = 'Instagram could not download the image. It must be a public https URL — deploy the desk publicly or set PUBLIC_BASE_URL.';
      break;
    default:
      if (/permission/i.test(message)) {
        hint = 'Check the permissions granted to the app and reconnect in Settings.';
      }
      break;
  }
  if (e.error_subcode === 460) hint = 'This media was already posted to Instagram.';
  return new PlatformError(message, hint, code);
}

/* ── Identity helpers (also used by the connection tests) ─────────────────── */

export interface MetaPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string; username?: string } | null;
}

export async function listUserPages(userToken: string): Promise<MetaPage[]> {
  const data = await call<{ data?: MetaPage[] }>('/me/accounts', 'GET', {
    fields: 'id,name,access_token,instagram_business_account{id,username}',
    limit: 100,
    access_token: userToken,
  });
  return data.data ?? [];
}

export async function getPage(pageId: string, token: string): Promise<MetaPage> {
  return call<MetaPage>(`/${pageId}`, 'GET', {
    fields: 'id,name,access_token,instagram_business_account{id,username}',
    access_token: token,
  });
}

export async function getInstagramAccount(
  igId: string,
  token: string,
): Promise<{ id: string; username?: string; name?: string }> {
  return call(`/${igId}`, 'GET', { fields: 'id,username,name', access_token: token });
}

/**
 * Which Instagram Business account belongs to this Page. Meta has two fields
 * for it depending on how the account was linked, so both are tried.
 */
export async function findInstagramForPage(
  pageId: string,
  token: string,
): Promise<{ id: string; username: string | null } | null> {
  for (const field of ['instagram_business_account', 'connected_instagram_account']) {
    try {
      const res = await call<Record<string, { id?: string; username?: string } | undefined>>(
        `/${pageId}`,
        'GET',
        { fields: field, access_token: token },
      );
      const node = res?.[field];
      if (node?.id) return { id: node.id, username: node.username ?? null };
    } catch {
      /* try the next field */
    }
  }
  return null;
}

export async function getUser(userToken: string): Promise<{ id: string; name?: string }> {
  return call('/me', 'GET', { fields: 'id,name', access_token: userToken });
}

/* ── Publishing ───────────────────────────────────────────────────────────── */

export interface FacebookResult {
  id: string | null;
  url: string | null;
}

export async function publishFacebookPhoto(opts: {
  pageId: string;
  token: string;
  imageUrl: string;
  message: string;
}): Promise<FacebookResult> {
  const res = await call<{ id?: string; post_id?: string }>(`/${opts.pageId}/photos`, 'POST', {
    url: opts.imageUrl,
    caption: opts.message,
    access_token: opts.token,
    published: 'true',
  });
  const postId = res.post_id ?? res.id ?? null;
  return { id: postId, url: postId ? `https://www.facebook.com/${postId}` : null };
}

export async function publishFacebookText(opts: {
  pageId: string;
  token: string;
  message: string;
  link?: string;
}): Promise<FacebookResult> {
  const res = await call<{ id?: string }>(`/${opts.pageId}/feed`, 'POST', {
    message: opts.message,
    link: opts.link,
    access_token: opts.token,
  });
  const id = res.id ?? null;
  return { id, url: id ? `https://www.facebook.com/${id}` : null };
}

export interface InstagramResult {
  id: string | null;
  url: string | null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function publishInstagramImage(opts: {
  igUserId: string;
  token: string;
  imageUrl: string;
  caption: string;
  story?: boolean;
  /** How long Meta gets to fetch and process the image before we give up. */
  pollMs?: number;
}): Promise<InstagramResult> {
  const container = await call<{ id?: string }>(`/${opts.igUserId}/media`, 'POST', {
    image_url: opts.imageUrl,
    caption: opts.story ? undefined : opts.caption,
    media_type: opts.story ? 'STORIES' : undefined,
    access_token: opts.token,
  });
  const creationId = container.id;
  if (!creationId) throw new PlatformError('Instagram did not return a media container id');

  const deadline = Date.now() + (opts.pollMs ?? 25_000);
  let status = 'IN_PROGRESS';
  while (Date.now() < deadline) {
    await sleep(2_500);
    const check = await call<{ status_code?: string; status?: string }>(`/${creationId}`, 'GET', {
      fields: 'status_code,status',
      access_token: opts.token,
    });
    status = check.status_code ?? 'IN_PROGRESS';
    if (status === 'FINISHED') break;
    if (status === 'ERROR' || status === 'EXPIRED') {
      throw new PlatformError(
        `Instagram could not process the image (${status})${check.status ? `: ${check.status}` : ''}`,
        'Usually the image URL is not publicly reachable. Open the image link in a private browser window to check.',
      );
    }
  }

  try {
    const published = await call<{ id?: string }>(`/${opts.igUserId}/media_publish`, 'POST', {
      creation_id: creationId,
      access_token: opts.token,
    });
    const mediaId = published.id ?? null;
    return { id: mediaId, url: mediaId ? await instagramPermalink(mediaId, opts.token) : null };
  } catch (err) {
    if (err instanceof PlatformError && /not available|in progress|media id/i.test(err.message)) {
      throw new PlatformError(
        'Instagram is still processing the image. Give it a minute and press the button again.',
        'Nothing was posted — the half-finished upload is discarded automatically.',
      );
    }
    throw err;
  }
}

async function instagramPermalink(mediaId: string, token: string): Promise<string | null> {
  try {
    const res = await call<{ permalink?: string }>(`/${mediaId}`, 'GET', {
      fields: 'permalink',
      access_token: token,
    });
    return res.permalink ?? null;
  } catch {
    return null;
  }
}
