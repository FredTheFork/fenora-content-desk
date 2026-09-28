/* Fenora Content Desk — app logic.
 *
 * The whole product in one sentence: write it once, click to post.
 * Everything on the Today screen exists to make that one flow effortless;
 * the Calendar, Library and Settings exist to prepare it.
 *
 * The desk ships EMPTY. content/posts.json holds the frame — pillars,
 * hashtag sets, the caption banner — and no posts. You add content either
 * here (Library → + New post) or in bulk from a content/posts_*.py part
 * file. Nothing is scheduled until you schedule it.
 *
 * Two kinds of post:
 *   library posts  — compiled from content/posts_*.py, read-only here;
 *   your posts     — written in the dashboard, kept in S.custom.
 * Both take their edits (hook, body, date, ticks) from the same schedule
 * object, so the composer, planner and publishers never need to tell them
 * apart.
 *
 * State lives in the browser (localStorage) and is mirrored to
 * content/schedule.json when the local server is running. Boot reads it
 * back through /api/load — an endpoint that exists both locally and on
 * Vercel — so the request never 404s. On Vercel the browser copy is
 * authoritative — use Settings → Backup to move it.
 */
(() => {
'use strict';

/* ══════════════ helpers ══════════════ */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
const PLAT_LABEL = { IG:'Instagram', FB:'Facebook', LI:'LinkedIn' };
const PFMT = { static:'Static', reel:'Reel', carousel:'Carousel', poll:'Poll', quiz:'Quiz', story:'Story', text:'Long-form' };

/* Dates are compared as local YYYY-MM-DD strings. Never use toISOString()
   here — it speaks UTC and quietly shifts the date near midnight. */
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
const parseISO = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };

let toastT;
const toast = (m, k='') => { const t=$('#toast'); t.textContent=m; t.className='toast on '+k;
  clearTimeout(toastT); toastT=setTimeout(()=>t.className='toast', 3200); };

const copy = async (txt, msg) => {
  try { await navigator.clipboard.writeText(txt); toast(msg||'Copied','ok'); }
  catch {
    const a=document.createElement('textarea'); a.value=txt; a.style.position='fixed'; a.style.opacity='0';
    document.body.appendChild(a); a.select();
    try { document.execCommand('copy'); toast(msg||'Copied','ok'); }
    catch { toast('Copy failed — select the text and copy manually','err'); }
    a.remove();
  }
};

/* ══════════════ state ══════════════ */
/* v3: the pre-written library was scrapped, so the schedule starts from a
   genuinely blank slate rather than inheriting 251 stale entries. */
const LS     = 'fenora.desk.v3';      // the schedule
const LCUS   = 'fenora.posts.v1';     // posts written in the dashboard
const LSET   = 'fenora.settings.v1';  // cadence + pillar mix

const DEFAULT_SETTINGS = {
  times: ['08:00', '18:30'],
  mix: { 'trade-pain':9, 'nerd-detail':8, 'customer-reality':6, 'planning':5, 'money':4,
         'contrarian':7, 'wip':3, 'build-in-public':2, 'team':2 },
};

const S = {
  lib: { pillars: [], tagsets: {}, discovery: [], posts: [] },
  posts: [],
  custom: [],            // posts written in the dashboard
  sched: {},
  settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
  cfg: { configured: {}, defaults: {}, persistent: true },
  filters: { q:'', pillar:'', format:'', status:'', series:'' },
  vaultTab: 'banter',
  stratTab: 'positioning',
  banterIdx: 0,
  carouselSlide: 0,
  carouselPostId: 'CAR-01',
  composerMode: 'raw',
  day: 0,                    // selected index in the 7-day strip
  calY: today().getFullYear(), calM: today().getMonth(),
};

const find = id => S.posts.find(x => x.id === id);
const isCustom = id => S.custom.some(x => x.id === id);
const pillarLabel = k => (S.lib.pillars.find(p => p.key === k) || {}).label || k;
const sched = id => S.sched[id] || (S.sched[id] = { date:'', time:'', posted:{}, caps:{} });
const platsOf = (p, s) => (s.platforms && s.platforms.length ? s.platforms
  : String(p.platforms || 'IG').split(',').map(x => x.trim()).filter(Boolean));
const field = (p, s, k) => (s[k] !== undefined && s[k] !== null) ? s[k] : (p[k] ?? '');
const isPosted = (p, s, k) => Boolean(s.posted && s.posted[k]);
const isFullyPosted = p => { const s = sched(p.id); return platsOf(p, s).every(k => isPosted(p, s, k)); };
const stOf = p => isFullyPosted(p) ? 'posted' : sched(p.id).date ? 'scheduled' : 'draft';

/* ══════════════ persistence ══════════════ */
let saveT;
const saveState = (txt, cls='') => { const e = $('#save-state'); if (e) { e.textContent = txt; e.className = cls; } };

function save() {
  clearTimeout(saveT);
  saveState('Saving…', 'saving');
  saveT = setTimeout(() => {
    try {
      localStorage.setItem(LS, JSON.stringify(S.sched));
      localStorage.setItem(LCUS, JSON.stringify(S.custom));
    } catch {}
    saveState('Saved ✓', 'saved');
    fetch('/api/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posts: S.sched, custom: S.custom, saved: new Date().toISOString() }),
    }).then(r => r.ok ? r.json() : null)
      .then(j => saveState(j && j.persistent === false ? 'Saved on this device ✓' : 'Saved ✓', 'saved'))
      .catch(() => saveState('Saved on this device ✓', 'saved'));
    setTimeout(() => saveState(''), 4000);
  }, 350);
}

function saveSettings() {
  try { localStorage.setItem(LSET, JSON.stringify(S.settings)); } catch {}
}

/* Old schedules stored status:'posted' before per-platform ticks existed. */
function migrate() {
  for (const p of S.posts) {
    const s = S.sched[p.id];
    if (!s) continue;
    if (!s.posted || typeof s.posted !== 'object') s.posted = {};
    if (s.status === 'posted' && !Object.keys(s.posted).length) {
      platsOf(p, s).forEach(k => s.posted[k] = true);
    }
  }
  pruneOrphans();
  const raw = localStorage.getItem(LSET);
  if (raw) {
    try {
      const st = JSON.parse(raw);
      S.settings.times = Array.isArray(st.times) && st.times.length ? st.times.slice(0, 6) : S.settings.times;
      S.settings.mix = { ...S.settings.mix, ...(st.mix || {}) };
    } catch {}
  }
  if (!S.settings.times.length) S.settings.times = ['08:00', '18:30'];
}

/* Drop schedule entries for posts that no longer exist — a scrapped library,
   a deleted post, a backup from another machine. Without this the calendar
   would keep counting ghosts as "scheduled". */
function pruneOrphans() {
  const known = new Set(S.posts.map(p => p.id));
  let n = 0;
  for (const id of Object.keys(S.sched)) {
    if (!known.has(id)) { delete S.sched[id]; n++; }
  }
  return n;
}

/* ══════════════ captions ══════════════ */
const Cap = window.FenoraCaptions;

function capFields(p, s) {
  return {
    id: p.id, format: p.format,
    hook: field(p, s, 'hook'), body: field(p, s, 'body'),
    cta: field(p, s, 'cta'), cta_fb: field(p, s, 'cta_fb') || field(p, s, 'cta'),
    // s.liLead wins when set — the composer writes it on every keystroke.
    li_lead: s.liLead || p.li_lead || '',
    tagset: p.tagset,
  };
}
function captionFor(p, s, plat) {
  if (s.caps && s.caps[plat]) return s.caps[plat];
  const f = capFields(p, s);
  try {
    if (plat === 'IG') return Cap.buildIG(f, { tags: true, tagsets: S.lib.tagsets, discovery: S.lib.discovery });
    if (plat === 'FB') return Cap.buildFB(f);
    return Cap.buildLI(f);
  } catch { return p['caption_' + plat.toLowerCase()] || ''; }
}

/* ══════════════ boot ══════════════ */
(async function boot() {
  try {
    S.lib = await (await fetch('/content/posts.json')).json();
    S.posts = S.lib.posts || [];
  } catch {
    document.body.innerHTML = '<div class="empty" style="margin:80px auto;max-width:480px"><h2>Could not load the content library</h2><p>Make sure <code>content/posts.json</code> exists — run <code>cd content &amp;&amp; python3 build.py</code>.</p></div>';
    return;
  }
  let server = {};
  try {
    const r = await fetch('/api/load');
    if (r.ok) server = await r.json();
  } catch {}
  S.sched = { ...(server.posts || {}), ...readLS(LS, {}) };
  /* Posts written in the dashboard. The browser copy wins — on Vercel it is
     the only copy there is. */
  const byId = new Map((server.custom || []).map(p => [p.id, p]));
  readLS(LCUS, []).forEach(p => byId.set(p.id, p));
  S.custom = [...byId.values()].filter(p => p && p.id);
  S.custom.forEach(p => { p.custom = true; if (!find(p.id)) S.posts.push(p); });

  migrate();

  $('#f-pillar').innerHTML = '<option value="">All pillars</option>' +
    S.lib.pillars.map(p => `<option value="${p.key}">${esc(p.label)}</option>`).join('');
  $('#f-format').innerHTML = '<option value="">All formats</option>' +
    Object.entries(PFMT).map(([k,v]) => `<option value="${k}">${v}</option>`).join('');

  const seriesSet = [...new Set(S.posts.map(p => p.series).filter(Boolean))].sort();
  const fSeries = $('#f-series');
  if (fSeries) {
    fSeries.innerHTML = '<option value="">All series</option>' +
      seriesSet.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
    fSeries.onchange = e => { S.filters.series = e.target.value; renderLib(); };
  }

  renderMix();
  loadCfg();
  initVaultEvents();
  initStrategyEvents();
  renderAll();
})();

function readLS(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function renderAll() { renderToday(); drawCal(); renderLib(); renderVault(); renderStrategy(); }

/* ══════════════ tabs ══════════════ */
function tab(n) {
  $$('.tab').forEach(t => t.classList.remove('on'));
  $('#tab-' + n).classList.add('on');
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === n));
  if (n === 'today') renderToday();
  if (n === 'library') renderLib();
  if (n === 'calendar') drawCal();
  if (n === 'vault') renderVault();
  if (n === 'strategy') renderStrategy();
}
$('#tabs').onclick = e => { const b = e.target.closest('button'); if (b) tab(b.dataset.tab); };
$('#brand').onclick = e => { e.preventDefault(); tab('today'); };

/* ══════════════ scheduler ══════════════ */
/* Smooth weighted round-robin: a pillar with weight 2 shows up twice as
   often as one with weight 1, evenly spread — never three of a row. */
function swrrSeq(weights, n) {
  const keys = Object.keys(weights).filter(k => weights[k] > 0);
  if (!keys.length) return [];
  const total = keys.reduce((a, k) => a + weights[k], 0);
  const cur = {}; keys.forEach(k => cur[k] = 0);
  const out = [];
  for (let i = 0; i < n; i++) {
    let best = null, bestV = -Infinity;
    for (const k of keys) { cur[k] += weights[k]; if (cur[k] > bestV) { bestV = cur[k]; best = k; } }
    cur[best] -= total; out.push(best);
  }
  return out;
}

function planDates(dates) {
  const times = S.settings.times.length ? S.settings.times : ['08:00', '18:30'];
  const pool = S.posts.filter(p => stOf(p) === 'draft');
  if (!pool.length) return 0;

  const byPillar = {};
  pool.forEach(p => (byPillar[p.pillar] = byPillar[p.pillar] || []).push(p));
  const weights = {};
  for (const pl of S.lib.pillars) {
    if (byPillar[pl.key] && byPillar[pl.key].length) {
      weights[pl.key] = Math.max(1, S.settings.mix[pl.key] ?? 1);
    }
  }
  const seq = swrrSeq(weights, dates.length * times.length + 64);
  const used = new Set(S.posts.filter(p => stOf(p) !== 'draft').map(p => p.id));
  let cursor = 0, placed = 0;

  for (const ds of dates) {
    for (let t = 0; t < times.length; t++) {
      const time = times[t];
      const dayPosts = () => S.posts.filter(p => sched(p.id).date === ds);
      if (dayPosts().some(p => (sched(p.id).time || '') === time)) continue;   // slot already filled
      const avoid = new Set(dayPosts().map(p => p.pillar));                    // no pillar twice a day

      let pick = null;
      for (let k = 0; k < seq.length && !pick; k++) {
        const pil = seq[(cursor + k) % seq.length];
        if (avoid.has(pil)) continue;
        const cand = (byPillar[pil] || []).filter(p => !used.has(p.id));
        if (!cand.length) continue;
        // Later slots lean towards the formats made for the evening scroll.
        pick = (t > 0)
          ? (cand.find(p => ['reel', 'carousel', 'story'].includes(p.format)) || cand[0])
          : cand[0];
        cursor = (cursor + k + 1) % Math.max(seq.length, 1);
      }
      if (!pick) {
        pick = pool.find(p => !used.has(p.id) && !avoid.has(p.pillar));
      }
      if (!pick) break;   // library exhausted for this day

      const s = sched(pick.id);
      s.date = ds; s.time = time;
      if (s.status !== 'posted') s.status = 'scheduled';
      used.add(pick.id); placed++;
    }
  }
  if (placed) save();
  return placed;
}

function planDays(nDays) {
  const start = today();
  const dates = Array.from({ length: nDays }, (_, i) => iso(addDays(start, i)));
  const placed = planDates(dates);
  renderAll();
  return placed;
}

function fillDay(ds) {
  const placed = planDates([ds]);
  renderAll();
  toast(placed ? `${placed} post${placed>1?'s':''} added to ${ds}` : 'Nothing left to add — or that day is full', placed ? 'ok' : '');
  return placed;
}

function unplan(id) {
  const s = sched(id);
  s.date = ''; s.status = 'draft'; s.time = '';
  save(); renderAll();
  toast(`${id} moved back to the library`, 'ok');
}

function streak() {
  let n = 0;
  for (let i = 0; i < 400; i++) {
    const ds = iso(addDays(today(), -i));
    const posts = S.posts.filter(p => sched(p.id).date === ds);
    if (!posts.length) { if (i > 0) break; continue; }
    if (posts.every(isFullyPosted)) n++;
    else if (i > 0) break;
  }
  return n;
}

/* ══════════════ TODAY ══════════════ */
function postsOn(ds) {
  return S.posts
    .filter(p => sched(p.id).date === ds)
    .sort((a, b) => (sched(a.id).time || '').localeCompare(sched(b.id).time || ''));
}

function renderToday() {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today(), i));
  if (S.day > 6) S.day = 0;
  const d = days[S.day];
  const ds = iso(d);

  /* week strip */
  $('#t-strip').innerHTML = days.map((x, i) => {
    const posts = postsOn(iso(x));
    const late = iso(x) < iso(today()) && posts.length && !posts.every(isFullyPosted);
    const dots = posts.length
      ? posts.flatMap(p => {
          const s = sched(p.id);
          if (isFullyPosted(p)) return ['<i class="dn"></i>'];
          return platsOf(p, s).map(k => `<i style="background:${{IG:'#e1306c',FB:'#1877f2',LI:'#0a66c2'}[k] || '#2a2f39'}"></i>`);
        }).slice(0, 5).join('')
      : '<i style="background:#2a2f39"></i>';
    return `<button data-d="${i}" class="${i === S.day ? 'on' : ''}${late ? ' late' : ''}">
      <small>${x.toLocaleDateString('en-GB', { weekday: 'short' })}</small><b>${x.getDate()}</b>
      <div class="dotrow">${dots}</div></button>`;
  }).join('');

  const dayPosts = postsOn(ds);
  const done = dayPosts.filter(isFullyPosted).length;
  const st = streak();
  $('#t-plan').hidden = !S.posts.length;
  $('#t-new').hidden = Boolean(S.posts.length);
  $('#t-date').textContent = S.day === 0
    ? `Today — ${d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`
    : d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  $('#t-sum').innerHTML = !S.posts.length
    ? 'The desk is empty — nothing written, nothing scheduled.'
    : dayPosts.length
    ? `${dayPosts.length} post${dayPosts.length > 1 ? 's' : ''} · ${done} done${done === dayPosts.length && dayPosts.length ? ' · all green ✓' : ''}` +
      (st > 1 ? ` · <span title="consecutive days with everything posted">🔥 ${st}-day streak</span>` : '')
    : `Nothing planned for this day yet.`;

  $('#t-posts').innerHTML = dayPosts.length
    ? dayPosts.map(p => todayCard(p)).join('')
    : S.posts.length
    ? `<div class="empty">
         <h2>Nothing planned for ${S.day === 0 ? 'today' : d.toLocaleDateString('en-GB', { weekday: 'long' })}</h2>
         <p>Press <b>⚡ Plan this week</b> and the next seven days are ready to post.</p>
         <button class="btn" data-plan>⚡ Plan this week</button>
       </div>`
    : `<div class="empty">
         <h2>Nothing here yet</h2>
         <p>The desk ships empty. Write your first post, schedule it, then copy the
            caption or publish it straight to Instagram, Facebook and LinkedIn.</p>
         <button class="btn" data-new>＋ New post</button>
         <p class="muted small" style="margin-top:14px">Got a pile of copy already? Drop it in
            <code>content/posts_*.py</code> and run <code>python3 build.py</code> to import it in bulk.</p>
       </div>`;
}

function todayCard(p) {
  const s = sched(p.id);
  const plats = platsOf(p, s);
  const allDone = isFullyPosted(p);
  const slot = (s.time || '').slice(0, 5);

  return `<article class="tpost${allDone ? ' all-done' : ''}" data-id="${p.id}">
    <div class="tp-body">
      <div class="tp-meta">
        ${slot ? `<span class="pill slot-pill">${slot}</span>` : ''}
        <span class="pill">${esc(p.pillar_label || pillarLabel(p.pillar))}</span>
        <span class="pill">${PFMT[p.format] || esc(p.format)}</span>
        <span class="pill id">${esc(p.id)}</span>
      </div>
      <h2>${esc(field(p, s, 'hook')) || '<span class="muted">No hook yet — open it and write one</span>'}</h2>
      <div class="tp-rows">
        ${plats.map(k => {
          const posted = isPosted(p, s, k);
          const canApi = S.cfg.configured && S.cfg.configured[k === 'IG' ? 'instagram' : k === 'FB' ? 'facebook' : 'linkedin'];
          return `<div class="pt-row${posted ? ' done' : ''}">
            <span class="pt-name"><i class="dot ${k}"></i>${PLAT_LABEL[k] || k}</span>
            <button class="btn sm${posted ? ' ghost' : ''}" data-copy="${k}">📋 Copy caption</button>
            ${canApi ? `<button class="btn ghost sm" data-now="${k}">Post now</button>` : ''}
            <a class="btn ghost sm" href="${k === 'IG' ? 'https://www.instagram.com/' : k === 'FB' ? 'https://www.facebook.com/' : 'https://www.linkedin.com/feed/'}" target="_blank" rel="noopener">Open ${PLAT_LABEL[k] || k}</a>
            <button class="pt-check${posted ? ' on' : ''}" data-post="${k}">${posted ? '✓ Posted' : 'Posted?'}</button>
          </div>`;
        }).join('')}
      </div>
      ${allDone ? `<div class="tp-done-flag">🎉 Done — ${plats.length} platform${plats.length > 1 ? 's' : ''} posted</div>` : ''}
      <details class="tp-caps"><summary>Show the captions</summary>
        ${plats.map(k => `<div class="pill" style="margin:10px 0 0">${PLAT_LABEL[k] || k}</div>
          <pre>${esc(captionFor(p, s, k))}</pre>`).join('')}
      </details>
      <div class="tp-foot">
        <button class="btn ghost sm" data-edit="${p.id}">Edit</button>
        <button class="btn ghost sm" data-unplan="${p.id}">Unplan</button>
      </div>
    </div>
  </article>`;
}

/* one click = the right caption for that platform on the clipboard */
async function copyCaption(id, plat) {
  const p = find(id), s = sched(id);
  if (!p) return;
  await copy(captionFor(p, s, plat), `${PLAT_LABEL[plat]} caption copied ✓`);
}

function togglePosted(id, plat) {
  const p = find(id), s = sched(id);
  if (!p) return;
  s.posted = s.posted || {};
  s.posted[plat] = !s.posted[plat];
  const plats = platsOf(p, s);
  s.status = plats.every(k => s.posted[k]) ? 'posted' : (s.date ? 'scheduled' : 'draft');
  save(); renderAll();
  if (s.status === 'posted') toast('All posted. See you tomorrow 🎉', 'ok');
}

$('#t-strip').onclick = e => {
  const b = e.target.closest('button[data-d]');
  if (b) { S.day = +b.dataset.d; renderToday(); }
};
$('#t-plan').onclick = () => planAndReport(7);
$('#t-new').onclick = () => newPost();
$('#t-posts').addEventListener('click', e => {
  const copyBtn = e.target.closest('[data-copy]');
  if (copyBtn) return copyCaption(copyBtn.closest('.tpost').dataset.id, copyBtn.dataset.copy);
  const postBtn = e.target.closest('[data-post]');
  if (postBtn) return togglePosted(postBtn.closest('.tpost').dataset.id, postBtn.dataset.post);
  const now = e.target.closest('[data-now]');
  if (now) return postNow(now.closest('.tpost').dataset.id, now.dataset.now);
  const ed = e.target.closest('[data-edit]');
  if (ed) return openPost(ed.dataset.edit);
  const up = e.target.closest('[data-unplan]');
  if (up) return unplan(up.dataset.unplan);
  if (e.target.closest('[data-plan]')) return planAndReport(7);
  if (e.target.closest('[data-new]')) return newPost();
});

function planAndReport(n) {
  if (!S.posts.length) {
    toast('The library is empty — write your first post', 'err');
    tab('library');
    return 0;
  }
  const placed = planDays(n);
  if (placed) {
    S.day = 0;
    renderAll();
    toast(`${placed} posts planned — ${n === 7 ? 'your week' : `the next ${n} days`} is ready ⚡`, 'ok');
  } else {
    toast('Nothing left in the library to plan', 'err');
  }
  return placed;
}

/* ══════════════ CALENDAR ══════════════ */
$('#cal-prev').onclick = () => { S.calM--; if (S.calM < 0) { S.calM = 11; S.calY--; } drawCal(); };
$('#cal-next').onclick = () => { S.calM++; if (S.calM > 11) { S.calM = 0; S.calY++; } drawCal(); };
$('#cal-week').onclick = () => planAndReport(7);
$('#cal-30').onclick = () => planAndReport(30);
$('#cal-90').onclick = () => planAndReport(90);

function drawCal() {
  const first = new Date(S.calY, S.calM, 1);
  const start = (first.getDay() + 6) % 7;
  const startD = new Date(S.calY, S.calM, 1 - start);
  $('#cal-title').textContent = first.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
  $('#cal-dow').innerHTML = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x => `<div>${x}</div>`).join('');
  $('#cal-grid').innerHTML = Array.from({ length: 42 }, (_, i) => {
    const d = addDays(startD, i), ds = iso(d);
    const posts = postsOn(ds);
    const late = ds < iso(today()) && posts.length && !posts.every(isFullyPosted);
    return `<div class="day${d.getMonth() !== S.calM ? ' out' : ''}${ds === iso(today()) ? ' today' : ''}${late ? ' late' : ''}" data-d="${ds}">
      <div class="dn">${d.getDate()}</div>
      ${posts.map(p => {
        const s = sched(p.id);
        return `<div class="ev${isFullyPosted(p) ? ' posted' : ''}" data-id="${p.id}" draggable="true">
          <div class="t">${esc(s.time || '')}</div>
          <div class="h">${esc(field(p, s, 'hook'))}</div>
        </div>`;
      }).join('')}
    </div>`;
  }).join('');
}

$('#cal-grid').addEventListener('click', e => {
  const ev = e.target.closest('.ev');
  if (ev) { e.stopPropagation(); return openPost(ev.dataset.id); }
  const d = e.target.closest('.day');
  if (d) fillDay(d.dataset.d);
});
$('#cal-grid').addEventListener('dragover', e => {
  const d = e.target.closest('.day');
  if (d) { e.preventDefault(); d.classList.add('dragover'); }
});
$('#cal-grid').addEventListener('dragleave', e => {
  const d = e.target.closest('.day'); if (d) d.classList.remove('dragover');
});
$('#cal-grid').addEventListener('drop', e => {
  e.preventDefault();
  const d = e.target.closest('.day'); if (!d) return;
  d.classList.remove('dragover');
  const id = e.dataTransfer.getData('text/plain'), s = sched(id);
  if (!find(id)) return;
  s.date = d.dataset.d;
  s.time = s.time || S.settings.times[0] || '08:00';
  if (s.status !== 'posted') s.status = 'scheduled';
  save(); renderAll();
  toast(`${id} → ${d.dataset.d}`, 'ok');
});

/* ══════════════ LIBRARY ══════════════ */
$('#q').oninput = e => { S.filters.q = e.target.value; renderLib(); };
$('#f-pillar').onchange = e => { S.filters.pillar = e.target.value; renderLib(); };
$('#f-format').onchange = e => { S.filters.format = e.target.value; renderLib(); };
$('#f-status').onchange = e => { S.filters.status = e.target.value; renderLib(); };
$('#lib-newpost').onclick = () => newPost();

function renderLib() {
  const f = S.filters, q = f.q.toLowerCase();
  const list = S.posts.filter(p => {
    if (f.series && (p.series || '') !== f.series) return false;
    if (f.pillar && p.pillar !== f.pillar) return false;
    if (f.format && p.format !== f.format) return false;
    if (f.status && stOf(p) !== f.status) return false;
    if (q && !(field(p, sched(p.id), 'hook') + ' ' + field(p, sched(p.id), 'body') + ' ' + (p.series || '') + ' ' + p.id).toLowerCase().includes(q)) return false;
    return true;
  });
  $('#lib-count').textContent = S.posts.length
    ? `${list.length} of ${S.posts.length} post${S.posts.length > 1 ? 's' : ''}`
    : 'Empty desk';
  $('#lib').innerHTML = list.map(p => {
    const s = sched(p.id), st = stOf(p);
    const hook = field(p, s, 'hook');
    return `<article class="pcard" data-id="${p.id}" draggable="true" tabindex="0">
      <div class="thumb">
        <div class="th-top">
          <span class="pill id">${esc(p.id)}</span>
          ${p.series ? `<span class="pill" style="background:#222;color:#5b9cff;border-color:#333">${esc(p.series)}</span>` : ''}
          ${isCustom(p.id) ? '<span class="pill mine">yours</span>' : ''}
        </div>
        <div class="ph">${esc(hook) || '<span class="muted">Untitled post</span>'}</div>
      </div>
      <div class="foot">
        <span class="pill">${esc(p.pillar_label || pillarLabel(p.pillar))}</span>
        <span class="pill">${PFMT[p.format] || esc(p.format)}</span>
        <span class="pill ${st}">${st === 'draft' ? 'unscheduled' : st === 'posted' ? 'posted' : esc(s.date.slice(5))}</span>
        <div class="dots">${platsOf(p, s).map(x => `<i class="${x}"></i>`).join('')}</div>
      </div>
    </article>`;
  }).join('') || (S.posts.length
    ? '<div class="empty">Nothing matches those filters.</div>'
    : `<div class="empty">
         <h2>No posts yet</h2>
         <p>Everything you write lives here — searchable, filterable, draggable onto the calendar.</p>
         <button class="btn" id="lib-new">＋ New post</button>
       </div>`);
  const nb = $('#lib-new');
  if (nb) nb.onclick = () => newPost();
}

/* ══════════════ writing posts ══════════════ */
/* Posts written here are yours: they live in S.custom, are saved to
   localStorage and mirrored into content/schedule.json, and can be edited or
   deleted at any time. Library posts (content/posts.json) stay read-only —
   they are compiled from Python and rebuilt from source. */
function nextCustomId() {
  const used = new Set(S.posts.map(p => p.id));
  let n = S.custom.length + 1;
  while (used.has(`C-${String(n).padStart(2, '0')}`)) n++;
  return `C-${String(n).padStart(2, '0')}`;
}

function newPost() {
  const pillar = (S.lib.pillars[0] || {}).key || 'trade-pain';
  const p = {
    id: nextCustomId(), pillar, pillar_label: pillarLabel(pillar),
    format: 'static', series: '', hook: '', body: '', cta: '', cta_fb: '', li_lead: '',
    image_prompt: '', image_style: '', aspect: '4:5',
    platforms: 'IG,FB,LI', tagset: 'core', custom: true,
  };
  S.custom.push(p);
  S.posts.push(p);
  save();
  renderAll();
  openPost(p.id);
  setTimeout(() => { const h = $('#c-hook'); if (h) h.focus(); }, 60);
  toast('New post — write the hook, then give it a date', 'ok');
}

function deletePost(id) {
  if (!isCustom(id)) return;
  const p = find(id);
  if (!confirm(`Delete ${id}${p && field(p, sched(id), 'hook') ? ' — “' + field(p, sched(id), 'hook').slice(0, 60) + '”' : ''}?\n\nThis cannot be undone.`)) return;
  S.custom = S.custom.filter(x => x.id !== id);
  S.posts = S.posts.filter(x => x.id !== id);
  S.lib.posts = S.posts.filter(x => !x.custom);
  delete S.sched[id];
  if (CUR === id) { CUR = null; $('#drawer').hidden = true; }
  save();
  renderAll();
  toast(`${id} deleted`, 'ok');
}

$('#lib').addEventListener('click', e => {
  const c = e.target.closest('.pcard'); if (c) openPost(c.dataset.id);
});
$('#lib').addEventListener('keydown', e => {
  const c = e.target.closest('.pcard');
  if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openPost(c.dataset.id); }
});
$('#lib').addEventListener('dragstart', e => {
  const c = e.target.closest('.pcard');
  if (c) e.dataTransfer.setData('text/plain', c.dataset.id);
});

/* ══════════════ COMPOSER ══════════════ */
let CUR = null, capPlat = 'IG';

function openPost(id) {
  const p = find(id); if (!p) return;
  CUR = id;
  const s = sched(id);
  const mine = isCustom(id);
  $('#c-id').textContent = p.id;
  $('#c-kind').textContent = mine ? 'your post' : 'library post';
  $('#c-kind').className = 'pill' + (mine ? ' mine' : '');
  $('#c-pillar-sel').innerHTML = S.lib.pillars.map(pl =>
    `<option value="${pl.key}"${pl.key === p.pillar ? ' selected' : ''}>${esc(pl.label)}</option>`).join('');
  const fmts = Object.entries(PFMT);
  if (p.format && !fmts.some(([k]) => k === p.format)) fmts.push([p.format, p.format]);
  $('#c-format-sel').innerHTML = fmts.map(([k, v]) =>
    `<option value="${k}"${k === p.format ? ' selected' : ''}>${esc(v)}</option>`).join('');
  $('#c-pillar-sel').disabled = !mine;
  $('#c-format-sel').disabled = !mine;
  $('#lib-note').hidden = mine;
  $('#c-danger').hidden = !mine;
  $('#c-hook').value = field(p, s, 'hook');
  $('#c-body').value = field(p, s, 'body');
  $('#c-cta').value = field(p, s, 'cta');
  $('#c-lilead').value = s.liLead || p.li_lead || '';
  $('#c-prompt').value = s.imgPrompt || p.image_prompt || '';
  $('#c-imgurl').value = s.imgurl || '';
  $('#c-time').value = s.time || S.settings.times[0] || '08:00';
  $('#c-platforms').innerHTML = ['IG','FB','LI'].map(k =>
    `<span class="chip${platsOf(p, s).includes(k) ? ' on' : ''}" data-p="${k}">${PLAT_LABEL[k]}</span>`).join('');
  capPlat = platsOf(p, s).includes(capPlat) ? capPlat : (platsOf(p, s)[0] || 'IG');
  $('#cap-tabs').innerHTML = ['IG','FB','LI'].map(k =>
    `<span class="chip${k === capPlat ? ' on' : ''}" data-c="${k}">${PLAT_LABEL[k]}</span>`).join('');
  populateDates();
  showCap();
  $('#drawer').hidden = false;
}

/* Pillar and format belong to the post itself, so they are only editable on
   posts you wrote here — library posts are compiled from content/posts_*.py. */
$('#c-pillar-sel').onchange = e => {
  const p = find(CUR); if (!p || !isCustom(p.id)) return;
  p.pillar = e.target.value; p.pillar_label = pillarLabel(p.pillar);
  save(); renderAll();
};
$('#c-format-sel').onchange = e => {
  const p = find(CUR); if (!p || !isCustom(p.id)) return;
  p.format = e.target.value;
  save(); renderAll();
};
$('#c-delete').onclick = () => deletePost(CUR);

$$('[data-close]').forEach(b => b.onclick = () => { $('#drawer').hidden = true; save(); renderAll(); });
$$('[data-setup-close]').forEach(b => b.onclick = () => $('#setup').hidden = true);
$('#btn-setup').onclick = () => { $('#setup').hidden = false; renderTimes(); loadCfg(); };

$('#c-platforms').onclick = e => {
  const c = e.target.closest('.chip'); if (!c || !CUR) return;
  const s = sched(CUR), p = find(CUR);
  const list = platsOf(p, s).slice();
  const i = list.indexOf(c.dataset.p);
  i < 0 ? list.push(c.dataset.p) : list.splice(i, 1);
  s.platforms = list.length ? list : ['IG'];
  c.classList.toggle('on');
  save(); renderAll();
};
$('#cap-tabs').onclick = e => {
  const c = e.target.closest('.chip'); if (!c) return;
  capPlat = c.dataset.c;
  $$('#cap-tabs .chip').forEach(x => x.classList.toggle('on', x === c));
  showCap();
};
$('#cap-copy').onclick = () => copy($('#cap').value, `${PLAT_LABEL[capPlat]} caption copied`);
$('#cap-reset').onclick = () => {
  const s = sched(CUR); if (s.caps) delete s.caps[capPlat];
  save(); showCap(); toast('Caption reset to auto', 'ok');
};
$('#c-copy-prompt').onclick = () => copy($('#c-prompt').value, 'Image prompt copied');

$('#c-date').onchange = e => {
  const s = sched(CUR); if (!s) return;
  s.date = e.target.value;
  if (!s.date) s.time = '';
  else if (!s.time) s.time = S.settings.times[0] || '08:00';
  if (s.status !== 'posted') s.status = s.date ? 'scheduled' : 'draft';
  save(); renderAll();
  toast(s.date ? `Scheduled ${s.date}` : 'Moved back to the library', 'ok');
};
$('#c-time').onchange = e => { sched(CUR).time = e.target.value; save(); renderAll(); };

$('#drawer').addEventListener('input', e => {
  const s = sched(CUR), p = find(CUR); if (!s || !p) return;
  const map = { 'c-hook':'hook', 'c-body':'body', 'c-cta':'cta', 'c-imgurl':'imgurl', 'c-prompt':'imgPrompt' };
  if (map[e.target.id]) {
    s[map[e.target.id]] = e.target.value;
    if (['c-hook','c-body','c-cta'].includes(e.target.id)) { s.caps = {}; showCap(); }
  }
  if (e.target.id === 'c-lilead') { s.liLead = e.target.value; s.caps = {}; showCap(); }
  if (e.target.id === 'cap') {
    s.caps = s.caps || {};
    s.caps[capPlat] = e.target.value;
    capMeta();
  }
  save();
});

function populateDates() {
  const s = sched(CUR), out = ['<option value="">— unscheduled —</option>'];
  const start = today();
  for (let i = 0; i < 120; i++) {
    const x = addDays(start, i), v = iso(x);
    out.push(`<option value="${v}"${s.date === v ? ' selected' : ''}>${x.toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' })}</option>`);
  }
  if (s.date && !out.some(o => o.includes(`value="${s.date}"`))) {
    out.push(`<option value="${s.date}" selected>${s.date}</option>`);
  }
  $('#c-date').innerHTML = out.join('');
}

function capMeta() {
  const t = $('#cap').value, lim = capPlat === 'FB' ? 63206 : capPlat === 'LI' ? 3000 : 2200;
  $('#cap-count').textContent = `${t.length} / ${lim}` + (t.length > lim ? ' ⚠️ over' : '');
}

function showCap() {
  const p = find(CUR); if (!p) return;
  $('#cap').value = captionFor(p, sched(CUR), capPlat);
  capMeta();
  if (S.composerMode === 'mock') renderMockPreview();
}

function renderMockPreview() {
  const p = find(CUR); if (!p) return;
  const s = sched(CUR);
  const text = captionFor(p, s, capPlat);
  const container = $('#cap-mock');
  if (!container) return;

  if (capPlat === 'IG') {
    container.innerHTML = `
      <div class="social-mock-header">
        <div class="mock-avatar">🪟</div>
        <div class="mock-meta">
          <b>fenora.pro <span style="color:#5b9cff">✓</span></b>
          <span>Audio original • Double Glazing Trade</span>
        </div>
        <div class="grow"></div>
        <span style="color:#666">•••</span>
      </div>
      <div style="background:#111;border:1px dashed #333;border-radius:8px;padding:20px 14px;text-align:center;margin-bottom:12px;font-size:12px;color:#888">
        📸 <b>Visual Asset (4:5)</b><br>
        <span style="font-family:var(--mono);font-size:11px;color:#aaa">${esc(p.image_prompt || 'Typographic post card or site photograph')}</span>
      </div>
      <div class="mock-body">${esc(text)}</div>
      <div class="mock-footer">
        <span>❤️ 184</span>
        <span>💬 42</span>
        <span>↗️ Share</span>
        <div class="grow"></div>
        <span>🔖</span>
      </div>
    `;
  } else if (capPlat === 'FB') {
    container.innerHTML = `
      <div class="social-mock-header">
        <div class="mock-avatar" style="background:#1877f2">f</div>
        <div class="mock-meta">
          <b>Fenora — The Window &amp; Glazing OS</b>
          <span>Just now • 🌐 Public</span>
        </div>
      </div>
      <div class="mock-body">${esc(text)}</div>
      <div class="mock-footer">
        <span>👍 Like (67)</span>
        <span>💬 Comment (31)</span>
        <span>🔄 Share (14)</span>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="social-mock-header">
        <div class="mock-avatar" style="background:#0a66c2">in</div>
        <div class="mock-meta">
          <b>Fenora | The Operating System for Windows &amp; Glazing</b>
          <span>1,420 followers • Promoted</span>
        </div>
      </div>
      <div class="mock-body">${esc(text)}</div>
      <div class="mock-footer">
        <span>👍 Celebrate 89</span>
        <span>💬 27 comments</span>
        <span>🔁 12 reposts</span>
      </div>
    `;
  }
}

const btnRaw = $('#btn-mode-raw');
const btnMock = $('#btn-mode-mock');
if (btnRaw && btnMock) {
  btnRaw.onclick = () => {
    S.composerMode = 'raw';
    btnRaw.classList.add('on');
    btnMock.classList.remove('on');
    $('#cap').hidden = false;
    $('#cap-mock').hidden = true;
  };
  btnMock.onclick = () => {
    S.composerMode = 'mock';
    btnMock.classList.add('on');
    btnRaw.classList.remove('on');
    $('#cap').hidden = true;
    $('#cap-mock').hidden = false;
    renderMockPreview();
  };
}

/* ══════════════ SETTINGS ══════════════ */
function renderTimes() {
  $('#s-times').innerHTML = S.settings.times.map((t, i) =>
    `<div class="timerow">
      <input type="time" class="mini grow" data-t="${i}" value="${t}">
      ${S.settings.times.length > 1 ? `<button class="icon-btn" data-trm="${i}" title="Remove">✕</button>` : ''}
    </div>`).join('');
}
$('#s-times').addEventListener('input', e => {
  const i = e.target.dataset.t;
  if (i !== undefined) { S.settings.times[+i] = e.target.value || '08:00'; saveSettings(); }
});
$('#s-times').addEventListener('click', e => {
  const b = e.target.closest('[data-trm]');
  if (b) { S.settings.times.splice(+b.dataset.trm, 1); saveSettings(); renderTimes(); }
});
$('#s-add-time').onclick = () => {
  if (S.settings.times.length >= 6) return;
  const last = S.settings.times[S.settings.times.length - 1] || '12:00';
  const [h, m] = last.split(':').map(Number);
  const nh = Math.min(23, h + 4);
  S.settings.times.push(`${String(nh).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
  saveSettings(); renderTimes();
};

function renderMix() {
  $('#s-mix').innerHTML = S.lib.pillars.map(pl => {
    const w = S.settings.mix[pl.key] ?? 1;
    return `<label>${esc(pl.label)}<input type="range" data-p="${pl.key}" min="0" max="10" value="${w}"><span class="w">${w}</span></label>`;
  }).join('');
}
$('#s-mix').addEventListener('input', e => {
  if (e.target.type !== 'range') return;
  S.settings.mix[e.target.dataset.p] = +e.target.value;
  e.target.nextElementSibling.textContent = e.target.value;
  saveSettings();
});

$('#s-resched').onclick = () => {
  if (!confirm('Rebuild the whole schedule?\n\nEvery planned post goes back to the library (posted ones are never touched), then the next 90 days are planned fresh.')) return;
  S.posts.forEach(p => {
    const s = sched(p.id);
    if (s.status !== 'posted' && !isFullyPosted(p)) { s.date = ''; s.time = ''; s.status = 'draft'; }
  });
  const placed = planDays(90);
  save();
  $('#setup').hidden = true;
  toast(`${placed} posts planned across 90 days`, 'ok');
};

async function loadCfg() {
  try { S.cfg = await (await fetch('/api/config')).json(); } catch { S.cfg = { configured: {}, defaults: {}, persistent: true }; }
  const c = S.cfg.configured || {};
  $('#conn-status').innerHTML = [
    ['Facebook Page', c.facebook, 'Text and link posts go straight to your Page'],
    ['Instagram',     c.instagram, 'Needs a public image URL on each post'],
    ['LinkedIn Page', c.linkedin,  'Text posts work anywhere'],
  ].map(([n, ok, note]) => `<div class="crow"><div><b>${n}</b><div class="muted small">${note}</div></div>
    <span class="st ${ok ? 'ok' : 'no'}">${ok ? 'connected' : 'copy mode'}</span></div>`).join('');

  const persistent = S.cfg.persistent !== false;
  $('#conn-form').hidden = !persistent;
  $('#conn-env').hidden = persistent;
  const d = S.cfg.defaults || {};
  const set = (id, v) => { const e = $(id); if (e && !e.value) e.value = v || ''; };
  set('#s-iguser', d.igUserId); set('#s-pageid', d.pageId); set('#s-orgurn', d.orgUrn);
  set('#s-host', d.imageHostEndpoint);
}

$('#s-save').onclick = async () => {
  const cfg = {
    meta: {
      igUserId: $('#s-iguser').value, metaToken: $('#s-mtoken').value,
      pageId: $('#s-pageid').value, pageToken: $('#s-ptoken').value,
    },
    linkedin: { orgUrn: $('#s-orgurn').value, liToken: $('#s-litoken').value },
  };
  /* The artwork host is an API-level option now — only sent if the field is
     on screen, so an existing endpoint is never blanked by accident. */
  const hostEl = $('#s-host');
  if (hostEl) cfg.imageHost = { uploadEndpoint: hostEl.value };
  try {
    const r = await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg) });
    if (r.ok) {
      $('#s-mtoken').value = ''; $('#s-ptoken').value = ''; $('#s-litoken').value = '';
      await loadCfg();
      renderAll();
      toast('config.json saved', 'ok');
    } else throw new Error('save failed');
  } catch {
    // No writable server (static hosting) — hand the file over instead.
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' }));
    a.download = 'config.json'; a.click();
    toast('Downloaded config.json — drop it next to server.js', 'ok');
  }
};

/* ══════════════ EXPORT / BACKUP ══════════════ */
const dl = (n, t) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([t], { type: 'text/csv;charset=utf-8' }));
  a.download = n; a.click();
};
const ce = v => `"${String(v ?? '').replace(/"/g, '""')}"`;

function exportCSV(kind) {
  const rows = S.posts.filter(p => sched(p.id).date);
  if (kind === 'full') {
    if (!S.posts.length) return toast('Library is empty — write a post first', 'err');
    /* Effective values, not the raw library row: what you edited in the
       composer (and everything you wrote here) is what gets exported. */
    const eff = S.posts.map(p => {
      const s = sched(p.id);
      return {
        id: p.id, pillar: p.pillar, pillar_label: p.pillar_label || pillarLabel(p.pillar),
        format: p.format, series: p.series || '',
        hook: field(p, s, 'hook'), body: field(p, s, 'body'),
        cta: field(p, s, 'cta'), cta_fb: field(p, s, 'cta_fb') || field(p, s, 'cta'),
        li_lead: s.liLead || p.li_lead || '',
        image_prompt: s.imgPrompt || p.image_prompt || '',
        image_style: p.image_style || '', aspect: p.aspect || '4:5',
        platforms: platsOf(p, s).join(','), tagset: p.tagset || 'core',
        caption_ig: captionFor(p, s, 'IG'), caption_fb: captionFor(p, s, 'FB'), caption_li: captionFor(p, s, 'LI'),
        date: s.date || '', time: s.time || '', status: stOf(p),
        ig_url: s.ig_url || '', fb_url: s.fb_url || '', li_url: s.li_url || '',
        source: isCustom(p.id) ? 'dashboard' : 'library',
      };
    });
    dl('fenora-library.csv',
      [Object.keys(eff[0]).map(ce).join(','), ...eff.map(r => Object.values(r).map(ce).join(','))].join('\n'));
    return toast('Full library exported', 'ok');
  }
  const map = {
    buffer: { 'Date': p => sched(p.id).date, 'Time': p => sched(p.id).time || '08:00',
              'Text': p => captionFor(p, sched(p.id), 'IG'), 'Profile': () => 'instagram' },
    metricool: { 'Publication date': p => `${sched(p.id).date} ${sched(p.id).time || '08:00'}`,
                 'Text': p => captionFor(p, sched(p.id), 'IG'),
                 'Social Networks': p => platsOf(p, sched(p.id)).map(x => ({ IG:'instagram', FB:'facebook', LI:'linkedin' }[x])).join(', ') },
    hootsuite: { 'Date': p => sched(p.id).date, 'Time': p => sched(p.id).time || '08:00',
                 'Post Text': p => captionFor(p, sched(p.id), 'IG'),
                 'Post Type': () => 'o', 'Social Network': () => 'instagram' },
  }[kind];
  const k = Object.keys(map);
  dl(`fenora-${kind}.csv`, [k.map(ce).join(','), ...rows.map(p => k.map(x => ce(map[x](p))).join(','))].join('\n'));
  toast(`${rows.length} posts exported (${kind})`, 'ok');
}
$$('[data-csv]').forEach(b => b.onclick = () => exportCSV(b.dataset.csv));

$('#s-backup').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ posts: S.sched, custom: S.custom, settings: S.settings }, null, 1)], { type: 'application/json' }));
  a.download = 'fenora-schedule-backup.json'; a.click();
  toast('Backup downloaded', 'ok');
};
$('#s-restore').onclick = () => $('#s-file').click();
$('#s-file').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    S.sched = { ...S.sched, ...(data.posts || {}) };
    const byId = new Map(S.custom.map(p => [p.id, p]));
    (data.custom || []).forEach(p => { if (p && p.id) byId.set(p.id, { ...p, custom: true }); });
    S.custom = [...byId.values()];
    S.custom.forEach(p => { if (!find(p.id)) S.posts.push(p); });
    if (data.settings) {
      S.settings.times = data.settings.times || S.settings.times;
      S.settings.mix = { ...S.settings.mix, ...(data.settings.mix || {}) };
      saveSettings(); renderTimes();
    }
    migrate(); save(); renderAll();
    toast('Everything restored', 'ok');
  } catch { toast('That file could not be read', 'err'); }
  e.target.value = '';
};

/* Back to a blank desk: every date, tick and caption override goes, and so
   does anything you wrote here. The compiled library is left alone. */
$('#s-clear').onclick = () => {
  const n = Object.keys(S.sched).length, c = S.custom.length;
  if (!n && !c) return toast('Already a blank desk', 'ok');
  if (!confirm(`Clear everything?\n\n${n} schedule ${n === 1 ? 'entry' : 'entries'} and ${c} post${c === 1 ? '' : 's'} you wrote will be deleted.\nDownload a backup first if you might want any of it.`)) return;
  S.sched = {};
  S.custom = [];
  S.posts = S.posts.filter(p => !p.custom);
  S.lib.posts = S.posts;
  CUR = null;
  $('#drawer').hidden = true;
  save(); renderAll();
  toast('Desk cleared — nothing written, nothing scheduled', 'ok');
};

/* ══════════════ PUBLISH (optional API mode) ══════════════ */
async function postNow(id, plat) {
  const p = find(id), s = sched(id);
  if (!p) return;
  const caption = captionFor(p, s, plat);
  const to = { IG:'ig', FB:'fb', LI:'li' }[plat];
  const body = { to: [to], caption, message: caption };

  /* No renderer ships with the desk: Instagram needs a public image URL, so
     paste one in the post's Advanced panel (or use copy mode). */
  const img = s.imgurl || null;
  if (plat === 'IG') {
    if (!img) {
      toast('Instagram needs a public image URL — add one under Edit → Advanced, or use copy mode', 'err');
      return;
    }
    body.imageUrl = img;
  }
  if (plat === 'FB' && img) body.imageUrl = img;

  toast(`Posting to ${PLAT_LABEL[plat]}…`);
  try {
    const r = await fetch('/api/publish', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    const err = (j.errors || []).join(' · ');
    const res = (j.results || {})[{ IG:'instagram', FB:'facebook', LI:'linkedin' }[plat]];
    if (err && !res) throw new Error(err);
    if (res && res.url) s[plat.toLowerCase() + '_url'] = res.url;
    s.posted = s.posted || {}; s.posted[plat] = true;
    s.status = platsOf(p, s).every(k => s.posted[k]) ? 'posted' : (s.date ? 'scheduled' : 'draft');
    save(); renderAll();
    toast(`${PLAT_LABEL[plat]} posted ✓${err ? ' (' + err + ')' : ''}`, 'ok');
  } catch (e) {
    toast(`${PLAT_LABEL[plat]}: ${e.message}`, 'err');
  }
}

/* ══════════════ TRADE VAULT & STRATEGY ══════════════ */
const FOREMAN_BANTER = [
  {
    id: "FB-01",
    tag: "Site Insult",
    quote: "I’d explain it to you, but I left my crayons at home.",
    context: "Said when a customer or apprentice asks why a 1200mm frame won't fit a 1150mm opening."
  },
  {
    id: "FB-02",
    tag: "Foreman Wisdom",
    quote: "You’ve got two brain cells and they’re both fighting for third place.",
    context: "Said when Dave measures a 3-facet bay window with a free 2-metre tape from a Christmas cracker."
  },
  {
    id: "FB-03",
    tag: "Site Reality",
    quote: "If common sense was petrol, you couldn’t drive a piss-ant scooter across a fucking matchstick.",
    context: "Said when the homeowner asks if you can 'just make the Anthracite Grey a bit warmer' after the powder-coater ran it."
  },
  {
    id: "FB-04",
    tag: "Foreman Banter",
    quote: "You’re not completely useless. You can always serve as a bad example.",
    context: "Said to the builder who assured you the structural opening would be 100% ready on Friday morning."
  },
  {
    id: "FB-05",
    tag: "Structural Truth",
    quote: "I’ve seen wet cement with more structural integrity than you.",
    context: "Said when looking at a Victorian timber lintel held together by wallpaper paste and optimism."
  },
  {
    id: "FB-06",
    tag: "Brutal Honesty",
    quote: "You couldn’t pour piss out of a boot if the instructions were written on the heel.",
    context: "Said when the apprentice drops his last magnetic T30 Torx bit down into a 3-metre cavity wall."
  },
  {
    id: "FB-07",
    tag: "Trade Banter",
    quote: "You’ve got the work ethic of a Sunday afternoon.",
    context: "Said at 2:15 PM on a Friday when someone suggests packing up the van early."
  },
  {
    id: "FB-08",
    tag: "Jobsite Truth",
    quote: "I’ve met fucking idiots before, but you’ve got tenure.",
    context: "Said when looking at an office desktop with 30 PDF quotes named FINAL_FINAL_USE_THIS_ONE."
  },
  {
    id: "FB-09",
    tag: "Darwin Award",
    quote: "You’re living proof that evolution sometimes takes a lunch break.",
    context: "Said when a customer asks if they can remove Part F trickle vents to save £15 on a £4,000 composite door."
  },
  {
    id: "FB-10",
    tag: "Measuring Truth",
    quote: "Your tape measure must be printed in fairy millimetres.",
    context: "Said when the reveal was called 1800 on the quote but measures 1765 on site."
  },
  {
    id: "FB-11",
    tag: "Office vs Site",
    quote: "I've seen spirit levels with more balance than your quoting spreadsheet.",
    context: "Said when an owner realises their 30% markup turned into an 8% landed loss after fuel and ancillaries."
  },
  {
    id: "FB-12",
    tag: "Installation Detail",
    quote: "That silicone bead looks like a toothpaste tube exploded on a bouncy castle.",
    context: "Said when someone tries to bridge a 35mm masonry gap with three tubes of white mastic."
  },
  {
    id: "FB-13",
    tag: "The Paperwork Void",
    quote: "You've got 47 WhatsApp chats and not one of them knows what size the glass is.",
    context: "Said while standing in the rain waiting for the glass lorry on a Tuesday morning."
  },
  {
    id: "FB-14",
    tag: "Site Surveying",
    quote: "I'd agree with your survey, but then we'd both be wrong and £2,000 in the hole.",
    context: "Said when reviewing a bay angle drawn as a right angle on a piece of cardboard."
  }
];

function initVaultEvents() {
  const vtabs = $('#vault-subtabs');
  if (vtabs) {
    vtabs.onclick = e => {
      const b = e.target.closest('button');
      if (!b) return;
      S.vaultTab = b.dataset.vtab;
      $$('#vault-subtabs button').forEach(x => x.classList.toggle('on', x === b));
      renderVault();
    };
  }
}

function initStrategyEvents() {
  const stabs = $('#strat-subtabs');
  if (stabs) {
    stabs.onclick = e => {
      const b = e.target.closest('button');
      if (!b) return;
      S.stratTab = b.dataset.stab;
      $$('#strat-subtabs button').forEach(x => x.classList.toggle('on', x === b));
      renderStrategy();
    };
  }
}

function parseSlides(body) {
  const lines = String(body || '').split('\n').filter(l => l.trim().startsWith('Slide '));
  if (lines.length) return lines.map(l => l.replace(/^Slide \d+:\s*/, '').trim());
  return String(body || '').split('\n\n').filter(Boolean);
}

function renderVault() {
  const c = $('#vault-content');
  if (!c) return;
  const tab = S.vaultTab || 'banter';

  if (tab === 'banter') {
    const cur = FOREMAN_BANTER[S.banterIdx % FOREMAN_BANTER.length];
    c.innerHTML = `
      <div class="banter-box">
        <span class="banter-tag">⚡ ${esc(cur.tag)}</span>
        <div class="banter-quote">“${esc(cur.quote)}”</div>
        <div class="banter-meta"><b>Context:</b> ${esc(cur.context)}</div>
        <div class="banter-actions">
          <button class="btn sm" id="v-next-banter">⚡ Next Foreman Truth</button>
          <button class="btn ghost sm" id="v-copy-banter">📋 Copy Banter</button>
          <button class="btn ghost sm" id="v-compose-banter">✍️ Use as Hook in Composer</button>
        </div>
      </div>
      <h3 style="margin-top:20px;color:var(--tx2)">Site-Tested Banter &amp; Insults Vault</h3>
      <p class="lede">Click any insult below to put it in the spotlight, copy it, or spin it into a high-reach post hook.</p>
      <div class="banter-grid">
        ${FOREMAN_BANTER.map((b, idx) => `
          <div class="banter-card" data-bidx="${idx}">
            <p>“${esc(b.quote)}”</p>
            <div class="banter-card-foot">
              <span>${esc(b.tag)}</span>
              <span style="color:#f26b21">Click to select →</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    $('#v-next-banter').onclick = () => { S.banterIdx = (S.banterIdx + 1) % FOREMAN_BANTER.length; renderVault(); };
    $('#v-copy-banter').onclick = () => copy(`“${cur.quote}”`, 'Foreman quote copied');
    $('#v-compose-banter').onclick = () => {
      newPost();
      $('#c-hook').value = `“${cur.quote}”`;
      const p = find(CUR);
      if (p) { sched(CUR).hook = `“${cur.quote}”`; showCap(); }
    };
    $$('[data-bidx]').forEach(el => el.onclick = () => {
      S.banterIdx = +el.dataset.bidx;
      renderVault();
    });
    return;
  }

  if (tab === 'carousels') {
    const carousels = S.posts.filter(p => p.format === 'carousel');
    const p = carousels.find(x => x.id === S.carouselPostId) || carousels[0];
    if (!p) { c.innerHTML = '<div class="empty">No carousels in library</div>'; return; }
    const slides = parseSlides(p.body);
    const curIdx = Math.min(S.carouselSlide, slides.length - 1);
    const slideText = slides[curIdx] || 'Slide text';

    c.innerHTML = `
      <div class="row gap wrap" style="margin-bottom:14px">
        <label style="font-size:13px;color:var(--tx2)">Select Carousel:</label>
        <select id="v-carousel-sel" class="mini grow" style="max-width:380px">
          ${carousels.map(x => `<option value="${x.id}"${x.id === p.id ? ' selected' : ''}>${x.id}: ${esc(x.hook.slice(0, 50))}…</option>`).join('')}
        </select>
        <button class="btn sm" id="v-car-open">Open in Composer</button>
        <button class="btn ghost sm" id="v-car-copy">Copy All Slides</button>
      </div>
      <div class="carousel-viewer">
        <div class="carousel-slide-card">
          <div class="carousel-slide-head">
            <span class="slide-num">Slide ${curIdx + 1} of ${slides.length}</span>
            <span class="pill">${esc(p.id)}</span>
          </div>
          <div class="carousel-slide-text">
            ${curIdx === 0 ? `<h2 style="font-size:20px;color:#fff;margin-bottom:12px">${esc(slideText)}</h2><p style="color:var(--tx2);font-size:13px">Swipe to see the breakdown →</p>` : `<p style="font-size:16px;line-height:1.6">${esc(slideText)}</p>`}
          </div>
          <div class="slide-nav">
            <button class="btn ghost sm" id="v-slide-prev"${curIdx === 0 ? ' disabled' : ''}>← Prev</button>
            <div class="slide-indicators">
              ${slides.map((_, i) => `<span class="slide-dot${i === curIdx ? ' active' : ''}"></span>`).join('')}
            </div>
            <button class="btn ghost sm" id="v-slide-next"${curIdx === slides.length - 1 ? ' disabled' : ''}>Next →</button>
          </div>
        </div>
        <div class="strat-card" style="background:var(--bg3)">
          <h3>${esc(p.hook)}</h3>
          <p class="lede" style="margin-bottom:12px">${esc(p.pillar_label || p.pillar)} • Carousel format</p>
          <div style="background:var(--bg2);padding:14px;border-radius:8px;font-size:12.5px;color:var(--tx2);line-height:1.6;white-space:pre-wrap;max-height:280px;overflow:auto">${esc(p.body)}</div>
          <div style="margin-top:14px;font-size:12px;color:var(--tx3)"><b>CTA:</b> ${esc(p.cta || 'fenora.pro')}</div>
        </div>
      </div>
    `;

    $('#v-carousel-sel').onchange = e => {
      S.carouselPostId = e.target.value;
      S.carouselSlide = 0;
      renderVault();
    };
    $('#v-slide-prev').onclick = () => { if (S.carouselSlide > 0) { S.carouselSlide--; renderVault(); } };
    $('#v-slide-next').onclick = () => { if (S.carouselSlide < slides.length - 1) { S.carouselSlide++; renderVault(); } };
    $('#v-car-open').onclick = () => openPost(p.id);
    $('#v-car-copy').onclick = () => copy(p.body, 'All carousel slides copied');
    return;
  }

  if (tab === 'reels') {
    const reels = S.posts.filter(p => p.format === 'reel');
    c.innerHTML = `
      <div class="storyboard-grid">
        ${reels.map(r => `
          <div class="storyboard-card">
            <div class="storyboard-head">
              <span class="mono pill id">${esc(r.id)}</span>
              <span class="time-tag">Reel Video</span>
            </div>
            <div class="storyboard-title">“${esc(r.hook)}”</div>
            <div class="shot-box" style="white-space:pre-wrap;max-height:220px;overflow:auto">${esc(r.body)}</div>
            <div class="row gap" style="margin-top:auto">
              <button class="btn sm grow" data-open-id="${r.id}">Open in Composer</button>
              <button class="btn ghost sm" data-copy-body="${esc(r.body)}">Copy Script</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    $$('[data-open-id]').forEach(b => b.onclick = () => openPost(b.dataset.openId));
    $$('[data-copy-body]').forEach(b => b.onclick = () => copy(b.dataset.copyBody, 'Reel script copied'));
    return;
  }

  // Generic card grid for FLW, lies, memes, edu, product, authority
  const seriesMap = {
    flw: 'Famous Last Words',
    lies: 'Relatable Lies',
    memes: 'Construction Memes',
    edu: 'Educational Guides',
    product: 'Product Workflows',
    authority: 'LinkedIn Authority'
  };
  const targetSeries = seriesMap[tab];
  const items = S.posts.filter(p => p.series === targetSeries || (tab === 'flw' && p.id.startsWith('FLW-')) || (tab === 'lies' && p.id.startsWith('RCL-')) || (tab === 'memes' && p.id.startsWith('MEM-')) || (tab === 'edu' && p.id.startsWith('EDU-')) || (tab === 'product' && p.id.startsWith('PRD-')) || (tab === 'authority' && p.id.startsWith('LIA-')));

  c.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:16px">
      ${items.map(p => `
        <div class="strat-card">
          <div class="row gap">
            <span class="mono pill id">${esc(p.id)}</span>
            <span class="pill">${esc(p.pillar_label || p.pillar)}</span>
            <div class="grow"></div>
            <span class="pill">${PFMT[p.format] || esc(p.format)}</span>
          </div>
          <h3 style="color:#fff;font-size:15px;margin:4px 0">“${esc(p.hook)}”</h3>
          <p style="font-size:12.5px;color:var(--tx2);line-height:1.55;white-space:pre-wrap;max-height:160px;overflow:auto">${esc(p.body)}</p>
          <div class="row gap" style="margin-top:auto;padding-top:10px;border-top:1px solid var(--line)">
            <button class="btn sm grow" data-open-id="${p.id}">Open in Composer</button>
            <button class="btn ghost sm" data-copy-hook="${esc(p.hook)}">Copy Hook</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  $$('[data-open-id]').forEach(b => b.onclick = () => openPost(b.dataset.openId));
  $$('[data-copy-hook]').forEach(b => b.onclick = () => copy(b.dataset.copyHook, 'Hook copied'));
}

function renderStrategy() {
  const c = $('#strat-content');
  if (!c) return;
  const tab = S.stratTab || 'positioning';

  if (tab === 'positioning') {
    c.innerHTML = `
      <div class="strat-grid">
        <div class="strat-card">
          <span class="strat-badge badge-gold">CORE POSITIONING</span>
          <h3>One Job. One Place.</h3>
          <p>Fenora is the construction-native operating system for window, door, and glazing businesses. It replaces the 14-app mess with a single unified job record from initial survey to final milestone sign-off.</p>
        </div>
        <div class="strat-card">
          <span class="strat-badge badge-blue">PRIMARY AUDIENCE</span>
          <h3>Window &amp; Door Businesses</h3>
          <p>Installers, joineries, timber/uPVC/aluminium fabricators, sash specialists, architectural glazing companies (2–50 employees) struggling with disconnected quoting, messy surveys, and supplier miscommunication.</p>
        </div>
        <div class="strat-card">
          <span class="strat-badge badge-green">THE ENEMY</span>
          <h3>"The Way You've Always Done It"</h3>
          <p>The enemy is not another SaaS vendor. The enemy is WhatsApp voice notes, unformatted Excel sheets, scribbled notebooks in the van footwell, and 30 PDFs named FINAL_FINAL_2.</p>
        </div>
      </div>

      <div class="strat-card" style="margin-top:10px">
        <h3>The Construction Customer Persona</h3>
        <p class="lede">Trades business owners aren't looking for 'integrated digital synergy'. They are firefighting real site friction:</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(240px, 1fr));gap:12px;margin-top:10px">
          <div style="background:var(--bg3);padding:12px;border-radius:8px;font-size:13px;color:#fff">“Where the fuck did that quote go?”</div>
          <div style="background:var(--bg3);padding:12px;border-radius:8px;font-size:13px;color:#fff">“Who measured this opening?”</div>
          <div style="background:var(--bg3);padding:12px;border-radius:8px;font-size:13px;color:#fff">“Did anyone ever invoice High Street?”</div>
          <div style="background:var(--bg3);padding:12px;border-radius:8px;font-size:13px;color:#fff">“Why is the drawing different from the quote?”</div>
        </div>
      </div>
    `;
    return;
  }

  if (tab === 'funnel') {
    c.innerHTML = `
      <div class="strat-grid">
        <div class="strat-card">
          <span class="strat-badge badge-gold">LAYER 1 • 70% SHARE</span>
          <h3>Peers &amp; Trade Workforce</h3>
          <p><b>Target:</b> Fitters, joiners, surveyors, apprentices, builders.<br>
          <b>Content:</b> Relatable humour, famous last words, site fails, memes, brutal foreman banter.<br>
          <b>Outcome:</b> Follows, virality, peer tagging, genuine trade credibility.</p>
        </div>
        <div class="strat-card">
          <span class="strat-badge badge-blue">LAYER 2 • 25% SHARE</span>
          <h3>Buyers &amp; Decision Makers</h3>
          <p><b>Target:</b> MDs, owners, operations managers, commercial directors.<br>
          <b>Content:</b> Quoting margins, admin drain, cash flow velocity, regulation guides, software breakdown.<br>
          <b>Outcome:</b> Inbound DMs, demo requests, website investigations.</p>
        </div>
        <div class="strat-card">
          <span class="strat-badge badge-green">LAYER 3 • 5% SHARE</span>
          <h3>Direct Product Conversion</h3>
          <p><b>Target:</b> Active evaluators &amp; frustrated owners.<br>
          <b>Content:</b> 2D configurator walkthroughs, before/after workflow comparisons, direct CTAs.<br>
          <b>Outcome:</b> Trials, subscriptions, active accounts.</p>
        </div>
      </div>
      <div class="strat-card" style="margin-top:14px">
        <h3>The Funnel Conversion Engine</h3>
        <p>Fitters see our reels and memes on Instagram at 6:30 PM → They tag their mate or send it to the company WhatsApp group → The owner watches it and smiles → Next day on LinkedIn, the owner sees our post on why 10-person window firms leak £30k in unpriced variations → The owner books a walkthrough at fenora.pro.</p>
      </div>
    `;
    return;
  }

  if (tab === 'voice') {
    c.innerHTML = `
      <div class="do-dont-grid">
        <div class="do-box">
          <h4>✅ HOW FENORA SPEAKS (Foreman Voice)</h4>
          <ul class="voice-list">
            <li><b>Dry, cynical, site-tested humour:</b> “I’d explain it to you, but I left my crayons at home.”</li>
            <li><b>Concrete site consequences:</b> Blown lintels, wrong cill projections, 4-hour stand-downs.</li>
            <li><b>Construction-native vocabulary:</b> Reveals, datum lines, meeting rails, astragals, Part F.</li>
            <li><b>Relatable human truths:</b> The Greggs bakery bag CAD drawing, the van sun visor filing cabinet.</li>
            <li><b>The Litmus Test:</b> Would a 35-year-old window fitter with 15 years on site actually say this?</li>
          </ul>
        </div>
        <div class="dont-box">
          <h4>❌ WHAT FENORA NEVER SAYS (Banned SaaS Clichés)</h4>
          <ul class="voice-list">
            <li><b>No Silicon Valley buzzwords:</b> “Revolutionise”, “Supercharge”, “Game-changing”.</li>
            <li><b>No generic puns:</b> “Nailed it”, “Groundbreaking”, “Raising the roof”.</li>
            <li><b>No fake motivation:</b> “Unlock your true potential”, “Work smarter not harder”.</li>
            <li><b>No patronising explanations:</b> Never lecture a craftsman on how to hang a sash.</li>
            <li><b>No AI screaming:</b> Never say “AI is disrupting construction”. Say “it reads messy tender PDFs”.</li>
          </ul>
        </div>
      </div>
    `;
    return;
  }

  if (tab === 'diff') {
    c.innerHTML = `
      <div class="strat-card">
        <h3>Competitive Differentiation Matrix</h3>
        <p class="lede">Why generic software tools fail the window, door, and glazing trade:</p>
        <table class="strat-table">
          <thead>
            <tr>
              <th>Capability</th>
              <th>Generic CRM (HubSpot/Pipedrive)</th>
              <th>Quoting-Only Tools (Windowmaker)</th>
              <th>Generic PM (Monday/Asana)</th>
              <th>Fenora Operating System</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><b>2D Parametric Drawings</b></td>
              <td>❌ None</td>
              <td>⚠️ Clunky legacy desktop CAD</td>
              <td>❌ None</td>
              <td><b>✅ Real-time 2D elevations + DXF</b></td>
            </tr>
            <tr>
              <td><b>Site Survey Mobile Validation</b></td>
              <td>❌ Text fields only</td>
              <td>❌ Office desktop only</td>
              <td>⚠️ Generic custom checklist</td>
              <td><b>✅ Guided 3-point reveal checks + photos</b></td>
            </tr>
            <tr>
              <td><b>Building Regs Compliance (Part F/L)</b></td>
              <td>❌ None</td>
              <td>⚠️ Basic U-value table</td>
              <td>❌ None</td>
              <td><b>✅ Automated Part F &amp; L compliance engine</b></td>
            </tr>
            <tr>
              <td><b>Variation Order Management</b></td>
              <td>❌ Manual deals</td>
              <td>❌ Re-quote required</td>
              <td>⚠️ Generic ticket</td>
              <td><b>✅ 1-click mobile variation + customer sign</b></td>
            </tr>
            <tr>
              <td><b>Milestone Invoicing &amp; Cash Flow</b></td>
              <td>❌ Generic integration</td>
              <td>❌ None</td>
              <td>❌ None</td>
              <td><b>✅ Instant milestone trigger upon site sign-off</b></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
    return;
  }

  if (tab === 'leadgen') {
    c.innerHTML = `
      <div class="strat-grid">
        <div class="strat-card">
          <span class="strat-badge badge-gold">LEAD MAGNET 1</span>
          <h3>Bay Survey Triangulation Calculator</h3>
          <p>Free interactive tool that calculates exact bay post deduction angles from chord and projection inputs. Eliminates the #1 cause of bay remake disasters.<br><b>Capture:</b> Mobile &amp; Company Name.</p>
        </div>
        <div class="strat-card">
          <span class="strat-badge badge-blue">LEAD MAGNET 2</span>
          <h3>Part F &amp; Part L 2024 Trade Playbook</h3>
          <p>Downloadable 8-page field guide breaking down trick-vent requirements, equivalent area rules, and how to defend compliance against stubborn homeowners.<br><b>Capture:</b> Business Email.</p>
        </div>
        <div class="strat-card">
          <span class="strat-badge badge-green">LEAD MAGNET 3</span>
          <h3>True Landed Cost Calculator</h3>
          <p>Interactive spreadsheet auditing hidden consumables, wasted merchant trips, and unpriced variations. Shows owners their true net margin per fitted frame.<br><b>Capture:</b> Email &amp; Van Count.</p>
        </div>
      </div>
      <div class="strat-card" style="margin-top:14px">
        <h3>The 60-Second Frictionless Demo Flow</h3>
        <p>No 45-minute discovery calls with a junior SDR. Glazing business owners click from social straight into an interactive sandbox: configure a 3-pane bifold, adjust dimensions, and see the live price and DXF output in 60 seconds.</p>
      </div>
    `;
    return;
  }

  if (tab === 'growth') {
    c.innerHTML = `
      <div class="strat-grid">
        <div class="strat-card">
          <span class="strat-badge badge-gold">LOOP 1</span>
          <h3>The 20-Minute Daily Commenting Routine</h3>
          <p>8 authentic comments daily on peer trade reels and fail accounts. Never pitch. Add trade facts, share war stories, and make fitters laugh. Drives 40+ profile visits daily organically.</p>
        </div>
        <div class="strat-card">
          <span class="strat-badge badge-blue">LOOP 2</span>
          <h3>Tag-a-Mate Engagement Prompts</h3>
          <p>Posts explicitly designed around relatable trade pain: “Tag the fitter who forgets the cill on Monday morning” or “Drop your score from 1 to 9”. Generates massive comment threads.</p>
        </div>
        <div class="strat-card">
          <span class="strat-badge badge-green">LOOP 3</span>
          <h3>Trade Counter &amp; Supplier Co-Marketing</h3>
          <p>Strategic partnerships with aluminium systems houses and glass processors. Suppliers promote Fenora because orders arrive formatted, clean, and error-free.</p>
        </div>
      </div>
    `;
    return;
  }
}

/* ══════════════ GROW ══════════════ */
const TPLS = [
  ['Add a trade fact', "That's the bit nobody checks — is the sill actually going to have a fall on that? Because if the render's proud you'll never get drainage without packing it out."],
  ['Add a trade fact', "Half of those are the render, not the window. DPO is right on though — once it's gone you're on the scaff for every fitter after you."],
  ['Agree + expand', "Yep. And the bit that gets you is the reveal. Everyone agrees on the door, nobody ever measures the opening underneath it."],
  ['Agree + expand', "This is every job. The thing nobody photographs is the thing that comes back three weeks later."],
  ['Humour, self-deprecate', "Straight up watched this with the sound on and went 'oh god' — I've had that exact call and I did exactly that."],
  ['Humour, self-deprecate', "Saving this for the next time a customer says it's an easy fit. Absolutely not saying it to their face, obviously."],
  ['Question the poster', "Genuine question — did that change the reveal or just the frame? Asking because we've had one where that was the whole job."],
  ['Question the poster', "Out of interest, was the head on that level? Bit low for the vent to clear the plaster line on some regs."],
  ['Compliment the detail', "That reveal scribed to the wall rather than to the paper is the detail that makes the whole job look like a different price. Nice."],
  ['Compliment the detail', "Love that you shot the back of it. Most people only ever photograph the front and then wonder why it's short."],
  ['Share a war story', "Had a job exactly like this. Not the same material, same problem. Spent two days shimming and the customer still asked why it took so long."],
  ['Share a war story', "The old frames out is the best bit. Genuinely the only 30 seconds of any window job that feels like winning."],
  ['Recommendation', "Whatever you do, ask for the survey photos in writing before they order. A remade sash is never cheaper than checking."],
  ['Recommendation', "Might be worth asking them to put the internal and external colours in writing too. Interior never matches the sample."],
  ['Light disagreement', "Fair point, though — a 45 bay still loses you about a third of the glass to the sightlines. Cheaper on paper, darker in the room."],
  ['Light disagreement', "Depends on the wall. Solid 1930s and you're golden. 1970s extension and the reveal's lying to you the whole time."],
  ['Curious question', "Curious what this looked like before — just interested in whether the old frames were original or a 90s replacement. Changes the whole approach."],
  ['Curious question', "Was this a repeat job on the same site or a one-off? Makes a massive difference to how far you push the spec."],
  ['Tag-in friendly', "@[tag] this is the sort of thing that saves you a fortnight. The survey photos are the whole argument."],
  ['Community spirit', "This is a great thread actually. Bit more of this round here and less of 'my mate can do it for half that' would be an improvement for everyone."],
  ['Customer-side view', "As a customer this is genuinely useful — I had no idea cill projection was a thing and now I know to ask about it."],
  ['Customer-side view', "No idea what an astragal is. Just learned more from this than from the last three quotes I've had."],
  ['Reply to a reply', "Ha — yeah that came out wrong. I meant the sill, not the sale. The flood in my living room is a separate and ongoing situation."],
  ['Reply to a reply', "Genuinely didn't know that, thanks. That would absolutely explain what I'm looking at in my front room."],
  ['Late-night drive-by', "3am scroll and here I am learning about trickle vents. This algorithm has me figured out."],
  ['Simple + genuine', "Brilliant. That's exactly it, that's the whole thing. Genuinely helpful, cheers."],
];
$('#tpl-list').innerHTML = TPLS.map(([c, t]) => `<div class="tpl" data-t="${esc(t)}"><b>${esc(c)}</b>${esc(t)}</div>`).join('');
$('#tpl-list').onclick = e => {
  const t = e.target.closest('.tpl');
  if (t) copy(t.dataset.t, 'Comment copied');
};

const engKey = 'fenora.eng.' + new Date().toDateString();
const engGet = () => +(localStorage.getItem(engKey) || 0);
$('#eng-count').textContent = engGet();
$('#eng-plus').onclick = () => {
  const v = engGet() + 1;
  localStorage.setItem(engKey, v);
  $('#eng-count').textContent = v;
  if (v === 8) toast('Eight comments. That’s the routine done 🎉', 'ok');
};
$('#eng-reset').onclick = () => { localStorage.removeItem(engKey); $('#eng-count').textContent = 0; };

/* ══════════════ keyboard ══════════════ */
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!$('#drawer').hidden) return void ($('#drawer').hidden = true);
  if (!$('#setup').hidden) return void ($('#setup').hidden = true);
});

/* Keep a failed enhancement from leaving an invisible full-screen layer over the app. */
window.addEventListener('error', e => {
  ['drawer', 'setup'].forEach(id => { const el = document.getElementById(id); if (el) el.hidden = true; });
  const state = document.getElementById('save-state');
  if (state) { state.textContent = 'Something went wrong — reload'; state.className = 'err'; }
  console.error('Fenora UI error:', e.error || e.message);
});

})();
