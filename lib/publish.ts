import 'server-only';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { isPubliclyReachable, mediaUrl } from './env';
import {
  linkedInCredentials,
  metaCredentials,
  type CredentialsProblem,
  type LinkedInCredentials,
  type MetaCredentials,
} from './connections';
import { PlatformError, publishFacebookPhoto, publishInstagramImage } from './meta';
import { createPost, uploadImage } from './linkedin';
import { captionFor, requirePost } from './postdata';
import { readState, updateState } from './store';
import type { Platform, Post, PublishOutcome, PublishRecord, PublishReport } from './types';

/**
 * The one function the desk hangs off: publish this post to those platforms,
 * once. Platforms that already carry the post are reported back untouched
 * rather than posted twice, so a second click can never duplicate a post.
 */

export interface PublishRequest {
  postId: string;
  platforms: Platform[];
  /** Post again even if the record says it already went out. */
  force?: boolean;
  /** The URL the request came in on — used to build public image links. */
  requestUrl?: string;
}

/** Read the rendered card from disk when we can, otherwise fetch it from our own public URL. */
export async function imageBytes(file: string, requestUrl?: string): Promise<Uint8Array> {
  try {
    const local = path.join(process.cwd(), 'public', 'media', file);
    return new Uint8Array(await fs.readFile(local));
  } catch {
    const res = await fetch(mediaUrl(file, requestUrl), { cache: 'no-store' });
    if (!res.ok) throw new Error(`Could not read ${file} (HTTP ${res.status})`);
    return new Uint8Array(await res.arrayBuffer());
  }
}

export async function publishPost({
  postId,
  platforms,
  force = false,
  requestUrl,
}: PublishRequest): Promise<PublishReport> {
  const post = requirePost(postId);
  const requested = [...new Set(platforms)].filter((p): p is Platform =>
    ['ig', 'fb', 'li'].includes(p),
  );
  const at = new Date().toISOString();

  const state = await readState();
  const existing = state.published[postId] ?? {};
  const overrides = state.captions[postId];
  const url = mediaUrl(post.media.feed, requestUrl);
  const publicUrlOk = isPubliclyReachable(url);
  const meta = metaCredentials(state);
  const linkedin = linkedInCredentials(state);

  const outcomes: PublishOutcome[] = [];
  const records: Partial<Record<Platform, PublishRecord>> = {};

  for (const platform of requested) {
    const already = existing[platform];
    if (already && !force) {
      outcomes.push({ platform, ok: true, skipped: true, url: already.url, id: already.id });
      continue;
    }
    try {
      const record = await publishOne({
        platform,
        post,
        caption: captionFor(post, platform, overrides),
        url,
        publicUrlOk,
        meta,
        linkedin,
        requestUrl,
      });
      records[platform] = { ...record, at: new Date().toISOString() };
      outcomes.push({ platform, ok: true, url: record.url, id: record.id });
    } catch (err) {
      const error =
        err instanceof PlatformError
          ? err
          : new PlatformError((err as Error)?.message ?? 'Unknown error');
      outcomes.push({ platform, ok: false, error: error.message, hint: error.hint });
    }
  }

  if (Object.keys(records).length) {
    await updateState((draft) => {
      draft.published[postId] = { ...(draft.published[postId] ?? {}), ...records };
    });
  }

  return { postId, at, outcomes };
}

async function publishOne(opts: {
  platform: Platform;
  post: Post;
  caption: string;
  url: string;
  publicUrlOk: boolean;
  meta: MetaCredentials | CredentialsProblem;
  linkedin: LinkedInCredentials | CredentialsProblem;
  requestUrl?: string;
}): Promise<{ id: string | null; url: string | null }> {
  const { platform, post, caption, url, publicUrlOk, meta, linkedin, requestUrl } = opts;

  if (platform === 'ig' || platform === 'fb') {
    if (!meta.ok) throw new PlatformError(meta.reason, meta.hint);

    if (!publicUrlOk) {
      throw new PlatformError(
        `${platform === 'ig' ? 'Instagram' : 'Facebook'} needs the image at a public https address.`,
        `The desk is currently building image links from ${url}. Deploy it to Vercel, or set PUBLIC_BASE_URL to your real domain, then press the button again.`,
      );
    }

    if (platform === 'fb') {
      if (!meta.pageId) {
        throw new PlatformError(
          'No Facebook Page is selected.',
          'Open Settings → Connections and choose which Page to post to.',
        );
      }
      return publishFacebookPhoto({
        pageId: meta.pageId,
        token: meta.pageToken,
        imageUrl: url,
        message: caption,
      });
    }

    if (!meta.igUserId) {
      throw new PlatformError(
        'No Instagram Business account is linked to that Facebook Page.',
        'In Meta Business Suite → Settings → Linked accounts, connect the Instagram account, then reconnect in Settings.',
      );
    }
    return publishInstagramImage({
      igUserId: meta.igUserId,
      token: meta.pageToken,
      imageUrl: url,
      caption,
    });
  }

  // LinkedIn — the image is uploaded as bytes, so no public URL is needed.
  if (!linkedin.ok) throw new PlatformError(linkedin.reason, linkedin.hint);
  if (!linkedin.authorUrn) {
    throw new PlatformError(
      'LinkedIn has no author selected.',
      'In Settings → Connections, choose whether posts go out as your profile or as a company Page.',
    );
  }
  const bytes = await imageBytes(post.media.feed, requestUrl);
  const imageUrn = await uploadImage(linkedin.token, linkedin.authorUrn, bytes);
  return createPost({
    token: linkedin.token,
    authorUrn: linkedin.authorUrn,
    commentary: caption,
    imageUrn,
    imageAltText: post.hook,
  });
}
