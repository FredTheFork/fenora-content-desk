'use client';

import { useMemo, useState } from 'react';
import { FORMAT_LABEL, type LibraryItem } from '@/lib/view';
import { prettyDate } from '@/lib/time';

interface Props {
  items: LibraryItem[];
  busyId: string | null;
  onQueue: (id: string) => void;
  onOpen: (id: string) => void;
}

const PAGE = 24;

export default function LibraryPanel({ items, busyId, onQueue, onOpen }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hideQueued, setHideQueued] = useState(true);
  const [shown, setShown] = useState(PAGE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (hideQueued && (item.queuedOn || item.posted.length)) return false;
      if (!q) return true;
      return (
        item.id.toLowerCase().includes(q) ||
        item.hook.toLowerCase().includes(q) ||
        item.pillarLabel.toLowerCase().includes(q) ||
        FORMAT_LABEL[item.format].toLowerCase().includes(q)
      );
    });
  }, [items, query, hideQueued]);

  const visible = filtered.slice(0, shown);

  return (
    <section className="section">
      <div className="section-head">
        <h2>Library</h2>
        <span className="muted small">{items.length} posts, all written and designed</span>
        <span className="grow" />
        <button type="button" className="btn sm ghost" onClick={() => setOpen((v) => !v)}>
          {open ? 'Hide' : 'Browse and queue posts'}
        </button>
      </div>

      {open ? (
        <div style={{ paddingTop: 16 }}>
          <div className="inline" style={{ marginBottom: 16 }}>
            <div className="field grow" style={{ minWidth: 240 }}>
              <input
                type="search"
                placeholder="Search 251 posts — reveal, sash, planning, margin…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShown(PAGE);
                }}
              />
            </div>
            <label className="small muted" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={hideQueued}
                onChange={(e) => {
                  setHideQueued(e.target.checked);
                  setShown(PAGE);
                }}
              />
              Hide ones already on the calendar
            </label>
            <span className="grow" />
            <span className="small faint num">
              {filtered.length} match{filtered.length === 1 ? '' : 'es'}
            </span>
          </div>

          {visible.length === 0 ? (
            <div className="empty">Nothing matches that search.</div>
          ) : (
            <div className="lib-grid">
              {visible.map((item) => (
                <div className="lib-card" key={item.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/media/${item.image}`} alt="" loading="lazy" />
                  <div className="b">
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{item.pillarLabel}</div>
                    <div className="faint" style={{ lineHeight: 1.35 }}>
                      {item.hook.slice(0, 96)}
                      {item.hook.length > 96 ? '…' : ''}
                    </div>
                  </div>
                  <div className="f">
                    <span className="mono faint">{item.id}</span>
                    {item.posted.length ? (
                      <span className="pill solid" title={`Already posted to ${item.posted.join(', ')}`}>
                        Posted
                      </span>
                    ) : item.queuedOn ? (
                      <span className="pill plain" title={`On the calendar for ${item.queuedOn}`}>
                        {prettyDate(item.queuedOn)}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn tiny"
                        disabled={busyId === item.id}
                        onClick={() => onQueue(item.id)}
                      >
                        {busyId === item.id ? 'Adding…' : 'Queue'}
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    className="link"
                    style={{ padding: '0 9px 10px', textAlign: 'left' }}
                    onClick={() => onOpen(item.id)}
                  >
                    Open details
                  </button>
                </div>
              ))}
            </div>
          )}

          {shown < filtered.length ? (
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <button type="button" className="btn sm ghost" onClick={() => setShown((s) => s + PAGE)}>
                Show {Math.min(PAGE, filtered.length - shown)} more
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
