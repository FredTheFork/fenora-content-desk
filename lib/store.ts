import 'server-only';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { DeskState, ScheduleConfig } from './types';
import { env } from './env';
import { DEFAULT_TZ } from './time';

/**
 * Where the desk keeps its state: who is connected, what is scheduled, what has
 * been posted. One of four backends, picked automatically:
 *
 *   1. Upstash Redis / Vercel KV   (KV_REST_API_URL + KV_REST_API_TOKEN)
 *   2. Postgres / Neon / Supabase  (DATABASE_URL or POSTGRES_URL)
 *   3. A JSON file                 (local development)
 *   4. Memory                      (last resort — nothing survives a restart)
 *
 * Both 1 and 2 are a single click in Vercel → Storage, and the desk says plainly
 * in Settings which one it is using.
 */

const KEY = 'fenora:desk:state:v3';
const FILE = path.join(process.cwd(), '.data', 'state.json');
const PG_TABLE = 'fenora_desk';

export type StoreKind = 'kv' | 'postgres' | 'file' | 'memory';

export interface StoreInfo {
  kind: StoreKind;
  label: string;
  persistent: boolean;
  hint: string;
}

export const DEFAULT_MIX: Record<string, number> = {
  'trade-pain': 9,
  'nerd-detail': 8,
  'customer-reality': 6,
  planning: 5,
  money: 4,
  contrarian: 7,
  wip: 3,
  'build-in-public': 2,
  team: 2,
};

export const DEFAULT_SCHEDULE: ScheduleConfig = {
  perWeek: 5,
  days: [1, 2, 3, 4, 5],
  time: '08:15',
  reelTime: '18:30',
  timezone: DEFAULT_TZ,
  mix: { ...DEFAULT_MIX },
  autoPublish: false,
};

export function emptyState(): DeskState {
  return {
    rev: 0,
    updatedAt: new Date().toISOString(),
    connections: {},
    schedule: { config: { ...DEFAULT_SCHEDULE, mix: { ...DEFAULT_MIX } }, entries: [], builtAt: null },
    published: {},
    captions: {},
  };
}

/** Tolerate older or hand-edited documents without ever throwing. */
function normalize(input: unknown): DeskState {
  const base = emptyState();
  if (!input || typeof input !== 'object') return base;
  const raw = input as Partial<DeskState>;
  const cfg = (raw.schedule?.config ?? {}) as Partial<ScheduleConfig>;
  return {
    rev: typeof raw.rev === 'number' ? raw.rev : 0,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : base.updatedAt,
    connections: raw.connections && typeof raw.connections === 'object' ? raw.connections : {},
    schedule: {
      config: {
        ...base.schedule.config,
        ...cfg,
        mix: { ...DEFAULT_MIX, ...(cfg.mix ?? {}) },
        days: Array.isArray(cfg.days) && cfg.days.length ? cfg.days : base.schedule.config.days,
      },
      entries: Array.isArray(raw.schedule?.entries)
        ? raw.schedule.entries.filter(
            (e) => e && typeof e.id === 'string' && typeof e.date === 'string',
          )
        : [],
      builtAt: raw.schedule?.builtAt ?? null,
    },
    published: raw.published && typeof raw.published === 'object' ? raw.published : {},
    captions: raw.captions && typeof raw.captions === 'object' ? raw.captions : {},
  };
}

/* ── Backend detection ───────────────────────────────────────────────────── */

function kvEnv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/+$/, ''), token } : null;
}

function pgUrl(): string | null {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    null
  );
}

export function storeKind(): StoreKind {
  if (kvEnv()) return 'kv';
  if (pgUrl()) return 'postgres';
  if (env.onVercel) return 'memory';
  return 'file';
}

export function storeInfo(): StoreInfo {
  switch (storeKind()) {
    case 'kv':
      return {
        kind: 'kv',
        label: 'Upstash Redis / Vercel KV',
        persistent: true,
        hint: 'Connections, schedule and the posted-log are saved and survive every deploy.',
      };
    case 'postgres':
      return {
        kind: 'postgres',
        label: 'Postgres',
        persistent: true,
        hint: 'Connections, schedule and the posted-log are saved and survive every deploy.',
      };
    case 'file':
      return {
        kind: 'file',
        label: 'Local file (.data/state.json)',
        persistent: true,
        hint: 'Fine for local development. Add a database before deploying.',
      };
    default:
      return {
        kind: 'memory',
        label: 'Memory only — nothing is saved yet',
        persistent: false,
        hint: 'Add a database in Vercel → Storage (Upstash Redis or Postgres). Until then, connections and the posted-log reset whenever the app restarts.',
      };
  }
}

/* ── KV (Upstash REST) ───────────────────────────────────────────────────── */

async function kvCommand(command: unknown[]): Promise<unknown> {
  const kv = kvEnv();
  if (!kv) throw new Error('KV is not configured');
  const res = await fetch(kv.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${kv.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`KV error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { result?: unknown; error?: string };
  if (json.error) throw new Error(`KV error: ${json.error}`);
  return json.result ?? null;
}

/* ── Postgres ────────────────────────────────────────────────────────────── */

type PgPool = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
};

let schemaReady: Promise<void> | null = null;

async function pool(): Promise<PgPool> {
  const g = globalThis as typeof globalThis & { __fenoraPool?: PgPool };
  if (g.__fenoraPool) return g.__fenoraPool;
  const url = pgUrl();
  if (!url) throw new Error('No DATABASE_URL configured');
  const { Pool } = (await import('pg')) as unknown as {
    Pool: new (config: Record<string, unknown>) => PgPool;
  };
  const needsSsl = !/sslmode=/.test(url) && !/localhost|127\.0\.0\.1/.test(url);
  g.__fenoraPool = new Pool({
    connectionString: url,
    max: 2,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  return g.__fenoraPool;
}

async function ensureSchema(db: PgPool): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await db.query(
        `create table if not exists ${PG_TABLE} (
           id text primary key,
           doc jsonb not null,
           rev integer not null default 0,
           updated_at timestamptz not null default now()
         )`,
      );
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

async function pgRead(): Promise<{ doc: unknown; rev: number } | null> {
  const db = await pool();
  await ensureSchema(db);
  const res = await db.query(`select doc, rev from ${PG_TABLE} where id = $1`, ['state']);
  const row = res.rows[0];
  if (!row) return null;
  return { doc: row.doc, rev: Number(row.rev) || 0 };
}

async function pgWrite(doc: DeskState, expectRev: number | null): Promise<boolean> {
  const db = await pool();
  await ensureSchema(db);
  if (expectRev === null) {
    const res = await db.query(
      `insert into ${PG_TABLE} (id, doc, rev) values ($1, $2::jsonb, 1) on conflict (id) do nothing`,
      ['state', JSON.stringify(doc)],
    );
    return (res.rowCount ?? 0) > 0;
  }
  const res = await db.query(
    `update ${PG_TABLE} set doc = $2::jsonb, rev = rev + 1, updated_at = now() where id = $1 and rev = $3`,
    ['state', JSON.stringify(doc), expectRev],
  );
  return (res.rowCount ?? 0) > 0;
}

/* ── File + memory ───────────────────────────────────────────────────────── */

async function fileRead(): Promise<unknown> {
  try {
    return JSON.parse(await fs.readFile(FILE, 'utf8'));
  } catch {
    return null;
  }
}

async function fileWrite(doc: DeskState): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(doc, null, 1), 'utf8');
  await fs.rename(tmp, FILE);
}

type MemoryBox = { __fenoraDeskState?: DeskState };
function memoryBox(): MemoryBox {
  return globalThis as unknown as MemoryBox;
}

/* ── Public API ──────────────────────────────────────────────────────────── */

export async function readState(): Promise<DeskState> {
  const kind = storeKind();
  try {
    if (kind === 'kv') {
      const raw = await kvCommand(['GET', KEY]);
      return normalize(typeof raw === 'string' ? JSON.parse(raw) : null);
    }
    if (kind === 'postgres') {
      const row = await pgRead();
      return normalize(row?.doc ?? null);
    }
    if (kind === 'file') {
      return normalize(await fileRead());
    }
  } catch (err) {
    console.error('[store] read failed:', err);
  }
  return normalize(memoryBox().__fenoraDeskState ?? null);
}

async function writeState(doc: DeskState): Promise<void> {
  const kind = storeKind();
  if (kind === 'kv') {
    await kvCommand(['SET', KEY, JSON.stringify(doc)]);
    return;
  }
  if (kind === 'postgres') {
    const existing = await pgRead();
    const ok = await pgWrite(doc, existing ? existing.rev : null);
    if (!ok) throw new Error('CONFLICT');
    return;
  }
  if (kind === 'file') {
    await fileWrite(doc);
    return;
  }
  memoryBox().__fenoraDeskState = doc;
}

let queue: Promise<unknown> = Promise.resolve();

/**
 * Read → mutate → write, serialised inside this process and retried on a
 * lost-update conflict in Postgres.
 */
export async function updateState<T>(
  mutator: (state: DeskState) => T | Promise<T>,
): Promise<{ state: DeskState; result: T }> {
  const run = async () => {
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      const current = await readState();
      const draft: DeskState = structuredClone(current);
      const result = await mutator(draft);
      draft.rev = (current.rev || 0) + 1;
      draft.updatedAt = new Date().toISOString();
      try {
        await writeState(draft);
        return { state: draft, result };
      } catch (err) {
        lastError = err;
        if (String((err as Error)?.message) !== 'CONFLICT') throw err;
        await new Promise((r) => setTimeout(r, 40 + attempt * 80));
      }
    }
    throw lastError ?? new Error('Could not save the desk state');
  };

  const next = queue.then(run, run);
  queue = next.catch(() => undefined);
  return next;
}
