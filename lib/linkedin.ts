import 'server-only';
import { env } from './env';
import { PlatformError } from './meta';

/**
 * LinkedIn REST client. A post with an image is three calls: register the
 * upload, PUT the bytes, then create the post referencing the image URN.
 */

/** Overridable so tools/selftest.mjs can point the client at a mock LinkedIn API. */
function API_BASE(): string {
  return (process.env.LINKEDIN_API_BASE || 'https://api.linkedin.com').replace(/\/+$/, '');
}

function headers(token: string, extra: Record<string, string> = {}): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'LinkedIn-Version': env.linkedInVersion,
    'X-Restli-Protocol-Version': '2.0.0',
    ...extra,
  };
}

async function li<T>(
  path: string,
  opts: { method?: string; token: string; body?: unknown; raw?: BodyInit; contentType?: string },
): Promise<{ data: T | null; response: Response; text: string }> {
  const url = path.startsWith('http') ? path : `${API_BASE()}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: opts.method ?? (opts.body || opts.raw ? 'POST' : 'GET'),
      headers: headers(
        opts.token,
        opts.contentType
          ? { 'Content-Type': opts.contentType }
          : {
              'Content-Type': 'application/json',
            },
      ),
      body: opts.raw ?? (opts.body ? JSON.stringify(opts.body) : undefined),
      cache: 'no-store',
      signal: AbortSignal.timeout(45_000),
    });
  } catch (err) {
    throw new PlatformError(
      `Could not reach LinkedIn: ${(err as Error).message}`,
      'Check the deployment can make outbound requests, then try again.',
    );
  }

  const text = await response.text();
  let data: T | null = null;
  try {
    data = text ? (JSON.parse(text) as T) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const body = data as { message?: string; status?: number; serviceErrorCode?: number } | null;
    const message = body?.message || text.slice(0, 300) || `HTTP ${response.status}`;
    throw new PlatformError(
      message,
      linkedInHint(response.status, message, body?.status),
      body?.status,
    );
  }
  return { data, response, text };
}

function linkedInHint(status: number, message: string, code?: number): string | undefined {
  if (status === 401 || code === 401) {
    return 'The LinkedIn token has expired. Reconnect LinkedIn in Settings.';
  }
  if (status === 403 || code === 403) {
    return 'The token is missing a permission. LinkedIn needs w_organization_social (to post as the Page) or w_member_social (to post as you).';
  }
  if (status === 426) {
    return 'LinkedIn has retired the API version this desk is asking for. Set LINKEDIN_VERSION in Vercel to one it names, then redeploy.';
  }
  if (status === 429) return 'LinkedIn rate limit reached. Wait a few minutes and try again.';
  if (status === 400 && /owner|author/i.test(message)) {
    return 'The account this post is going out as is not recognised — reconnect LinkedIn in Settings and pick the Page again.';
  }
  return undefined;
}

/** True when the failure was the network, not LinkedIn's answer. */
export function isUnreachable(err: unknown): boolean {
  return err instanceof PlatformError && /Could not reach/i.test(err.message);
}

/* ── Identity ─────────────────────────────────────────────────────────────── */

export async function getUserInfo(
  token: string,
): Promise<{ sub: string; name?: string; email?: string }> {
  const { data } = await li<{ sub: string; name?: string; email?: string }>('/v2/userinfo', {
    token,
  });
  if (!data?.sub)
    throw new PlatformError('LinkedIn did not return a member id', linkedInHint(401, ''));
  return data;
}

export async function listOrganizations(
  token: string,
): Promise<{ urn: string; name: string | null }[]> {
  const urns: string[] = [];
  try {
    const { data } = await li<{ elements?: { organization?: string }[] }>(
      '/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&count=50',
      { token },
    );
    for (const el of data?.elements ?? []) {
      if (el.organization) urns.push(el.organization);
    }
  } catch (err) {
    // A network failure is not the same as "this token has no Pages" — say so.
    if (isUnreachable(err)) throw err;
    // Otherwise fall back to the older endpoint; some tokens only expose this one.
    try {
      const { data } = await li<{ elements?: { organizationalTarget?: string }[] }>(
        '/v2/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR&count=50',
        { token },
      );
      for (const el of data?.elements ?? []) {
        if (el.organizationalTarget) urns.push(el.organizationalTarget);
      }
    } catch (inner) {
      if (isUnreachable(inner)) throw inner;
      return [];
    }
  }

  const ids = urns.map((u) => u.split(':').pop() ?? '').filter(Boolean);
  if (!ids.length) return [];

  let names = new Map<string, string>();
  try {
    const { data } = await li<{ elements?: { id?: string; localizedName?: string }[] }>(
      `/rest/organizations?ids=List(${ids.join(',')})`,
      { token },
    );
    for (const el of data?.elements ?? []) {
      if (el.id && el.localizedName) names.set(el.id, el.localizedName);
    }
  } catch {
    names = new Map();
  }

  return urns.map((urn) => {
    const id = urn.split(':').pop() ?? '';
    return { urn, name: names.get(id) ?? null };
  });
}

/* ── Publishing ───────────────────────────────────────────────────────────── */

export async function uploadImage(
  token: string,
  ownerUrn: string,
  bytes: Uint8Array,
): Promise<string> {
  const { data } = await li<{ value?: { uploadUrl?: string; image?: string } }>(
    '/rest/images?action=initializeUpload',
    { token, body: { initializeUploadRequest: { owner: ownerUrn } } },
  );
  const uploadUrl = data?.value?.uploadUrl;
  const imageUrn = data?.value?.image;
  if (!uploadUrl || !imageUrn) {
    throw new PlatformError('LinkedIn would not open an image upload for this account');
  }
  await li(uploadUrl, {
    method: 'PUT',
    token,
    raw: Buffer.from(bytes),
    contentType: 'application/octet-stream',
  });
  return imageUrn;
}

export interface LinkedInPostResult {
  id: string | null;
  url: string | null;
}

export async function createPost(opts: {
  token: string;
  authorUrn: string;
  commentary: string;
  imageUrn?: string | null;
  imageAltText?: string;
}): Promise<LinkedInPostResult> {
  const { response, text } = await li<unknown>('/rest/posts', {
    token: opts.token,
    method: 'POST',
    body: {
      author: opts.authorUrn,
      commentary: opts.commentary,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      ...(opts.imageUrn
        ? {
            content: {
              media: { title: opts.imageAltText?.slice(0, 200) || undefined, id: opts.imageUrn },
            },
          }
        : {}),
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    },
  });

  const urn =
    response.headers.get('x-restli-id') ?? text.match(/"id"\s*:\s*"([^"]+)"/)?.[1] ?? null;

  return {
    id: urn,
    url: urn
      ? `https://www.linkedin.com/feed/update/${encodeURIComponent(urn)}/`
      : 'https://www.linkedin.com/feed/',
  };
}
