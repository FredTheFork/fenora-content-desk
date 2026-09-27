export type Platform = 'ig' | 'fb' | 'li';

export type PostFormat = 'static' | 'reel' | 'carousel' | 'poll' | 'quiz' | 'story' | 'text';

/** A post as published to the desk (trimmed from content/posts.json + public/media). */
export interface Post {
  id: string;
  pillar: string;
  pillarLabel: string;
  format: PostFormat;
  hook: string;
  /** Platforms this post was written for. */
  platforms: Platform[];
  /** Ready-to-publish caption per platform (fallbacks already applied). */
  caption: Record<Platform, string>;
  /** Rendered images: feed is 4:5, story is 9:16 (only on vertical formats). */
  media: { feed: string; story: string | null };
}

export interface PostData {
  generated: string;
  posts: Post[];
  pillars: { key: string; label: string; count: number }[];
  missingMedia: string[];
}

export interface ScheduleConfig {
  /** Posts per week, 1–7. */
  perWeek: number;
  /** Weekdays that can carry a post (0 = Sunday). */
  days: number[];
  /** Default publish time, HH:MM in `timezone`. */
  time: string;
  /** Publish time for reel/story slots. */
  reelTime: string;
  /** IANA timezone the times above are expressed in. */
  timezone: string;
  /** Pillar weights for the planner. */
  mix: Record<string, number>;
  /** Let the cron publish when a post comes due. */
  autoPublish: boolean;
}

export interface ScheduleEntry {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
}

export interface Schedule {
  config: ScheduleConfig;
  entries: ScheduleEntry[];
  builtAt: string | null;
}

export interface PublishRecord {
  id: string | null;
  url: string | null;
  at: string;
}

export interface PageOption {
  id: string;
  name: string;
  token: string;
  ig: { id: string; username: string | null } | null;
}

export interface OrgOption {
  urn: string;
  name: string | null;
}

export interface MetaConnection {
  /** Long-lived user token — kept so the Page list can be refreshed. */
  userToken?: string;
  expiresAt?: string | null;
  pages: PageOption[];
  selectedPageId: string;
  connectedAt: string;
  source: 'oauth' | 'manual';
  accountName?: string | null;
}

export interface LinkedInConnection {
  token: string;
  expiresAt?: string | null;
  person: { urn: string; name: string | null } | null;
  orgs: OrgOption[];
  /** Which identity posts go out as. */
  author: 'organization' | 'person';
  selectedOrgUrn: string;
  connectedAt: string;
  source: 'oauth' | 'manual';
  accountName?: string | null;
}

export interface Connections {
  /** Sealed (encrypted when DESK_SECRET is set) MetaConnection blob. */
  meta?: string;
  /** Sealed LinkedInConnection blob. */
  linkedin?: string;
}

export interface DeskState {
  rev: number;
  updatedAt: string;
  connections: Connections;
  schedule: Schedule;
  /** postId → platform → record */
  published: Record<string, Partial<Record<Platform, PublishRecord>>>;
  /** postId → platform → caption override */
  captions: Record<string, Partial<Record<Platform, string>>>;
}

export interface PublishOutcome {
  platform: Platform;
  ok: boolean;
  skipped?: boolean;
  url?: string | null;
  id?: string | null;
  error?: string;
  hint?: string;
}

export interface PublishReport {
  postId: string;
  at: string;
  outcomes: PublishOutcome[];
}
