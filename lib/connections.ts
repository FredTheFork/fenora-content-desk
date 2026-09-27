import 'server-only';
import { env } from './env';
import { open, seal } from './crypto';
import {
  getInstagramAccount,
  getPage,
  getUser,
  listUserPages,
  PlatformError,
  type MetaPage,
} from './meta';
import { getUserInfo, listOrganizations } from './linkedin';
import type { DeskState, LinkedInConnection, MetaConnection } from './types';

/**
 * Everything that knows where the credentials live: the Settings page (stored,
 * encrypted), or the Vercel environment (for a headless setup). The UI only
 * ever sees labels and ids — never a token.
 */

export interface CredentialsProblem {
  ok: false;
  reason: string;
  hint?: string;
}

export interface MetaCredentials {
  ok: true;
  pageId: string;
  pageToken: string;
  pageName: string | null;
  igUserId: string | null;
  igUsername: string | null;
  source: 'settings' | 'environment';
}

export interface LinkedInCredentials {
  ok: true;
  token: string;
  authorUrn: string;
  authorLabel: string;
  authorKind: 'organization' | 'person';
  source: 'settings' | 'environment';
}

function readMeta(raw: string | undefined): {
  value: MetaConnection | null;
  problem: string | null;
} {
  if (!raw) return { value: null, problem: null };
  const result = open<MetaConnection>(raw);
  if (!result.ok) return { value: null, problem: result.reason };
  return { value: result.value, problem: null };
}

function readLinkedIn(raw: string | undefined): {
  value: LinkedInConnection | null;
  problem: string | null;
} {
  if (!raw) return { value: null, problem: null };
  const result = open<LinkedInConnection>(raw);
  if (!result.ok) return { value: null, problem: result.reason };
  return { value: result.value, problem: null };
}

export const sealMeta = (value: MetaConnection) => seal(value);
export const sealLinkedIn = (value: LinkedInConnection) => seal(value);

export function metaCredentials(state: DeskState): MetaCredentials | CredentialsProblem {
  const { value, problem } = readMeta(state.connections.meta);
  if (value) {
    const page = value.pages.find((p) => p.id === value.selectedPageId) ?? value.pages[0];
    if (page?.token) {
      return {
        ok: true,
        pageId: page.id,
        pageToken: page.token,
        pageName: page.name || null,
        igUserId: page.ig?.id ?? null,
        igUsername: page.ig?.username ?? null,
        source: 'settings',
      };
    }
  }

  const preset = env.presetMeta;
  if (preset) {
    return {
      ok: true,
      pageId: preset.pageId ?? '',
      pageToken: preset.pageToken,
      pageName: null,
      igUserId: preset.igUserId ?? null,
      igUsername: null,
      source: 'environment',
    };
  }

  if (problem) {
    return {
      ok: false,
      reason: problem,
      hint: 'Reconnect Facebook in Settings to store the credentials again.',
    };
  }
  return {
    ok: false,
    reason: 'Facebook is not connected yet.',
    hint: 'Open Settings → Connections and connect the Page.',
  };
}

export function linkedInCredentials(state: DeskState): LinkedInCredentials | CredentialsProblem {
  const { value, problem } = readLinkedIn(state.connections.linkedin);
  if (value?.token) {
    const isOrg = value.author === 'organization' && Boolean(value.selectedOrgUrn);
    const org = value.orgs.find((o) => o.urn === value.selectedOrgUrn);
    return {
      ok: true,
      token: value.token,
      authorUrn: isOrg ? value.selectedOrgUrn : (value.person?.urn ?? value.selectedOrgUrn),
      authorLabel: isOrg
        ? (org?.name ?? value.selectedOrgUrn.split(':').pop() ?? 'LinkedIn Page')
        : (value.person?.name ?? 'your profile'),
      authorKind: isOrg ? 'organization' : 'person',
      source: 'settings',
    };
  }

  const preset = env.presetLinkedIn;
  if (preset) {
    const isOrg = Boolean(preset.orgUrn);
    return {
      ok: true,
      token: preset.token,
      authorUrn: isOrg ? preset.orgUrn : '',
      authorLabel: isOrg ? preset.orgUrn : 'your profile',
      authorKind: isOrg ? 'organization' : 'person',
      source: 'environment',
    };
  }

  if (problem) {
    return {
      ok: false,
      reason: problem,
      hint: 'Reconnect LinkedIn in Settings to store the credentials again.',
    };
  }
  return {
    ok: false,
    reason: 'LinkedIn is not connected yet.',
    hint: 'Open Settings → Connections and connect LinkedIn.',
  };
}

/* ── What the UI is allowed to know ──────────────────────────────────────── */

export interface ConnectionSummary {
  facebook: {
    connected: boolean;
    source: 'settings' | 'environment' | null;
    pageId: string | null;
    pageName: string | null;
    pages: { id: string; name: string }[];
  };
  instagram: { connected: boolean; igUserId: string | null; username: string | null };
  linkedin: {
    connected: boolean;
    source: 'settings' | 'environment' | null;
    author: 'organization' | 'person';
    authorName: string | null;
    orgs: { urn: string; name: string | null }[];
    selectedOrgUrn: string;
    personName: string | null;
    hasPerson: boolean;
  };
  problems: string[];
}

export function connectionSummary(state: DeskState): ConnectionSummary {
  const problems: string[] = [];
  const metaRaw = readMeta(state.connections.meta);
  const liRaw = readLinkedIn(state.connections.linkedin);
  if (metaRaw.problem) problems.push(metaRaw.problem);
  if (liRaw.problem) problems.push(liRaw.problem);

  const meta = metaRaw.value;
  const page = meta?.pages.find((p) => p.id === meta.selectedPageId) ?? meta?.pages[0] ?? null;
  const envMeta = env.presetMeta;

  const li = liRaw.value;
  const envLi = env.presetLinkedIn;

  const fbConnected = Boolean(page?.token) || Boolean(envMeta);
  const igConnected = fbConnected ? Boolean(page?.ig?.id ?? envMeta?.igUserId) : false;

  return {
    facebook: {
      connected: fbConnected,
      source: page?.token ? 'settings' : envMeta ? 'environment' : null,
      pageId: page?.id ?? envMeta?.pageId ?? null,
      pageName: page?.name ?? null,
      pages: (meta?.pages ?? []).map((p) => ({ id: p.id, name: p.name })),
    },
    instagram: {
      connected: igConnected,
      igUserId: page?.ig?.id ?? envMeta?.igUserId ?? null,
      username: page?.ig?.username ?? null,
    },
    linkedin: {
      connected: Boolean(li?.token || envLi),
      source: li?.token ? 'settings' : envLi ? 'environment' : null,
      author:
        li?.author === 'organization'
          ? 'organization'
          : li?.token
            ? 'person'
            : envLi?.orgUrn
              ? 'organization'
              : 'person',
      authorName:
        li?.author === 'organization'
          ? (li.orgs.find((o) => o.urn === li.selectedOrgUrn)?.name ?? li.selectedOrgUrn)
          : (li?.person?.name ?? null),
      orgs: li?.orgs ?? [],
      selectedOrgUrn: li?.selectedOrgUrn ?? '',
      personName: li?.person?.name ?? null,
      hasPerson: Boolean(li?.person?.urn),
    },
    problems,
  };
}

/* ── Connection tests (the "Test" buttons in Settings) ───────────────────── */

export interface TestResult {
  provider: 'facebook' | 'instagram' | 'linkedin';
  ok: boolean;
  detail: string;
}

export async function testConnections(state: DeskState): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const meta = metaCredentials(state);
  const li = linkedInCredentials(state);

  if (meta.ok) {
    try {
      const page = await getPage(meta.pageId || 'me', meta.pageToken);
      results.push({
        provider: 'facebook',
        ok: true,
        detail: `Page “${page.name}” is reachable (id ${page.id}).`,
      });
    } catch (err) {
      results.push({ provider: 'facebook', ok: false, detail: explain(err) });
    }

    if (meta.igUserId) {
      try {
        const ig = await getInstagramAccount(meta.igUserId, meta.pageToken || meta.pageToken);
        results.push({
          provider: 'instagram',
          ok: true,
          detail: `Instagram @${ig.username ?? ig.id} is linked and ready to publish.`,
        });
      } catch (err) {
        results.push({ provider: 'instagram', ok: false, detail: explain(err) });
      }
    } else {
      results.push({
        provider: 'instagram',
        ok: false,
        detail:
          'No Instagram Business account is linked to that Facebook Page. Instagram → Page → Linked accounts → connect Instagram.',
      });
    }
  } else {
    results.push({ provider: 'facebook', ok: false, detail: meta.reason });
    results.push({ provider: 'instagram', ok: false, detail: 'Connect Facebook first.' });
  }

  if (li.ok) {
    try {
      if (li.authorKind === 'organization' && li.authorUrn) {
        const orgs = await listOrganizations(li.token);
        const match = orgs.find((o) => o.urn === li.authorUrn);
        results.push({
          provider: 'linkedin',
          ok: true,
          detail: match
            ? `LinkedIn Page “${match.name ?? match.urn}” is ready to publish.`
            : 'LinkedIn token works, but that Page was not in the list this token can administer.',
        });
      } else {
        const me = await getUserInfo(li.token);
        results.push({
          provider: 'linkedin',
          ok: true,
          detail: `LinkedIn token works — will post as ${me.name ?? me.sub}.`,
        });
      }
    } catch (err) {
      results.push({ provider: 'linkedin', ok: false, detail: explain(err) });
    }
  } else {
    results.push({ provider: 'linkedin', ok: false, detail: li.reason });
  }

  return results;
}

function explain(err: unknown): string {
  if (err instanceof PlatformError) {
    return err.hint ? `${err.message} — ${err.hint}` : err.message;
  }
  return (err as Error)?.message ?? 'Unknown error';
}

/** Used by the OAuth callback to store what Meta handed back. */
export async function fetchMetaBundle(
  userToken: string,
): Promise<{ pages: MetaPage[]; accountName: string | null }> {
  const [pages, me] = await Promise.all([
    listUserPages(userToken),
    getUser(userToken).catch(() => null),
  ]);
  return { pages, accountName: me?.name ?? null };
}
