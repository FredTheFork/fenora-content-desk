'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TIME_ZONES } from '@/lib/time';
import type { SettingsData } from '@/lib/view';

interface TestResult {
  provider: 'facebook' | 'instagram' | 'linkedin';
  ok: boolean;
  detail: string;
}

type Flash = { message: string; kind: 'ok' | 'alert' } | null;

export default function SettingsView({ data }: { data: SettingsData }) {
  const router = useRouter();
  const params = useSearchParams();
  const [flash, setFlash] = useState<Flash>(null);
  const [busy, setBusy] = useState('');
  const [tests, setTests] = useState<TestResult[] | null>(null);
  const [manualOpen, setManualOpen] = useState<'meta' | 'linkedin' | null>(null);
  const [manual, setManual] = useState({ pageId: '', pageToken: '', igUserId: '', liToken: '', liOrg: '' });

  const [schedule, setSchedule] = useState(data.schedule);
  const [mix, setMix] = useState<Record<string, number>>(data.schedule.mix);

  useEffect(() => {
    const connected = params.get('connected');
    const error = params.get('error');
    if (error) setFlash({ message: error, kind: 'alert' });
    else if (connected === 'meta') {
      const page = params.get('page');
      const ig = params.get('instagram');
      const missing = params.get('instagramMissing');
      setFlash({
        message: `Facebook connected${page ? ` — posting to “${page}”` : ''}${
          ig ? ` and Instagram @${ig}` : missing ? '. No Instagram Business account is linked to that Page yet.' : ''
        }`,
        kind: missing ? 'alert' : 'ok',
      });
    } else if (connected === 'linkedin') {
      setFlash({ message: `LinkedIn connected as ${params.get('as') ?? 'your account'}.`, kind: 'ok' });
    }
  }, [params]);

  async function send(
    url: string,
    body: Record<string, unknown>,
    key: string,
    okMessage?: string,
  ): Promise<{ ok: boolean; data: Record<string, unknown> }> {
    setBusy(key);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as Record<string, unknown> & { ok: boolean; error?: string; hint?: string; message?: string };
      if (!json.ok) {
        setFlash({
          message: json.hint ? `${json.error ?? 'That did not work.'} ${json.hint}` : (json.error ?? 'That did not work.'),
          kind: 'alert',
        });
        return { ok: false, data: json };
      }
      setFlash({ message: okMessage ?? json.message ?? 'Saved', kind: 'ok' });
      router.refresh();
      return { ok: true, data: json };
    } catch {
      setFlash({ message: 'Could not reach the desk.', kind: 'alert' });
      return { ok: false, data: { ok: false } };
    } finally {
      setBusy('');
    }
  }

  const { connections: c, environment: env } = data;
  const anyConnected = c.facebook.connected || c.linkedin.connected;

  return (
    <>
      <div className="title-row">
        <div>
          <p className="label">Settings</p>
          <h1 style={{ marginTop: 6 }}>Connections &amp; cadence</h1>
        </div>
      </div>

      {flash ? (
        <div className={`banner${flash.kind === 'alert' ? ' alert' : ''}`} style={{ marginTop: 14 }}>
          <div className="grow">{flash.message}</div>
          <button type="button" className="link" onClick={() => setFlash(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      {data.problems.map((problem) => (
        <div className="banner alert" key={problem} style={{ marginTop: 10 }}>
          {problem}
        </div>
      ))}

      {/* ── Connections ───────────────────────────────────────────────────── */}
      <section className="section">
        <div className="section-head">
          <h2>Connections</h2>
          <span className="muted small">
            Connect once — after this the buttons on the desk post straight to the real accounts.
          </span>
          <span className="grow" />
          <button
            type="button"
            className="btn sm ghost"
            disabled={busy === 'test' || !anyConnected}
            onClick={async () => {
              setBusy('test');
              setTests(null);
              try {
                const res = await fetch('/api/test', { method: 'POST' });
                const json = (await res.json()) as { ok: boolean; results?: TestResult[]; error?: string };
                if (!json.ok) setFlash({ message: json.error ?? 'Test failed.', kind: 'alert' });
                else setTests(json.results ?? []);
              } finally {
                setBusy('');
              }
            }}
          >
            {busy === 'test' ? 'Testing…' : 'Test connections'}
          </button>
        </div>

        <div className="panel" style={{ marginTop: 16 }}>
          <div className="conn-row">
            <div className="grow">
              <div className="name">Facebook Page</div>
              <div className="small muted">
                {c.facebook.connected
                  ? `Posting to “${c.facebook.pageName ?? c.facebook.pageId}”${
                      c.facebook.source === 'environment' ? ' (from environment variables)' : ''
                    }`
                  : 'Not connected.'}
              </div>
            </div>
            {c.facebook.connected && c.facebook.pages.length > 1 ? (
              <select
                value={c.facebook.pageId ?? ''}
                style={{ width: 220 }}
                onChange={(e) => send('/api/settings', { action: 'select-page', pageId: e.target.value }, 'page')}
              >
                {c.facebook.pages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.name}
                  </option>
                ))}
              </select>
            ) : null}
            {c.facebook.connected && c.facebook.source === 'settings' ? (
              <button
                type="button"
                className="btn sm ghost"
                disabled={busy === 'disconnect-meta'}
                onClick={() => send('/api/settings', { action: 'disconnect', provider: 'meta' }, 'disconnect-meta')}
              >
                Disconnect
              </button>
            ) : null}
            <a className="btn sm" href="/api/connect/meta">
              {c.facebook.connected ? 'Reconnect' : 'Connect'}
            </a>
          </div>

          <div className="conn-row">
            <div className="grow">
              <div className="name">Instagram</div>
              <div className="small muted">
                {c.instagram.connected
                  ? `Ready to publish${c.instagram.username ? ` as @${c.instagram.username}` : ''} — posts go through the Facebook Page above.`
                  : c.facebook.connected
                    ? 'No Instagram Business account is linked to that Page yet.'
                    : 'Connect the Facebook Page first.'}
              </div>
            </div>
            <span className={`pill ${c.instagram.connected ? 'solid' : 'plain'}`}>
              {c.instagram.connected ? 'connected' : 'not connected'}
            </span>
          </div>

          <div className="conn-row">
            <div className="grow">
              <div className="name">LinkedIn</div>
              <div className="small muted">
                {c.linkedin.connected
                  ? `Posting as ${c.linkedin.authorName ?? (c.linkedin.author === 'organization' ? 'your Page' : 'your profile')}${
                      c.linkedin.source === 'environment' ? ' (from environment variables)' : ''
                    }`
                  : 'Not connected.'}
              </div>
            </div>
            {c.linkedin.connected && (c.linkedin.orgs.length > 1 || (c.linkedin.hasPerson && c.linkedin.author !== 'person')) ? (
              <select
                value={c.linkedin.author === 'organization' ? c.linkedin.selectedOrgUrn : '__person'}
                style={{ width: 230 }}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '__person') {
                    send('/api/settings', { action: 'select-linkedin', author: 'person' }, 'li-author');
                  } else {
                    send('/api/settings', { action: 'select-linkedin', author: 'organization', orgUrn: value }, 'li-author');
                  }
                }}
              >
                {c.linkedin.orgs.map((org) => (
                  <option key={org.urn} value={org.urn}>
                    {org.name ?? org.urn}
                  </option>
                ))}
                {c.linkedin.hasPerson ? <option value="__person">Your personal profile</option> : null}
              </select>
            ) : null}
            {c.linkedin.connected && c.linkedin.source === 'settings' ? (
              <button
                type="button"
                className="btn sm ghost"
                disabled={busy === 'disconnect-li'}
                onClick={() => send('/api/settings', { action: 'disconnect', provider: 'linkedin' }, 'disconnect-li')}
              >
                Disconnect
              </button>
            ) : null}
            <a className="btn sm" href="/api/connect/linkedin">
              {c.linkedin.connected ? 'Reconnect' : 'Connect'}
            </a>
          </div>

          {!env.metaApp && !c.facebook.connected ? (
            <div className="banner" style={{ marginTop: 14 }}>
              <div className="grow">
                One-click connecting needs <code>META_APP_ID</code> and <code>META_APP_SECRET</code> from a
                Meta app. Without them you can still paste a Page token below.
              </div>
            </div>
          ) : null}
          {!env.linkedinApp && !c.linkedin.connected ? (
            <div className="banner" style={{ marginTop: 8 }}>
              <div className="grow">
                One-click connecting needs <code>LINKEDIN_CLIENT_ID</code> and <code>LINKEDIN_CLIENT_SECRET</code>.
                Without them you can still paste a token below.
              </div>
            </div>
          ) : null}

          <details className="manual">
            <summary
              onClick={() => setManualOpen(manualOpen === 'meta' ? null : 'meta')}
              role="button"
            >
              Paste a Facebook / Instagram token instead
            </summary>
            {manualOpen === 'meta' ? (
              <div>
                <div className="field">
                  <label htmlFor="m-page">Facebook Page ID</label>
                  <input
                    id="m-page"
                    value={manual.pageId}
                    placeholder="10223…"
                    onChange={(e) => setManual({ ...manual, pageId: e.target.value })}
                  />
                  <div className="hint">Leave blank and the desk will list the Pages your token can see.</div>
                </div>
                <div className="field">
                  <label htmlFor="m-token">Page or user access token</label>
                  <input
                    id="m-token"
                    type="password"
                    value={manual.pageToken}
                    placeholder="EAAG…"
                    onChange={(e) => setManual({ ...manual, pageToken: e.target.value })}
                  />
                  <div className="hint">
                    Needs pages_show_list, pages_manage_posts and instagram_content_publish. A long-lived token is
                    best; the desk asks Meta for the Page token itself.
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="m-ig">Instagram Business account ID (optional)</label>
                  <input
                    id="m-ig"
                    value={manual.igUserId}
                    placeholder="1784140…"
                    onChange={(e) => setManual({ ...manual, igUserId: e.target.value })}
                  />
                </div>
                <button
                  type="button"
                  className="btn sm"
                  disabled={busy === 'manual-meta' || !manual.pageToken}
                  onClick={() =>
                    send(
                      '/api/settings',
                      {
                        action: 'manual-meta',
                        pageId: manual.pageId,
                        pageToken: manual.pageToken,
                        igUserId: manual.igUserId,
                      },
                      'manual-meta',
                    )
                  }
                >
                  {busy === 'manual-meta' ? 'Checking…' : 'Connect with this token'}
                </button>
              </div>
            ) : null}
          </details>

          <details className="manual">
            <summary
              onClick={() => setManualOpen(manualOpen === 'linkedin' ? null : 'linkedin')}
              role="button"
            >
              Paste a LinkedIn token instead
            </summary>
            {manualOpen === 'linkedin' ? (
              <div>
                <div className="field">
                  <label htmlFor="l-token">LinkedIn access token</label>
                  <input
                    id="l-token"
                    type="password"
                    value={manual.liToken}
                    placeholder="AQV…"
                    onChange={(e) => setManual({ ...manual, liToken: e.target.value })}
                  />
                  <div className="hint">Needs w_organization_social (Page) or w_member_social (your profile).</div>
                </div>
                <div className="field">
                  <label htmlFor="l-org">Company Page URN (optional)</label>
                  <input
                    id="l-org"
                    value={manual.liOrg}
                    placeholder="urn:li:organization:12345678"
                    onChange={(e) => setManual({ ...manual, liOrg: e.target.value })}
                  />
                </div>
                <button
                  type="button"
                  className="btn sm"
                  disabled={busy === 'manual-linkedin' || !manual.liToken}
                  onClick={() =>
                    send(
                      '/api/settings',
                      { action: 'manual-linkedin', token: manual.liToken, orgUrn: manual.liOrg },
                      'manual-linkedin',
                    )
                  }
                >
                  {busy === 'manual-linkedin' ? 'Checking…' : 'Connect with this token'}
                </button>
              </div>
            ) : null}
          </details>
        </div>

        {tests ? (
          <div style={{ marginTop: 14 }}>
            {tests.map((test) => (
              <div className={`banner${test.ok ? '' : ' alert'}`} key={test.provider} style={{ marginBottom: 8 }}>
                <strong style={{ width: 90, display: 'inline-block' }}>
                  {test.provider === 'facebook' ? 'Facebook' : test.provider === 'instagram' ? 'Instagram' : 'LinkedIn'}
                </strong>
                <div className="grow">{test.detail}</div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* ── Cadence ───────────────────────────────────────────────────────── */}
      <section className="section">
        <div className="section-head">
          <h2>Cadence</h2>
          <span className="muted small">What the calendar does when you rebuild it.</span>
        </div>

        <div className="panel" style={{ marginTop: 16 }}>
          <div className="inline" style={{ marginBottom: 16 }}>
            <div className="field">
              <label htmlFor="perweek">Posts per week</label>
              <input
                id="perweek"
                type="number"
                min={1}
                max={7}
                value={schedule.perWeek}
                onChange={(e) => setSchedule({ ...schedule, perWeek: Number(e.target.value) })}
              />
            </div>
            <div className="field">
              <label htmlFor="time">Post time</label>
              <input
                id="time"
                type="time"
                style={{ width: 130 }}
                value={schedule.time}
                onChange={(e) => setSchedule({ ...schedule, time: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="reeltime">Reel time (Tue &amp; Fri)</label>
              <input
                id="reeltime"
                type="time"
                style={{ width: 130 }}
                value={schedule.reelTime}
                onChange={(e) => setSchedule({ ...schedule, reelTime: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="tz">Timezone</label>
              <select
                id="tz"
                style={{ width: 190 }}
                value={schedule.timezone}
                onChange={(e) => setSchedule({ ...schedule, timezone: e.target.value })}
              >
                {[...new Set([schedule.timezone, ...TIME_ZONES])].map((zone) => (
                  <option key={zone} value={zone}>
                    {zone.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label>Days that can carry a post</label>
            <div className="row-actions">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, index) => {
                const on = schedule.days.includes(index);
                return (
                  <button
                    key={label}
                    type="button"
                    className={`btn tiny${on ? ' solid' : ' ghost'}`}
                    onClick={() =>
                      setSchedule({
                        ...schedule,
                        days: on
                          ? schedule.days.filter((d) => d !== index)
                          : [...schedule.days, index].sort((a, b) => a - b),
                      })
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="hint">Weekdays only is the strategy: five posts a week, every week.</div>
          </div>

          <div className="field">
            <label>Pillar mix</label>
            <div className="hint" style={{ marginBottom: 10 }}>
              Higher weight means more of that pillar in the calendar. The planner balances it week by week.
            </div>
            {data.pillars.map((pillar) => (
              <div key={pillar.key} className="inline" style={{ alignItems: 'center', marginBottom: 6 }}>
                <span style={{ width: 160 }} className="small">
                  {pillar.label}
                </span>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={mix[pillar.key] ?? 0}
                  style={{ width: 220 }}
                  onChange={(e) => setMix({ ...mix, [pillar.key]: Number(e.target.value) })}
                />
                <span className="mono num" style={{ width: 24, textAlign: 'right' }}>
                  {mix[pillar.key] ?? 0}
                </span>
                <span className="small faint">{pillar.count} written</span>
              </div>
            ))}
          </div>

          <div className="field">
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={schedule.autoPublish}
                onChange={(e) => setSchedule({ ...schedule, autoPublish: e.target.checked })}
              />
              Publish automatically when a post comes due
            </label>
            <div className="hint">
              Uses the daily cron at 09:00 UTC. {env.cronSecret ? 'CRON_SECRET is set.' : 'Set CRON_SECRET to enable it.'}{' '}
              Leave this off if you would rather press the buttons yourself — nothing publishes twice either way.
            </div>
          </div>

          <div className="row-actions" style={{ marginTop: 18 }}>
            <button
              type="button"
              className="btn solid"
              disabled={busy === 'schedule'}
              onClick={() =>
                send(
                  '/api/settings',
                  {
                    action: 'schedule',
                    config: {
                      perWeek: schedule.perWeek,
                      days: schedule.days,
                      time: schedule.time,
                      reelTime: schedule.reelTime,
                      timezone: schedule.timezone,
                      autoPublish: schedule.autoPublish,
                      mix,
                    },
                  },
                  'schedule',
                  'Cadence saved. Press “Rebuild the calendar” to lay it out again.',
                )
              }
            >
              {busy === 'schedule' ? 'Saving…' : 'Save cadence'}
            </button>
            <button
              type="button"
              className="btn ghost"
              disabled={busy === 'rebuild'}
              onClick={async () => {
                const result = await send(
                  '/api/desk',
                  { action: 'rebuild' },
                  'rebuild',
                  'Calendar rebuilt from today.',
                );
                if (result.ok) router.refresh();
              }}
            >
              {busy === 'rebuild' ? 'Rebuilding…' : 'Rebuild the calendar'}
            </button>
            <span className="small muted">
              {data.counts.scheduled} queued · {data.counts.posted} posted of {data.counts.total}
            </span>
          </div>
          <p className="small faint" style={{ marginTop: 10 }}>
            Rebuilding keeps everything you have already posted and re-lays the rest from today.
          </p>
        </div>
      </section>

      {/* ── Storage & access ─────────────────────────────────────────────── */}
      <section className="section">
        <div className="section-head">
          <h2>Storage &amp; access</h2>
        </div>
        <div className="grid-2" style={{ marginTop: 16 }}>
          <div className="panel">
            <div className="panel-head">
              <h3 className="grow">Where the desk keeps its state</h3>
              <span className={`pill ${data.store.persistent ? 'solid' : 'alert'}`}>
                {data.store.persistent ? 'saved' : 'not saved'}
              </span>
            </div>
            <p className="small muted">
              <strong>{data.store.label}</strong> — {data.store.hint}
            </p>
          </div>
          <div className="panel">
            <div className="panel-head">
              <h3 className="grow">Secrets</h3>
            </div>
            <div className="kv">
              <dt>DESK_PASSWORD</dt>
              <dd>{env.deskPassword ? 'set — the desk asks for it' : 'not set'}</dd>
              <dt>DESK_SECRET</dt>
              <dd>
                {env.deskSecret
                  ? 'set — access tokens are encrypted at rest'
                  : 'not set — tokens are stored unencrypted in your database'}
              </dd>
              <dt>CRON_SECRET</dt>
              <dd>{env.cronSecret ? 'set — the cron endpoint is protected' : 'not set — auto-publishing is off'}</dd>
              <dt>PUBLIC_BASE_URL</dt>
              <dd>{env.publicBaseUrl ? data.origin : 'automatic (Vercel production domain)'}</dd>
            </div>
          </div>
        </div>

        <div className="panel" style={{ marginTop: 16 }}>
          <div className="panel-head">
            <h3 className="grow">Redirect URIs to register in the Meta and LinkedIn apps</h3>
          </div>
          <pre className="code">{`${data.origin}/api/connect/callback/meta
${data.origin}/api/connect/callback/linkedin`}</pre>
          <p className="small faint" style={{ marginTop: 8 }}>
            They must match exactly, including the domain and https.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>The daily loop</h2>
        </div>
        <div className="panel" style={{ marginTop: 16 }}>
          <ol className="lede" style={{ paddingLeft: 20, margin: 0 }}>
            <li>Open the desk. Today&apos;s post is at the top with its finished image and captions.</li>
            <li>
              Press <strong>Post to all</strong>, or a single platform. The image and the right caption for that
              platform go out — the caption is already written per platform.
            </li>
            <li>
              If Meta or LinkedIn objects, the exact reason appears under the post. Fix it and press again: nothing
              is ever posted twice.
            </li>
            <li>
              Edit any caption in <strong>Details</strong> — your version is kept and used from then on.
            </li>
          </ol>
        </div>
      </section>
    </>
  );
}
