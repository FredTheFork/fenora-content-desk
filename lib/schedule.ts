import type { Post, ScheduleConfig, ScheduleEntry } from './types';
import { addDays, weekKey, weekday } from './time';

/**
 * The planner. Spreads the library across the calendar the way the strategy
 * asks for it: weekdays only, a reel on Tuesday and Friday evenings, the
 * LinkedIn long-form on Wednesday, and every pillar weighted by its mix share
 * so no theme dominates a fortnight.
 *
 * Deterministic on purpose — the same library and settings always produce the
 * same plan, so rebuilding is safe and reviewable.
 */

export interface PlanOptions {
  posts: Post[];
  config: ScheduleConfig;
  /** Post ids already queued or published — never double-booked. */
  unavailable: Set<string>;
  /** First day that can carry a post (YYYY-MM-DD). */
  from: string;
  days: number;
  /** Ignore the per-week cap for these days (used when filling one gap). */
  ignoreCap?: boolean;
}

export function planSchedule({ posts, config, unavailable, from, days }: PlanOptions): ScheduleEntry[] {
  const pool = posts.filter((p) => !unavailable.has(p.id));
  if (!pool.length) return [];

  const weights = Object.entries(config.mix).filter(([, w]) => w > 0);
  const totalWeight = weights.reduce((sum, [, w]) => sum + w, 0) || 1;
  const byPillar = new Map<string, Post[]>();
  for (const p of pool) {
    const list = byPillar.get(p.pillar) ?? [];
    list.push(p);
    byPillar.set(p.pillar, list);
  }
  for (const list of byPillar.values()) {
    list.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
  }

  const taken = new Set<string>();
  const perWeek = Math.max(1, Math.min(7, config.perWeek || 5));
  const countPerWeek = new Map<string, number>();
  const placedPerPillar = new Map<string, number>();
  const lastUsedAt = new Map<string, number>();
  const entries: ScheduleEntry[] = [];
  let placed = 0;

  const hasFormat = (pillar: string, formats: string[]) =>
    (byPillar.get(pillar) ?? []).some((p) => !taken.has(p.id) && formats.includes(p.format));

  const take = (pillar: string, formats: string[] | null): Post | null => {
    const list = byPillar.get(pillar) ?? [];
    const pick = list.find(
      (p) => !taken.has(p.id) && (!formats || formats.includes(p.format)),
    );
    return pick ?? null;
  };

  for (let i = 0; i < days; i++) {
    const date = addDays(from, i);
    if (!config.days.includes(weekday(date))) continue;
    const wk = weekKey(date);
    if ((countPerWeek.get(wk) ?? 0) >= perWeek) continue;

    // Which pillar is furthest behind its target share this week?
    let wanted: string | null = null;
    let best = -Infinity;
    for (const [pillar, weight] of weights) {
      const target = (weight / totalWeight) * perWeek;
      const used = countPerWeek.get(`${pillar}:${wk}`) ?? 0;
      const deficit = target - used;
      const last = lastUsedAt.get(pillar);
      const fairness = last === undefined ? 2 : ((placed - last) / Math.max(pool.length, 1)) * 2;
      const score = deficit + fairness;
      if (score > best) {
        best = score;
        wanted = pillar;
      }
    }

    const isReelDay = config.days.includes(2) && weekday(date) === 2;
    const isFriday = config.days.includes(5) && weekday(date) === 5;
    const isWednesday = config.days.includes(3) && weekday(date) === 3;

    let pick: Post | null = null;
    if ((isReelDay || isFriday) && wanted && hasFormat(wanted, ['reel', 'story'])) {
      pick = take(wanted, ['reel', 'story']);
    } else if (isWednesday && wanted && hasFormat(wanted, ['text'])) {
      pick = take(wanted, ['text']);
    }
    if (!pick && wanted) pick = take(wanted, null);
    if (!pick) {
      // The wanted pillar is exhausted — fall back to whichever pillar still has stock.
      for (const [pillar] of weights) {
        pick = take(pillar, null);
        if (pick) break;
      }
    }
    if (!pick) break;

    taken.add(pick.id);
    const isReel = pick.format === 'reel' || pick.format === 'story';
    entries.push({
      id: pick.id,
      date,
      time: isReel && (isReelDay || isFriday) ? config.reelTime : config.time,
    });
    countPerWeek.set(wk, (countPerWeek.get(wk) ?? 0) + 1);
    countPerWeek.set(`${pick.pillar}:${wk}`, (countPerWeek.get(`${pick.pillar}:${wk}`) ?? 0) + 1);
    placedPerPillar.set(pick.pillar, (placedPerPillar.get(pick.pillar) ?? 0) + 1);
    lastUsedAt.set(pick.pillar, placed);
    placed++;
  }

  return entries;
}

export function sortEntries(entries: ScheduleEntry[]): ScheduleEntry[] {
  return [...entries].sort((a, b) =>
    `${a.date} ${a.time}` < `${b.date} ${b.time}` ? -1 : `${a.date} ${a.time}` > `${b.date} ${b.time}` ? 1 : 0,
  );
}

export function entryStamp(entry: ScheduleEntry): string {
  return `${entry.date}T${entry.time}`;
}
