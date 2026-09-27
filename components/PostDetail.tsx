'use client';

import { useEffect, useState } from 'react';
import type { Platform } from '@/lib/types';
import { FORMAT_LABEL, PLATFORM_LABEL, PLATFORM_ORDER, type PostDetailView } from '@/lib/view';

interface Props {
  postId: string;
  onClose: () => void;
  onPublish: (platforms: Platform[], force?: boolean) => void;
  onAction: (
    action: 'queue' | 'unqueue' | 'swap' | 'move',
    payload?: Record<string, unknown>,
  ) => void;
  notify: (message: string, kind?: 'alert' | 'ok') => void;
  busy: boolean;
}

export default function PostDetail({ postId, onClose, onPublish, onAction, notify, busy }: Props) {
  const [detail, setDetail] = useState<PostDetailView | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Platform>('ig');
  const [draft, setDraft] = useState('');
  const [dirty, setDirty] = useState(false);
  const [size, setSize] = useState<'feed' | 'story'>('feed');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    setDetail(null);
    setError('');
    fetch(`/api/post?id=${encodeURIComponent(postId)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => {
        if (!alive) return;
        if (!json.ok) {
          setError(json.error ?? 'Could not load that post.');
          return;
        }
        setDetail(json.post as PostDetailView);
      })
      .catch(() => alive && setError('Could not load that post.'));
    return () => {
      alive = false;
    };
  }, [postId]);

  useEffect(() => {
    if (!detail) return;
    setDraft(detail.captions[tab]);
    setDirty(false);
  }, [detail, tab]);

  async function saveCaption() {
    if (!detail) return;
    setSaving(true);
    try {
      const res = await fetch('/api/desk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'caption', postId: detail.id, platform: tab, text: draft }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        notify(json.error ?? 'Could not save the caption', 'alert');
        return;
      }
      setDetail({
        ...detail,
        captions: { ...detail.captions, [tab]: draft },
        edited: {
          ...detail.edited,
          [tab]: draft.trim() !== detail.captions[tab] || Boolean(detail.edited[tab]),
        },
      });
      setDirty(false);
      notify('Caption saved');
    } finally {
      setSaving(false);
    }
  }

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(draft);
      notify(`${PLATFORM_LABEL[tab]} caption copied`);
    } catch {
      notify('Your browser blocked the clipboard — select the text and copy manually.', 'alert');
    }
  }

  if (!detail) {
    return (
      <div className="post-detail">
        <div />
        <div className="muted small">{error || 'Loading…'}</div>
      </div>
    );
  }

  const image = size === 'story' && detail.story ? detail.story : detail.image;
  const remaining = PLATFORM_ORDER.filter(
    (p) => !detail.published[p] && detail.platforms.includes(p),
  );

  return (
    <div className="post-detail">
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="shot" src={`/media/${image}`} alt="" />

        <div className="row-actions" style={{ marginTop: 10 }}>
          {detail.story ? (
            <div className="cap-tabs" style={{ marginBottom: 0 }}>
              <button
                type="button"
                className={size === 'feed' ? 'on' : ''}
                onClick={() => setSize('feed')}
              >
                4:5 feed
              </button>
              <button
                type="button"
                className={size === 'story' ? 'on' : ''}
                onClick={() => setSize('story')}
              >
                9:16 story
              </button>
            </div>
          ) : (
            <span className="small faint">1080 × 1350</span>
          )}
        </div>

        <div className="row-actions" style={{ marginTop: 12 }}>
          <a className="btn tiny ghost" href={`/media/${detail.image}`} download>
            Download image
          </a>
          <a
            className="btn tiny ghost"
            href={`/media/${detail.image}`}
            target="_blank"
            rel="noreferrer"
          >
            Open full size
          </a>
        </div>

        <div style={{ marginTop: 18 }}>
          <div className="label" style={{ marginBottom: 6 }}>
            Calendar
          </div>
          <div className="small muted">
            {detail.scheduledFor
              ? `Queued for ${detail.scheduledFor.date} at ${detail.scheduledFor.time}`
              : 'Not on the calendar yet.'}
          </div>
          <div className="row-actions" style={{ marginTop: 10 }}>
            <input
              type="date"
              className="mono"
              style={{
                width: 150,
                padding: '6px 8px',
                border: '1px solid var(--line-strong)',
                borderRadius: 3,
              }}
              defaultValue={detail.scheduledFor?.date ?? ''}
              id={`date-${detail.id}`}
            />
            <button
              type="button"
              className="btn tiny"
              onClick={() => {
                const el = document.getElementById(`date-${detail.id}`) as HTMLInputElement | null;
                if (el?.value) onAction('move', { date: el.value });
              }}
            >
              Move
            </button>
            {detail.scheduledFor ? (
              <button type="button" className="link" onClick={() => onAction('unqueue')}>
                Remove from calendar
              </button>
            ) : (
              <button type="button" className="link" onClick={() => onAction('queue')}>
                Add to calendar
              </button>
            )}
            <button type="button" className="link" onClick={() => onAction('swap')}>
              Swap for another post
            </button>
          </div>
        </div>
      </div>

      <div>
        <div className="panel-head">
          <div className="grow">
            <span className="pill plain">{detail.pillarLabel}</span>{' '}
            <span className="small faint">
              {FORMAT_LABEL[detail.format]} · {detail.id}
            </span>
          </div>
          <button type="button" className="link" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="cap-tabs">
          {PLATFORM_ORDER.map((platform) => (
            <button
              key={platform}
              type="button"
              className={tab === platform ? 'on' : ''}
              onClick={() => setTab(platform)}
            >
              {PLATFORM_LABEL[platform]}
              {detail.published[platform] ? ' ✓' : ''}
            </button>
          ))}
        </div>

        <textarea
          rows={14}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setDirty(true);
          }}
        />
        <div className="row-actions" style={{ marginTop: 10, alignItems: 'center' }}>
          <button
            type="button"
            className="btn sm"
            onClick={saveCaption}
            disabled={!dirty || saving}
          >
            {saving ? 'Saving…' : 'Save caption'}
          </button>
          <button type="button" className="btn sm ghost" onClick={copyCaption}>
            Copy
          </button>
          {detail.edited[tab] ? (
            <button
              type="button"
              className="link"
              onClick={async () => {
                await fetch('/api/desk', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'caption',
                    postId: detail.id,
                    platform: tab,
                    text: '',
                  }),
                });
                notify('Caption reset to the original');
                const res = await fetch(`/api/post?id=${encodeURIComponent(detail.id)}`, {
                  cache: 'no-store',
                });
                const json = (await res.json()) as { ok: boolean; post?: PostDetailView };
                if (json.ok && json.post) setDetail(json.post);
              }}
            >
              Reset to original
            </button>
          ) : null}
          <span className="grow" />
          <span className="small faint num">{draft.length} characters</span>
        </div>

        <div className="row-actions" style={{ marginTop: 18 }}>
          {remaining.map((platform) => (
            <button
              key={platform}
              type="button"
              className="btn sm solid"
              disabled={busy}
              onClick={() => onPublish([platform])}
            >
              Post to {PLATFORM_LABEL[platform]}
            </button>
          ))}
          {detail.published.ig || detail.published.fb || detail.published.li ? (
            <div className="small muted" style={{ width: '100%' }}>
              {PLATFORM_ORDER.filter((p) => detail.published[p]).map((p) => (
                <div key={p} style={{ marginTop: 4 }}>
                  Posted to {PLATFORM_LABEL[p]}
                  {detail.published[p]?.url ? (
                    <>
                      {' — '}
                      <a href={detail.published[p]!.url!} target="_blank" rel="noreferrer">
                        view post
                      </a>
                    </>
                  ) : null}
                  {' · '}
                  <button
                    type="button"
                    className="link"
                    onClick={() => onPublish([p], true)}
                    disabled={busy}
                  >
                    post again
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
