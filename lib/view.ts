import type { Platform, PostFormat } from './types';

/**
 * The shapes the browser is allowed to see. Pure types — no server imports —
 * so client components can pull them in safely.
 */

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

export interface StoreSummary {
  kind: 'kv' | 'postgres' | 'file' | 'memory';
  label: string;
  persistent: boolean;
  hint: string;
}

export interface PublishedMark {
  at: string;
  url: string | null;
}

export interface EntryView {
  id: string;
  hook: string;
  pillar: string;
  pillarLabel: string;
  format: PostFormat;
  platforms: Platform[];
  image: string;
  story: string | null;
  date: string;
  time: string;
  overdue: boolean;
  published: Partial<Record<Platform, PublishedMark>>;
}

export interface DayGroup {
  date: string;
  entries: EntryView[];
}

export interface LibraryItem {
  id: string;
  hook: string;
  pillar: string;
  pillarLabel: string;
  format: PostFormat;
  platforms: Platform[];
  image: string;
  queuedOn: string | null;
  /** Platforms this post has already gone out to. */
  posted: Platform[];
}

export interface DeskView {
  timezone: string;
  today: string;
  nowTime: string;
  groups: DayGroup[];
  overdue: EntryView[];
  scheduledCount: number;
  upcomingShown: number;
  publishedToday: number;
  library: LibraryItem[];
  totalPosts: number;
  postedCount: number;
  connections: ConnectionSummary;
  store: StoreSummary;
  notices: string[];
  schedule: {
    perWeek: number;
    time: string;
    reelTime: string;
    days: number[];
    timezone: string;
    mix: Record<string, number>;
    autoPublish: boolean;
  };
}

export interface EnvPresence {
  deskPassword: boolean;
  deskSecret: boolean;
  publicBaseUrl: boolean;
  metaApp: boolean;
  metaPreset: boolean;
  linkedinApp: boolean;
  linkedinPreset: boolean;
  cronSecret: boolean;
}

export interface ScheduleSettingsView {
  perWeek: number;
  days: number[];
  time: string;
  reelTime: string;
  timezone: string;
  mix: Record<string, number>;
  autoPublish: boolean;
}

export interface SettingsData {
  connections: ConnectionSummary;
  store: StoreSummary;
  schedule: ScheduleSettingsView;
  pillars: { key: string; label: string; count: number }[];
  environment: EnvPresence;
  origin: string;
  counts: { scheduled: number; posted: number; total: number };
  problems: string[];
}

export interface PostDetailView {
  id: string;
  hook: string;
  pillar: string;
  pillarLabel: string;
  format: PostFormat;
  platforms: Platform[];
  image: string;
  story: string | null;
  captions: Record<Platform, string>;
  edited: Partial<Record<Platform, boolean>>;
  published: Partial<Record<Platform, PublishedMark>>;
  scheduledFor: { date: string; time: string } | null;
}

export const PLATFORM_ORDER: Platform[] = ['ig', 'fb', 'li'];

export const PLATFORM_LABEL: Record<Platform, string> = {
  ig: 'Instagram',
  fb: 'Facebook',
  li: 'LinkedIn',
};

export const FORMAT_LABEL: Record<PostFormat, string> = {
  static: 'Static',
  reel: 'Reel',
  carousel: 'Carousel',
  poll: 'Poll',
  quiz: 'Quiz',
  story: 'Story',
  text: 'Long-form',
};
