import { Suspense } from 'react';
import { headers } from 'next/headers';
import SettingsView from '@/components/SettingsView';
import TopBar from '@/components/TopBar';
import { connectionSummary } from '@/lib/connections';
import { publishedIds, loadState } from '@/lib/desk';
import { baseUrl, envPresence } from '@/lib/env';
import { PILLARS, POSTS } from '@/lib/postdata';
import { storeInfo } from '@/lib/store';
import type { SettingsData } from '@/lib/view';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const state = await loadState();
  const h = await headers();
  const connections = connectionSummary(state);

  const data: SettingsData = {
    connections,
    store: storeInfo(),
    schedule: state.schedule.config,
    pillars: PILLARS.map((p) => ({ key: p.key, label: p.label, count: p.count })),
    environment: envPresence(),
    origin: baseUrl(`https://${h.get('host') ?? 'localhost:3000'}`),
    counts: {
      scheduled: state.schedule.entries.length,
      posted: publishedIds(state).size,
      total: POSTS.length,
    },
    problems: connections.problems,
  };

  return (
    <>
      <TopBar current="settings" />
      <main className="shell" id="main">
        <Suspense fallback={<p className="muted small">Loading settings…</p>}>
          <SettingsView data={data} />
        </Suspense>
      </main>
    </>
  );
}
