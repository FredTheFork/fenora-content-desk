import type { NextRequest } from 'next/server';
import { fail, guard, ok } from '@/lib/api';
import { readState } from '@/lib/store';
import { captionFor, getPost } from '@/lib/postdata';
import type { PostDetailView } from '@/lib/view';
import type { Platform } from '@/lib/types';

export const runtime = 'nodejs';

const PLATFORMS: Platform[] = ['ig', 'fb', 'li'];

export async function GET(req: NextRequest) {
  const blocked = await guard();
  if (blocked) return blocked;

  const id = new URL(req.url).searchParams.get('id') ?? '';
  const post = getPost(id);
  if (!post) return fail('That post does not exist.', 404);

  const state = await readState();
  const overrides = state.captions[post.id] ?? {};
  const published = state.published[post.id] ?? {};
  const entry = state.schedule.entries.find((e) => e.id === post.id);

  const detail: PostDetailView = {
    id: post.id,
    hook: post.hook,
    pillar: post.pillar,
    pillarLabel: post.pillarLabel,
    format: post.format,
    platforms: post.platforms,
    image: post.media.feed,
    story: post.media.story,
    captions: Object.fromEntries(
      PLATFORMS.map((p) => [p, captionFor(post, p, overrides)]),
    ) as Record<Platform, string>,
    edited: Object.fromEntries(
      PLATFORMS.map((p) => [p, Boolean(overrides[p])]),
    ) as Partial<Record<Platform, boolean>>,
    published: Object.fromEntries(
      PLATFORMS.filter((p) => published[p]).map((p) => [
        p,
        { at: published[p]!.at, url: published[p]!.url },
      ]),
    ) as PostDetailView['published'],
    scheduledFor: entry ? { date: entry.date, time: entry.time } : null,
  };

  return ok({ post: detail });
}
