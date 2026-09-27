import 'server-only';
import raw from '@/data/posts.json';
import type { Platform, Post, PostData } from './types';

/** Posts can only go to these, in this order. */
export const PLATFORM_ORDER: Platform[] = ['ig', 'fb', 'li'];

const data = raw as unknown as PostData;

export const POSTS: Post[] = data.posts;
export const PILLARS = data.pillars;
export const DATA_GENERATED = data.generated;
export const MISSING_MEDIA = data.missingMedia ?? [];

const byId = new Map<string, Post>(POSTS.map((p) => [p.id, p]));

export function getPost(id: string): Post | undefined {
  return byId.get(id);
}

export function requirePost(id: string): Post {
  const post = byId.get(id);
  if (!post) throw new Error(`Unknown post: ${id}`);
  return post;
}

/** The caption to publish: your edit if there is one, otherwise the copywriter's. */
export function captionFor(
  post: Post,
  platform: Platform,
  overrides?: Partial<Record<Platform, string>>,
): string {
  const override = overrides?.[platform];
  if (override && override.trim()) return override.trim();
  return (post.caption[platform] || post.caption.ig || post.hook).trim();
}
