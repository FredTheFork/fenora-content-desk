import type { NextRequest } from 'next/server';
import { fail, guard, ok, readJson, str } from '@/lib/api';
import { open as openSealed } from '@/lib/crypto';
import { sealLinkedIn, sealMeta } from '@/lib/connections';
import {
  findInstagramForPage,
  getPage,
  listUserPages,
  PlatformError,
  type MetaPage,
} from '@/lib/meta';
import { getUserInfo, isUnreachable, listOrganizations } from '@/lib/linkedin';
import { updateState } from '@/lib/store';
import { isValidTimeZone } from '@/lib/time';
import type { LinkedInConnection, MetaConnection, ScheduleConfig } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface Body {
  action?: string;
  postId?: string;
  // schedule
  config?: Partial<ScheduleConfig>;
  // connections
  provider?: string;
  pageId?: string;
  pageToken?: string;
  igUserId?: string;
  token?: string;
  orgUrn?: string;
  author?: string;
}

export async function POST(req: NextRequest) {
  const blocked = await guard();
  if (blocked) return blocked;

  const body = await readJson<Body>(req);
  const action = str(body.action, 32);

  try {
    switch (action) {
      case 'schedule':
        return await saveSchedule(body.config ?? {});
      case 'select-page':
        return await selectPage(str(body.pageId, 64));
      case 'select-linkedin':
        return await selectLinkedInAuthor(
          str(body.author, 20) === 'organization' ? 'organization' : 'person',
          str(body.orgUrn, 200),
        );
      case 'manual-meta':
        return await manualMeta(
          str(body.pageId, 64),
          str(body.pageToken, 500),
          str(body.igUserId, 64),
        );
      case 'manual-linkedin':
        return await manualLinkedIn(str(body.token, 2000), str(body.orgUrn, 200));
      case 'disconnect':
        return await disconnect(str(body.provider, 20));
      default:
        return fail(`Unknown action: ${action || '(none)'}`);
    }
  } catch (err) {
    console.error('[api/settings]', action, err);
    const hint = err instanceof PlatformError ? err.hint : undefined;
    return fail((err as Error)?.message ?? 'Something went wrong', 400, hint ? { hint } : {});
  }
}

async function saveSchedule(patch: Partial<ScheduleConfig>) {
  const { state } = await updateState((draft) => {
    const cfg = draft.schedule.config;
    if (typeof patch.perWeek === 'number')
      cfg.perWeek = Math.min(7, Math.max(1, Math.round(patch.perWeek)));
    if (Array.isArray(patch.days) && patch.days.length) {
      const days = [...new Set(patch.days.map(Number).filter((d) => d >= 0 && d <= 6))].sort();
      if (days.length) cfg.days = days;
    }
    if (typeof patch.time === 'string' && /^\d{2}:\d{2}$/.test(patch.time)) cfg.time = patch.time;
    if (typeof patch.reelTime === 'string' && /^\d{2}:\d{2}$/.test(patch.reelTime))
      cfg.reelTime = patch.reelTime;
    if (typeof patch.autoPublish === 'boolean') cfg.autoPublish = patch.autoPublish;
    if (typeof patch.timezone === 'string' && isValidTimeZone(patch.timezone))
      cfg.timezone = patch.timezone;
    if (patch.mix && typeof patch.mix === 'object') {
      for (const [key, value] of Object.entries(patch.mix)) {
        const weight = Number(value);
        if (Number.isFinite(weight)) cfg.mix[key] = Math.min(10, Math.max(0, Math.round(weight)));
      }
    }
  });
  return ok({ message: 'Settings saved', config: state.schedule.config });
}

async function selectPage(pageId: string) {
  if (!pageId) return fail('Pick a Page.');
  const { result } = await updateState((draft) => {
    const raw = draft.connections.meta;
    if (!raw) throw new Error('Facebook is not connected yet.');
    const meta = JSON.parse(JSON.stringify(openMeta(raw))) as MetaConnection;
    if (!meta.pages.some((p) => p.id === pageId))
      throw new Error('That Page is not in your connection.');
    meta.selectedPageId = pageId;
    draft.connections.meta = sealMeta(meta);
    return meta;
  });
  const page = result.pages.find((p) => p.id === pageId);
  return ok({
    message: `Now posting to ${page?.name ?? pageId}`,
    instagram: page?.ig?.username ?? null,
  });
}

async function selectLinkedInAuthor(author: 'organization' | 'person', orgUrn: string) {
  const { result } = await updateState((draft) => {
    const raw = draft.connections.linkedin;
    if (!raw) throw new Error('LinkedIn is not connected yet.');
    const li = JSON.parse(JSON.stringify(openLinkedIn(raw))) as LinkedInConnection;
    if (author === 'organization') {
      const urn = orgUrn || li.selectedOrgUrn;
      if (!urn) throw new Error('No LinkedIn Page is available for this account.');
      li.author = 'organization';
      li.selectedOrgUrn = urn;
    } else {
      if (!li.person?.urn) {
        throw new Error('This LinkedIn connection has no personal profile attached.');
      }
      li.author = 'person';
    }
    draft.connections.linkedin = sealLinkedIn(li);
    return li;
  });
  return ok({
    message:
      result.author === 'organization'
        ? `Now posting as ${result.orgs.find((o) => o.urn === result.selectedOrgUrn)?.name ?? 'the Page'}`
        : `Now posting as ${result.person?.name ?? 'your profile'}`,
  });
}

async function manualMeta(pageId: string, token: string, igUserId: string) {
  if (!token) return fail('Paste a Page or user access token.');

  let page: MetaPage | null = null;
  let userToken: string | null = null;

  if (pageId) {
    try {
      page = await getPage(pageId, token);
    } catch {
      /* maybe it is a user token for another Page — try the Page list below */
    }
  }
  if (!page) {
    const pages = await listUserPages(token);
    userToken = token;
    page = pages.find((p) => p.id === pageId) ?? pages[0] ?? null;
  }
  if (!page) {
    return fail('That token does not give access to any Facebook Page.', undefined, {
      hint: 'Generate a token with pages_show_list, pages_manage_posts and instagram_content_publish.',
    });
  }

  const pageToken = page.access_token || token;
  const ig = page.instagram_business_account?.id
    ? {
        id: page.instagram_business_account.id,
        username: page.instagram_business_account.username ?? null,
      }
    : igUserId
      ? { id: igUserId, username: null }
      : await findInstagramForPage(page.id, pageToken);

  const connection: MetaConnection = {
    userToken: userToken ?? undefined,
    expiresAt: null,
    pages: [{ id: page.id, name: page.name, token: pageToken, ig }],
    selectedPageId: page.id,
    connectedAt: new Date().toISOString(),
    source: 'manual',
    accountName: page.name,
  };

  await updateState((draft) => {
    draft.connections.meta = sealMeta(connection);
  });

  return ok({
    message: `Connected ${page.name}${ig ? ` · Instagram @${ig.username ?? ig.id}` : ' · no Instagram account linked'}`,
    instagram: ig?.username ?? null,
  });
}

async function manualLinkedIn(token: string, orgUrn: string) {
  if (!token) return fail('Paste a LinkedIn access token.');

  let firstError: unknown = null;
  const person = await getUserInfo(token)
    .then((me) => ({ urn: `urn:li:person:${me.sub}`, name: me.name ?? null }))
    .catch((err) => {
      firstError = err;
      return null;
    });
  const orgs = await listOrganizations(token).catch((err) => {
    firstError = firstError ?? err;
    return [];
  });

  if (!person && !orgs.length && !orgUrn) {
    if (isUnreachable(firstError)) throw firstError;
    return fail(
      'LinkedIn rejected that token, and it does not name a Page to post as.',
      undefined,
      { hint: 'Check the token is current and carries w_member_social or w_organization_social.' },
    );
  }

  const connection: LinkedInConnection = {
    token,
    expiresAt: null,
    person,
    orgs,
    author: orgs.length || orgUrn ? 'organization' : 'person',
    selectedOrgUrn: orgUrn || orgs[0]?.urn || '',
    connectedAt: new Date().toISOString(),
    source: 'manual',
    accountName: person?.name ?? orgs[0]?.name ?? null,
  };

  await updateState((draft) => {
    draft.connections.linkedin = sealLinkedIn(connection);
  });

  return ok({
    message: `Connected LinkedIn${connection.author === 'organization' ? ` as ${orgs[0]?.name ?? connection.selectedOrgUrn}` : person?.name ? ` as ${person.name}` : ''}`,
  });
}

async function disconnect(provider: string) {
  if (provider !== 'meta' && provider !== 'linkedin') return fail('Unknown provider.');
  await updateState((draft) => {
    if (provider === 'meta') delete draft.connections.meta;
    else delete draft.connections.linkedin;
  });
  return ok({
    message: provider === 'meta' ? 'Facebook and Instagram disconnected' : 'LinkedIn disconnected',
  });
}

/* The sealed blobs are opened in connections.ts; these mirror it for writes. */

function openMeta(raw: string): MetaConnection {
  const result = openSealed<MetaConnection>(raw);
  if (!result.ok || !result.value) {
    throw new Error(result.ok ? 'Facebook is not connected yet.' : result.reason);
  }
  return result.value;
}

function openLinkedIn(raw: string): LinkedInConnection {
  const result = openSealed<LinkedInConnection>(raw);
  if (!result.ok || !result.value) {
    throw new Error(result.ok ? 'LinkedIn is not connected yet.' : result.reason);
  }
  return result.value;
}
