import 'server-only';
import { getPost, PILLARS, POSTS } from './postdata';
import { readState, storeInfo, updateState } from './store';
import { connectionSummary } from './connections';
import { planSchedule, sortEntries } from './schedule';
import { addDays, nowIn, today, weekKey, weekday } from './time';
import { MISSING_MEDIA } from './postdata';
import { PLATFORM_ORDER, type DeskView, type EntryView } from './view';
import type { DeskState, Platform, Post, ScheduleEntry } from './types';

/** How far ahead the planner is allowed to fill the calendar. */
const PLAN_DAYS = 420;
/** Entries the desk shows before it offers "show everything". */
const VISIBLE_ENTRIES = 24;

export function publishedIds(state: DeskState): Set<string> {
  return new Set(
    Object.entries(state.published)
      .filter(([, recs]) => recs && Object.keys(recs).length > 0)
      .map(([id]) => id),
  );
}

export function isFullyPosted(post: Post | undefined, state: DeskState): boolean {
  if (!post) return false;
  const recs = state.published[post.id] ?? {};
  const wanted = post.platforms.length ? post.platforms : PLATFORM_ORDER;
  return wanted.every((p) => Boolean(recs[p]));
}

export async function loadState(): Promise<DeskState> {
  const state = await readState();
  if (state.schedule.builtAt) return state;
  return (await ensurePlan()).state;
}

/** First run: lay out the calendar so the desk has something to post. */
export async function ensurePlan(): Promise<{ state: DeskState }> {
  return updateState((draft) => {
    if (draft.schedule.builtAt) return;
    const cfg = draft.schedule.config;
    draft.schedule.entries = planSchedule({
      posts: POSTS,
      config: cfg,
      unavailable: publishedIds(draft),
      from: today(cfg.timezone),
      days: PLAN_DAYS,
    });
    draft.schedule.builtAt = new Date().toISOString();
  });
}

export async function rebuildSchedule(fromToday = true): Promise<{ entries: number }> {
  const { state } = await updateState((draft) => {
    const cfg = draft.schedule.config;
    const keep = draft.schedule.entries.filter((e) =>
      Boolean(draft.published[e.id] && Object.keys(draft.published[e.id] ?? {}).length),
    );
    const keepIds = new Set(keep.map((e) => e.id));
    const fresh = planSchedule({
      posts: POSTS,
      config: cfg,
      unavailable: new Set([...publishedIds(draft), ...keepIds]),
      from: fromToday
        ? today(cfg.timezone)
        : (draft.schedule.entries[0]?.date ?? today(cfg.timezone)),
      days: PLAN_DAYS,
    });
    draft.schedule.entries = sortEntries([...keep, ...fresh]);
    draft.schedule.builtAt = new Date().toISOString();
  });
  return { entries: state.schedule.entries.length };
}

/* ── Queue moves ─────────────────────────────────────────────────────────── */

/** The first free slot the planner would have used for this post. */
export function nextSlot(
  state: DeskState,
  post: Post,
  fromDate?: string,
): { date: string; time: string } {
  const cfg = state.schedule.config;
  const start = fromDate ?? today(cfg.timezone);
  const perWeek = new Map<string, number>();
  for (const e of state.schedule.entries) {
    perWeek.set(weekKey(e.date), (perWeek.get(weekKey(e.date)) ?? 0) + 1);
  }
  const isReel = post.format === 'reel' || post.format === 'story';
  for (let i = 0; i < 120; i++) {
    const date = addDays(start, i);
    if (!cfg.days.includes(weekday(date))) continue;
    if (state.schedule.entries.some((e) => e.date === date)) continue;
    const wk = weekKey(date);
    if ((perWeek.get(wk) ?? 0) >= cfg.perWeek) continue;
    const day = weekday(date);
    const time = isReel && (day === 2 || day === 5) ? cfg.reelTime : cfg.time;
    return { date, time };
  }
  return { date: addDays(start, 1), time: cfg.time };
}

export async function queuePost(postId: string, date?: string): Promise<void> {
  await updateState((draft) => {
    const post = getPost(postId);
    if (!post) throw new Error('Unknown post');
    if (draft.schedule.entries.some((e) => e.id === postId)) return;
    const slot = date
      ? {
          date,
          time:
            post.format === 'reel' || post.format === 'story'
              ? draft.schedule.config.reelTime
              : draft.schedule.config.time,
        }
      : nextSlot(draft, post);
    draft.schedule.entries = sortEntries([...draft.schedule.entries, { id: postId, ...slot }]);
  });
}

export async function unqueuePost(postId: string): Promise<void> {
  await updateState((draft) => {
    draft.schedule.entries = draft.schedule.entries.filter((e) => e.id !== postId);
  });
}

export async function moveEntry(postId: string, date: string, time?: string): Promise<void> {
  await updateState((draft) => {
    draft.schedule.entries = sortEntries(
      draft.schedule.entries.map((e) =>
        e.id === postId ? { ...e, date, time: time ?? e.time } : e,
      ),
    );
  });
}

/** Replace the post in this slot with the next unused one, same pillar first. */
export async function swapEntry(postId: string): Promise<{ replacedWith: string | null }> {
  const { result } = await updateState((draft) => {
    const entry = draft.schedule.entries.find((e) => e.id === postId);
    if (!entry) return { replacedWith: null };
    const current = getPost(postId);
    const queued = new Set(draft.schedule.entries.map((e) => e.id));
    const done = publishedIds(draft);
    const usable = POSTS.filter((p) => !queued.has(p.id) && !done.has(p.id));
    const pick =
      usable.find((p) => p.pillar === current?.pillar && p.format === current?.format) ??
      usable.find((p) => p.pillar === current?.pillar) ??
      usable.find((p) => p.format === current?.format) ??
      usable[0];
    if (!pick) return { replacedWith: null };
    draft.schedule.entries = sortEntries([
      ...draft.schedule.entries.map((e) =>
        e.id === postId ? { id: pick.id, date: e.date, time: e.time } : e,
      ),
    ]);
    return { replacedWith: pick.id };
  });
  return result;
}

export async function setCaption(postId: string, platform: Platform, text: string): Promise<void> {
  await updateState((draft) => {
    const post = getPost(postId);
    if (!post) throw new Error('Unknown post');
    const current = { ...(draft.captions[postId] ?? {}) };
    if (!text.trim() || text.trim() === post.caption[platform].trim()) delete current[platform];
    else current[platform] = text.trim();
    if (Object.keys(current).length) draft.captions[postId] = current;
    else delete draft.captions[postId];
  });
}

/* ── The desk view ───────────────────────────────────────────────────────── */

export function entryView(state: DeskState, entry: ScheduleEntry): EntryView | null {
  const post = getPost(entry.id);
  if (!post) return null;
  const published = state.published[post.id] ?? {};
  const marks: EntryView['published'] = {};
  for (const platform of PLATFORM_ORDER) {
    const rec = published[platform];
    if (rec) marks[platform] = { at: rec.at, url: rec.url };
  }
  const now = `${today(state.schedule.config.timezone)}T${nowIn(state.schedule.config.timezone).time}`;
  return {
    id: post.id,
    hook: post.hook,
    pillar: post.pillar,
    pillarLabel: post.pillarLabel,
    format: post.format,
    platforms: post.platforms,
    image: post.media.feed,
    story: post.media.story,
    date: entry.date,
    time: entry.time,
    overdue: `${entry.date}T${entry.time}` < now,
    published: marks,
  };
}

export function buildDeskView(state: DeskState): DeskView {
  const cfg = state.schedule.config;
  const tz = cfg.timezone;
  const stamp = nowIn(tz);
  const entries = sortEntries(state.schedule.entries);

  const overdue: EntryView[] = [];
  const byDay = new Map<string, EntryView[]>();
  let upcomingShown = 0;
  let publishedToday = 0;
  let scheduledCount = 0;

  const future: EntryView[] = [];
  for (const entry of entries) {
    const view = entryView(state, entry);
    if (!view) continue;
    const post = getPost(entry.id);
    const done = isFullyPosted(post, state);
    if (entry.date < stamp.date) {
      if (done) continue; // history
      overdue.push(view);
      continue;
    }
    if (entry.date === stamp.date && done) publishedToday++;
    if (done) {
      // Posted today: keep it visible as confirmation, then let it go.
      if (entry.date === stamp.date) future.push(view);
      continue;
    }
    scheduledCount++;
    future.push(view);
  }

  for (const view of future) {
    if (upcomingShown >= VISIBLE_ENTRIES) break;
    const list = byDay.get(view.date) ?? [];
    list.push(view);
    byDay.set(view.date, list);
    upcomingShown++;
  }

  const groups = [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, list]) => ({ date, entries: list }));

  const queuedOn = new Map(entries.map((e) => [e.id, e.date] as const));
  const library = POSTS.map((p) => ({
    id: p.id,
    hook: p.hook,
    pillar: p.pillar,
    pillarLabel: p.pillarLabel,
    format: p.format,
    platforms: p.platforms,
    image: p.media.feed,
    queuedOn: queuedOn.get(p.id) ?? null,
    posted: PLATFORM_ORDER.filter((platform) => Boolean(state.published[p.id]?.[platform])),
  }));

  const connections = connectionSummary(state);
  const store = storeInfo();
  const notices: string[] = [];
  if (!store.persistent) {
    notices.push(
      'Nothing is saved yet: add a database in Vercel → Storage (Upstash Redis or Postgres) so connections, the schedule and the posted-log survive a restart.',
    );
  }
  if (MISSING_MEDIA.length) {
    notices.push(
      `${MISSING_MEDIA.length} rendered image${MISSING_MEDIA.length === 1 ? '' : 's'} missing from public/media — run ./build.sh and commit the result.`,
    );
  }
  if (statesWithPlan(state) === 0) {
    notices.push('The calendar is empty — rebuild the schedule in Settings.');
  }

  return {
    timezone: tz,
    today: stamp.date,
    nowTime: stamp.time,
    groups,
    overdue,
    scheduledCount,
    upcomingShown,
    publishedToday,
    library,
    totalPosts: POSTS.length,
    postedCount: publishedIds(state).size,
    connections,
    store,
    notices,
    schedule: {
      perWeek: cfg.perWeek,
      time: cfg.time,
      reelTime: cfg.reelTime,
      days: cfg.days,
      timezone: cfg.timezone,
      mix: cfg.mix,
      autoPublish: cfg.autoPublish,
    },
  };
}

function statesWithPlan(state: DeskState): number {
  return state.schedule.entries.length;
}

export { PILLARS };
