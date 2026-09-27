import type { NextRequest } from 'next/server';
import { fail, guard, ok, readJson, str } from '@/lib/api';
import {
  moveEntry,
  queuePost,
  rebuildSchedule,
  setCaption,
  swapEntry,
  unqueuePost,
} from '@/lib/desk';
import { publishPost } from '@/lib/publish';
import type { Platform } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface Body {
  action?: string;
  postId?: string;
  platforms?: unknown;
  force?: boolean;
  platform?: string;
  text?: string;
  date?: string;
  time?: string;
}

const PLATFORMS: Platform[] = ['ig', 'fb', 'li'];

export async function POST(req: NextRequest) {
  const blocked = await guard();
  if (blocked) return blocked;

  const body = await readJson<Body>(req);
  const action = str(body.action, 32);
  const postId = str(body.postId, 40);

  try {
    switch (action) {
      case 'publish': {
        if (!postId) return fail('Pick a post first.');
        const wanted = (Array.isArray(body.platforms) ? body.platforms : [])
          .map((p) => str(p, 4) as Platform)
          .filter((p): p is Platform => PLATFORMS.includes(p));
        if (!wanted.length) return fail('Pick at least one platform.');
        const report = await publishPost({
          postId,
          platforms: wanted,
          force: Boolean(body.force),
          requestUrl: req.url,
        });
        return ok({ report });
      }

      case 'queue': {
        if (!postId) return fail('Pick a post first.');
        await queuePost(postId, body.date ? str(body.date, 10) : undefined);
        return ok({ message: 'Added to the calendar' });
      }

      case 'unqueue': {
        if (!postId) return fail('Pick a post first.');
        await unqueuePost(postId);
        return ok({ message: 'Removed from the calendar' });
      }

      case 'swap': {
        if (!postId) return fail('Pick a post first.');
        const { replacedWith } = await swapEntry(postId);
        return replacedWith
          ? ok({ message: `Swapped for ${replacedWith}`, replacedWith })
          : fail('No other post is free to swap in — everything is already queued or posted.');
      }

      case 'move': {
        if (!postId) return fail('Pick a post first.');
        const date = str(body.date, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail('That date is not valid.');
        await moveEntry(postId, date, body.time ? str(body.time, 5) : undefined);
        return ok({ message: 'Moved' });
      }

      case 'rebuild': {
        const { entries } = await rebuildSchedule(true);
        return ok({ message: `Calendar rebuilt — ${entries} posts scheduled`, entries });
      }

      case 'caption': {
        if (!postId) return fail('Pick a post first.');
        const platform = str(body.platform, 4) as Platform;
        if (!PLATFORMS.includes(platform)) return fail('Unknown platform.');
        await setCaption(postId, platform, str(body.text, 6000));
        return ok({ message: 'Caption saved' });
      }

      default:
        return fail(`Unknown action: ${action || '(none)'}`);
    }
  } catch (err) {
    console.error('[api/desk]', action, err);
    return fail((err as Error)?.message ?? 'Something went wrong', 500);
  }
}
