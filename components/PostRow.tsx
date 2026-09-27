'use client';

import type { Platform, PublishOutcome } from '@/lib/types';
import {
  FORMAT_LABEL,
  PLATFORM_LABEL,
  PLATFORM_ORDER,
  type ConnectionSummary,
  type EntryView,
  type PublishedMark,
} from '@/lib/view';

export interface RowProps {
  entry: EntryView;
  connections: ConnectionSummary;
  marks: Partial<Record<Platform, PublishedMark>>;
  busyPlatforms: Platform[];
  outcomes: PublishOutcome[] | undefined;
  open: boolean;
  onToggle: () => void;
  onPublish: (platforms: Platform[]) => void;
}

export function connectedPlatforms(connections: ConnectionSummary): Platform[] {
  const list: Platform[] = [];
  if (connections.instagram.connected) list.push('ig');
  if (connections.facebook.connected) list.push('fb');
  if (connections.linkedin.connected) list.push('li');
  return list;
}

function timeOf(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function PostRow({
  entry,
  connections,
  marks,
  busyPlatforms,
  outcomes,
  open,
  onToggle,
  onPublish,
}: RowProps) {
  const live = connectedPlatforms(connections);
  const wanted = entry.platforms.length ? entry.platforms : PLATFORM_ORDER;
  const available = PLATFORM_ORDER.filter((p) => wanted.includes(p));
  const busy = busyPlatforms.length > 0;
  const failures = (outcomes ?? []).filter((o) => !o.ok);
  const postedCount = Object.keys(marks).length;
  const remaining = available.filter((p) => !marks[p] && live.includes(p));

  return (
    <>
      <div className={`post${open ? ' open' : ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="thumb"
          src={`/media/${entry.image}`}
          alt=""
          loading="lazy"
          width={62}
          height={78}
        />

        <div className="grow">
          <div className="hook">{entry.hook}</div>
          <div className="meta">
            <span className="pill plain">{entry.pillarLabel}</span>
            <span>{FORMAT_LABEL[entry.format]}</span>
            <span className="mono">{entry.id}</span>
            <span className="num">{entry.time}</span>
            {entry.overdue && remaining.length ? <span className="pill alert">Overdue</span> : null}
            {postedCount && !remaining.length ? <span className="pill solid">Posted</span> : null}
          </div>
        </div>

        <div className="actions">
          {available.map((platform) => {
            const mark = marks[platform];
            const connected = live.includes(platform);
            const isBusy = busyPlatforms.includes(platform);
            if (mark) {
              return (
                <a
                  key={platform}
                  className="btn tiny"
                  href={mark.url ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  title={`Posted to ${PLATFORM_LABEL[platform]} at ${timeOf(mark.at)} — open it`}
                >
                  {PLATFORM_LABEL[platform]} ✓
                </a>
              );
            }
            return (
              <button
                key={platform}
                type="button"
                className="btn tiny"
                disabled={busy || !connected}
                title={
                  connected
                    ? `Post to ${PLATFORM_LABEL[platform]}`
                    : `${PLATFORM_LABEL[platform]} is not connected — open Settings`
                }
                onClick={() => onPublish([platform])}
              >
                {isBusy ? <span className="spinner" /> : null}
                {isBusy ? 'Posting…' : `Post to ${PLATFORM_LABEL[platform]}`}
              </button>
            );
          })}

          {remaining.length > 1 ? (
            <button
              type="button"
              className="btn tiny solid"
              disabled={busy}
              onClick={() => onPublish(remaining)}
            >
              {busy
                ? 'Posting…'
                : remaining.length === 3
                  ? 'Post to all three'
                  : `Post to all ${remaining.length}`}
            </button>
          ) : null}

          <button type="button" className="link" onClick={onToggle} aria-expanded={open}>
            {open ? 'Close' : 'Details'}
          </button>
        </div>
      </div>

      {failures.length ? (
        <div style={{ borderBottom: '1px solid var(--line)', padding: '0 0 14px 76px' }}>
          {failures.map((failure) => (
            <div className="banner alert" key={failure.platform} style={{ marginTop: 10 }}>
              <strong>{PLATFORM_LABEL[failure.platform]}</strong>
              <div className="grow">
                {failure.error}
                {failure.hint ? (
                  <div className="small" style={{ marginTop: 2 }}>
                    {failure.hint}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
