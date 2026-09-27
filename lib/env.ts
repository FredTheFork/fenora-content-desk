import 'server-only';

/**
 * Environment + deployment facts. Server-side only: this module reads secrets.
 */

export const env = {
  get deskPassword() {
    return process.env.DESK_PASSWORD?.trim() || '';
  },
  get deskSecret() {
    return process.env.DESK_SECRET?.trim() || '';
  },
  get cronSecret() {
    return process.env.CRON_SECRET?.trim() || '';
  },
  get publicBaseUrl() {
    return process.env.PUBLIC_BASE_URL?.trim().replace(/\/+$/, '') || '';
  },
  get metaAppId() {
    return process.env.META_APP_ID?.trim() || '';
  },
  get metaAppSecret() {
    return process.env.META_APP_SECRET?.trim() || '';
  },
  get graphVersion() {
    return process.env.META_GRAPH_VERSION?.trim() || 'v23.0';
  },
  get linkedInClientId() {
    return process.env.LINKEDIN_CLIENT_ID?.trim() || '';
  },
  get linkedInClientSecret() {
    return process.env.LINKEDIN_CLIENT_SECRET?.trim() || '';
  },
  get linkedInVersion() {
    return process.env.LINKEDIN_VERSION?.trim() || '202601';
  },
  /** Credentials handed in through Vercel env vars instead of the Settings page. */
  get presetMeta() {
    const pageId = process.env.META_PAGE_ID?.trim();
    const pageToken = process.env.META_PAGE_TOKEN?.trim();
    const igUserId = process.env.IG_USER_ID?.trim();
    if (!pageToken || (!pageId && !igUserId)) return null;
    return { pageId, pageToken, igUserId };
  },
  get presetLinkedIn() {
    const token = process.env.LINKEDIN_ACCESS_TOKEN?.trim();
    if (!token) return null;
    return { token, orgUrn: process.env.LINKEDIN_ORG_URN?.trim() || '' };
  },
  get isProduction() {
    return process.env.NODE_ENV === 'production';
  },
  get allowPublicDesk() {
    return process.env.ALLOW_PUBLIC_DESK === '1';
  },
  get onVercel() {
    return Boolean(process.env.VERCEL);
  },
};

/**
 * The public origin image URLs are built from. Instagram and Facebook fetch the
 * rendered card from here, so it has to be a real, publicly reachable https origin.
 */
export function baseUrl(requestUrl?: string): string {
  if (env.publicBaseUrl) return env.publicBaseUrl;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (requestUrl) {
    try {
      const u = new URL(requestUrl);
      if (u.protocol === 'https:') return u.origin;
    } catch {
      /* ignore */
    }
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export function isPubliclyReachable(url: string): boolean {
  if (!url.startsWith('https://')) return false;
  try {
    const host = new URL(url).hostname;
    return (
      !['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(host) && !host.endsWith('.local')
    );
  } catch {
    return false;
  }
}

export function mediaUrl(file: string, requestUrl?: string): string {
  return `${baseUrl(requestUrl)}/media/${file}`;
}

/** What the Setup screens are allowed to reveal — booleans, never values. */
export function envPresence() {
  const has = (v: string | undefined) => Boolean(v && v.trim());
  return {
    deskPassword: Boolean(env.deskPassword),
    deskSecret: Boolean(env.deskSecret),
    publicBaseUrl: Boolean(env.publicBaseUrl),
    metaApp: Boolean(env.metaAppId && env.metaAppSecret),
    metaPreset: Boolean(env.presetMeta),
    linkedinApp: Boolean(env.linkedInClientId && env.linkedInClientSecret),
    linkedinPreset: Boolean(env.presetLinkedIn),
    cronSecret: Boolean(env.cronSecret),
  };
}
