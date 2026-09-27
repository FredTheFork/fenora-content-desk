'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { Platform, PublishOutcome } from '@/lib/types';
import {
  PLATFORM_LABEL,
  type DeskView as DeskData,
  type EntryView,
  type PublishedMark,
} from '@/lib/view';
import { prettyDate, relativeDayLabel } from '@/lib/time';
import PostRow, { connectedPlatforms } from './PostRow';
import PostDetail from './PostDetail';
import LibraryPanel from './LibraryPanel';

export default function DeskView({ data }: { data: DeskData }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Record<string, Platform[]>>({});
  const [outcomes, setOutcomes] = useState<Record<string, PublishOutcome[]>>({});
  const [localMarks, setLocalMarks] = useState<
    Record<string, Partial<Record<Platform, PublishedMark>>>
  >({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [activity, setActivity] = useState<{ message: string; kind: 'ok' | 'alert' } | null>(null);
  const [libraryBusy, setLibraryBusy] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((message: string, kind: 'ok' | 'alert' = 'ok') => {
    setActivity({ message, kind });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setActivity(null), kind === 'alert' ? 9000 : 3500);
  }, []);

  const live = useMemo(() => connectedPlatforms(data.connections), [data.connections]);

  const publish = useCallback(
    async (postId: string, platforms: Platform[], force = false) => {
      if (!platforms.length) return;
      setBusy((b) => ({ ...b, [postId]: platforms }));
      try {
        const res = await fetch('/api/desk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'publish', postId, platforms, force }),
        });
        const json = (await res.json()) as {
          ok: boolean;
          error?: string;
          report?: { outcomes: PublishOutcome[] };
        };
        if (!json.ok || !json.report) {
          notify(json.error ?? 'The desk could not publish that.', 'alert');
          return;
        }
        const list = json.report.outcomes;
        setOutcomes((o) => ({ ...o, [postId]: list }));

        const marks: Partial<Record<Platform, PublishedMark>> = {};
        for (const outcome of list) {
          if (outcome.ok) marks[outcome.platform] = { at: new Date().toISOString(), url: outcome.url ?? null };
        }
        if (Object.keys(marks).length) {
          setLocalMarks((m) => ({ ...m, [postId]: { ...(m[postId] ?? {}), ...marks } }));
        }

        const failures = list.filter((o) => !o.ok);
        const posted = list.filter((o) => o.ok && !o.skipped);
        if (failures.length) {
          notify(
            failures.length === list.length
              ? `Nothing went out — ${failures.length} error${failures.length === 1 ? '' : 's'} below.`
              : `${posted.length} posted, ${failures.length} failed. Details below the post.`,
            'alert',
          );
        } else if (posted.length) {
          notify(`Posted to ${posted.map((p) => PLATFORM_LABEL[p.platform]).join(' + ')}.`);
        } else {
          notify('Already posted — nothing was sent twice.');
        }
        router.refresh();
      } catch {
        notify('Could not reach the desk. Check your connection and try again.', 'alert');
      } finally {
        setBusy((b) => ({ ...b, [postId]: [] }));
      }
    },
    [notify, router],
  );

  const act = useCallback(
    async (action: string, body: Record<string, unknown>, successMessage?: string) => {
      try {
        const res = await fetch('/api/desk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, ...body }),
        });
        const json = (await res.json()) as {
          ok: boolean;
          error?: string;
          message?: string;
          replacedWith?: string;
        };
        if (!json.ok) {
          notify(json.error ?? 'That did not work.', 'alert');
          return;
        }
        notify(successMessage ?? json.message ?? 'Done');
        if (json.replacedWith) setOpenId(json.replacedWith);
        router.refresh();
      } catch {
        notify('Could not reach the desk.', 'alert');
      }
    },
    [notify, router],
  );

  const marksFor = (entry: EntryView) => ({ ...entry.published, ...(localMarks[entry.id] ?? {}) });

  /** Remount key: changes when the post moves, or when a platform gets a tick. */
  const detailKey = (entry: EntryView) =>
    `${entry.id}|${entry.date}|${entry.time}|${Object.keys(marksFor(entry)).sort().join('')}`;

  const notices = [...data.notices];
  const missing = [
    !data.connections.instagram.connected ? 'Instagram' : null,
    !data.connections.facebook.connected ? 'Facebook' : null,
    !data.connections.linkedin.connected ? 'LinkedIn' : null,
  ].filter(Boolean) as string[];
  if (missing.length) {
    notices.unshift(
      `${missing.join(' and ')} ${missing.length === 1 ? 'is' : 'are'} not connected yet — connect from Settings and the buttons light up.`,
    );
  }
  if (data.connections.instagram.connected && !data.connections.instagram.username) {
    notices.push(
      'Instagram is connected but this desk could not read the username. Posting still works; if it fails, Meta will say why.',
    );
  }

  const groups = showAll ? data.groups : data.groups.slice(0, 8);
  const hidden = data.groups.length - groups.length;

  return (
    <>
      <div className="title-row">
        <div>
          <p className="label">Today</p>
          <h1 style={{ marginTop: 6 }}>{prettyDate(data.today)}</h1>
        </div>
        <span className="grow" />
        <div className="small muted" style={{ textAlign: 'right' }}>
          <div>
            <strong className="num">{data.scheduledCount}</strong> scheduled
            {data.overdue.length ? (
              <>
                {' · '}
                <strong className="num" style={{ color: 'var(--alert)' }}>
                  {data.overdue.length}
                </strong>{' '}
                overdue
              </>
            ) : null}
          </div>
          <div>
            <strong className="num">{data.postedCount}</strong> posted from {data.totalPosts} ·{' '}
            {data.connections.facebook.pageName ?? 'no Page'}
            {data.connections.instagram.username ? ` · @${data.connections.instagram.username}` : ''}
          </div>
        </div>
      </div>

      {notices.map((notice) => (
        <div className="banner" key={notice} style={{ marginTop: 14 }}>
          <div className="grow">{notice}</div>
          <a className="btn tiny ghost" href="/settings">
            Settings
          </a>
        </div>
      ))}

      {openId && ![...data.overdue, ...data.groups.flatMap((g) => g.entries)].some((e) => e.id === openId) ? (
        <section className="section">
          <div className="section-head">
            <h2>Post detail</h2>
            <span className="muted small">Not on the calendar — nothing will go out until you post it.</span>
            <span className="grow" />
            <button type="button" className="link" onClick={() => setOpenId(null)}>
              Close
            </button>
          </div>
          <PostDetail
            postId={openId}
            busy={Boolean((busy[openId] ?? []).length)}
            onClose={() => setOpenId(null)}
            onPublish={(platforms, force) => publish(openId, platforms, force)}
            onAction={(action, payload) => act(action, { postId: openId, ...payload })}
            notify={notify}
          />
        </section>
      ) : null}

      {data.overdue.length ? (
        <section className="section">
          <div className="section-head" style={{ borderBottomColor: 'var(--alert)' }}>
            <h2>Needs posting</h2>
            <span className="muted small">Their day has passed and something did not go out.</span>
          </div>
          {data.overdue.map((entry) => (
            <div key={entry.id}>
              <PostRow
                entry={entry}
                connections={data.connections}
                marks={marksFor(entry)}
                busyPlatforms={busy[entry.id] ?? []}
                outcomes={outcomes[entry.id]}
                open={openId === entry.id}
                onToggle={() => setOpenId(openId === entry.id ? null : entry.id)}
                onPublish={(platforms) => publish(entry.id, platforms)}
              />
              {openId === entry.id ? (
                <PostDetail
                  key={detailKey(entry)}
                  postId={entry.id}
                  busy={Boolean((busy[entry.id] ?? []).length)}
                  onClose={() => setOpenId(null)}
                  onPublish={(platforms, force) => publish(entry.id, platforms, force)}
                  onAction={(action, payload) => act(action, { postId: entry.id, ...payload })}
                  notify={notify}
                />
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      <section className="section">
        <div className="section-head">
          <h2>Coming up</h2>
          <span className="muted small">
            {data.schedule.perWeek} a week · {data.schedule.time} ({data.timezone.replace('_', ' ')})
            {data.schedule.autoPublish ? ' · auto-publishing on' : ' · you post them'}
          </span>
          <span className="grow" />
          <a className="btn sm ghost" href="/settings">
            Change cadence
          </a>
        </div>

        {groups.length === 0 ? (
          <div className="empty" style={{ marginTop: 16 }}>
            Nothing on the calendar. Open <a href="/settings">Settings</a> and press{' '}
            <strong>Rebuild the calendar</strong>.
          </div>
        ) : null}

        {groups.map((group) => (
          <div className="day-group" key={group.date}>
            <div className="day-head">
              <span className="d">{prettyDate(group.date)}</span>
              {relativeDayLabel(group.date, data.timezone) ? (
                <span className="hi">{relativeDayLabel(group.date, data.timezone)}</span>
              ) : null}
              <span className="grow" />
              <span className="small faint num">
                {group.entries.length} post{group.entries.length === 1 ? '' : 's'}
              </span>
            </div>

            {group.entries.map((entry) => (
              <div key={entry.id}>
                <PostRow
                  entry={entry}
                  connections={data.connections}
                  marks={marksFor(entry)}
                  busyPlatforms={busy[entry.id] ?? []}
                  outcomes={outcomes[entry.id]}
                  open={openId === entry.id}
                  onToggle={() => setOpenId(openId === entry.id ? null : entry.id)}
                  onPublish={(platforms) => publish(entry.id, platforms)}
                />
                {openId === entry.id ? (
                  <PostDetail
                    key={detailKey(entry)}
                    postId={entry.id}
                    busy={Boolean((busy[entry.id] ?? []).length)}
                    onClose={() => setOpenId(null)}
                    onPublish={(platforms, force) => publish(entry.id, platforms, force)}
                    onAction={(action, payload) => act(action, { postId: entry.id, ...payload })}
                    notify={notify}
                  />
                ) : null}
              </div>
            ))}
          </div>
        ))}

        {hidden > 0 ? (
          <div style={{ marginTop: 18 }}>
            <button type="button" className="btn sm ghost" onClick={() => setShowAll(true)}>
              Show {hidden} more days
            </button>
            <span className="muted small" style={{ marginLeft: 12 }}>
              {data.scheduledCount} posts are queued altogether.
            </span>
          </div>
        ) : null}
      </section>

      <LibraryPanel
        items={data.library}
        busyId={libraryBusy}
        onQueue={async (id) => {
          setLibraryBusy(id);
          await act('queue', { postId: id }, 'Added to the next free slot');
          setLibraryBusy(null);
        }}
        onOpen={(id) => {
          setOpenId(id);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      <div className={`toast${activity ? ' on' : ''}${activity?.kind === 'alert' ? ' alert' : ''}`}>
        {activity?.message}
      </div>
    </>
  );
}
