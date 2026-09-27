import type { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api';
import { env } from '@/lib/env';
import { isFullyPosted } from '@/lib/desk';
import { publishPost } from '@/lib/publish';
import { getPost } from '@/lib/postdata';
import { readState } from '@/lib/store';
import { addDays, nowIn } from '@/lib/time';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/** Never flood: at most this many posts in a single cron run. */
const MAX_PER_RUN = 2;
/** Stop starting new posts after this long, so a slow run is never cut off mid-publish. */
const TIME_BUDGET_MS = 40_000;
/** Ignore anything older than this — if the desk was offline, skip rather than spam. */
const CATCH_UP_DAYS = 3;

/**
 * Vercel Cron calls this. It publishes whatever has come due, and nothing else:
 * auto-publishing is opt-in per desk, every platform is idempotent, and a post
 * that has already gone out is never sent twice.
 */
export async function GET(req: NextRequest) {
  const secret = env.cronSecret;
  if (!secret) {
    return fail(
      'CRON_SECRET is not set, so the cron endpoint stays shut.',
      503,
      { hint: 'Add CRON_SECRET in Vercel → Settings → Environment Variables to enable auto-publishing.' },
    );
  }

  const header = req.headers.get('authorization') ?? '';
  const key = new URL(req.url).searchParams.get('key') ?? '';
  if (header !== `Bearer ${secret}` && key !== secret) return fail('Not authorised.', 401);

  const state = await readState();
  if (!state.schedule.config.autoPublish) {
    return ok({ skipped: 'Auto-publishing is switched off in Settings.' });
  }

  const tz = state.schedule.config.timezone;
  const now = nowIn(tz);
  const earliest = addDays(now.date, -CATCH_UP_DAYS);
  const due = state.schedule.entries
    .filter((e) => `${e.date}T${e.time}` <= `${now.date}T${now.time}` && e.date >= earliest)
    .sort((a, b) => (`${a.date} ${a.time}` < `${b.date} ${b.time}` ? -1 : 1))
    .slice(0, MAX_PER_RUN);

  const results: { postId: string; outcomes: unknown[] }[] = [];
  const started = Date.now();
  for (const entry of due) {
    if (Date.now() - started > TIME_BUDGET_MS) break;
    const fresh = await readState();
    const post = getPost(entry.id);
    if (!post || isFullyPosted(post, fresh)) continue;
    const report = await publishPost({ postId: entry.id, platforms: post.platforms, requestUrl: req.url });
    results.push({ postId: entry.id, outcomes: report.outcomes });
  }

  return ok({
    ranAt: new Date().toISOString(),
    timezone: tz,
    published: results.length,
    results,
  });
}
