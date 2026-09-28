/* Fenora Content Desk — app logic.
 *
 * The whole product in one sentence: this is the content, click to post.
 * Everything on the Today screen exists to make that one flow effortless;
 * the Calendar, Library and Settings exist to prepare it.
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

const downloadFile = (url, name) => {
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
};

/* ══════════════ state ══════════════ */
const LS     = 'fenora.desk.v2';      // the schedule
const LSET   = 'fenora.settings.v1';  // cadence + pillar mix

const DEFAULT_SETTINGS = {
  times: ['08:00', '18:30'],
  mix: { 'trade-pain':9, 'nerd-detail':8, 'customer-reality':6, 'planning':5, 'money':4,
         'contrarian':7, 'wip':3, 'build-in-public':2, 'team':2 },
};

const S = {
  lib: { pillars: [], tagsets: {}, discovery: [], posts: [] },
  posts: [],
  sched: {},
  settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
  images: new Set(), jpgs: new Set(),
  savedImgs: new Set(),
  cfg: { configured: {}, defaults: {}, persistent: true },
  filters: { q:'', pillar:'', format:'', status:'' },
  day: 0,                    // selected index in the 7-day strip
  calY: today().getFullYear(), calM: today().getMonth(),
};

const find = id => S.posts.find(x => x.id === id);
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
    try { localStorage.setItem(LS, JSON.stringify(S.sched)); } catch {}
    saveState('Saved ✓', 'saved');
    fetch('/api/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posts: S.sched, saved: new Date().toISOString() }),
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

/* ══════════════ images ══════════════ */
const aspectOf = p => (p.format === 'reel' || p.format === 'story') ? '9x16' : '4x5';
function imgURL(id, size) {
  const s = size || '4x5';
  if (S.jpgs.has(`${id}_${s}.jpg`)) return `/render/jpg/${id}_${s}.jpg`;
  if (S.images.has(`${id}_${s}.png`)) return `/render/png/${id}_${s}.png`;
  return null;
}
const dlURL = imgURL;
function imgName(p, size) {
  const url = imgURL(p.id, size || aspectOf(p));
  return url ? url.split('/').pop() : `${p.id}_${size || aspectOf(p)}.png`;
}
const isPublicHost = () => !/^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname) && !/\.local$/.test(location.hostname);
function publicImgURL(id, size) {
  const u = imgURL(id, size);
  return u ? location.origin + u : null;
}

/* ══════════════ boot ══════════════ */
(async function boot() {
  try {
    S.lib = await (await fetch('/content/posts.json')).json();
    S.posts = S.lib.posts;
  } catch {
    document.body.innerHTML = '<div class="empty" style="margin:80px auto;max-width:480px"><h2>Could not load the content library</h2><p>Make sure <code>content/posts.json</code> exists — run <code>cd content &amp;&amp; python3 build.py</code>.</p></div>';
    return;
  }
  try {
    const r = await fetch('/api/load');
    if (r.ok) S.sched = (await r.json()).posts || {};
  } catch {}
  try { S.sched = { ...S.sched, ...JSON.parse(localStorage.getItem(LS) || '{}') }; } catch {}
  migrate();
  try {
    const im = await (await fetch('/render/images.json')).json();
    (im.png || []).forEach(f => S.images.add(f));
    (im.jpg || []).forEach(f => S.jpgs.add(f));
  } catch {}

  $('#f-pillar').innerHTML = '<option value="">All pillars</option>' +
    S.lib.pillars.map(p => `<option value="${p.key}">${esc(p.label)}</option>`).join('');
  $('#f-format').innerHTML = '<option value="">All formats</option>' +
    Object.entries(PFMT).map(([k,v]) => `<option value="${k}">${v}</option>`).join('');

  renderMix();
  loadCfg();
  renderAll();
})();

function renderAll() { renderToday(); drawCal(); renderLib(); }

/* ══════════════ tabs ══════════════ */
function tab(n) {
  $$('.tab').forEach(t => t.classList.remove('on'));
  $('#tab-' + n).classList.add('on');
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === n));
  if (n === 'today') renderToday();
  if (n === 'library') renderLib();
  if (n === 'calendar') drawCal();
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
  $('#t-date').textContent = S.day === 0
    ? `Today — ${d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`
    : d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  $('#t-sum').innerHTML = dayPosts.length
    ? `${dayPosts.length} post${dayPosts.length > 1 ? 's' : ''} · ${done} done${done === dayPosts.length && dayPosts.length ? ' · all green ✓' : ''}` +
      (st > 1 ? ` · <span title="consecutive days with everything posted">🔥 ${st}-day streak</span>` : '')
    : `Nothing planned for this day yet.`;

  $('#t-posts').innerHTML = dayPosts.length
    ? dayPosts.map(p => todayCard(p)).join('')
    : `<div class="empty">
         <h2>Nothing planned for ${S.day === 0 ? 'today' : d.toLocaleDateString('en-GB', { weekday: 'long' })}</h2>
         <p>Press <b>⚡ Plan this week</b> and the next seven days are ready to post.</p>
         <button class="btn" data-plan>⚡ Plan this week</button>
       </div>`;
}

function todayCard(p) {
  const s = sched(p.id);
  const im = imgURL(p.id, aspectOf(p));
  const plats = platsOf(p, s);
  const allDone = isFullyPosted(p);
  const slot = (s.time || '').slice(0, 5);

  return `<article class="tpost${allDone ? ' all-done' : ''}" data-id="${p.id}">
    <div class="tp-img" data-lb="${p.id}" title="Click to enlarge">
      ${im ? `<img src="${im}" alt="">`
           : `<div class="ph">${esc(field(p, s, 'hook'))}</div>`}
    </div>
    <div class="tp-body">
      <div class="tp-meta">
        ${slot ? `<span class="pill slot-pill">${slot}</span>` : ''}
        <span class="pill">${esc(p.pillar_label)}</span>
        <span class="pill">${PFMT[p.format] || esc(p.format)}</span>
        <span class="pill id">${esc(p.id)}</span>
      </div>
      <h2>${esc(field(p, s, 'hook'))}</h2>
      <div class="tp-rows">
        ${plats.map(k => {
          const posted = isPosted(p, s, k);
          const canApi = S.cfg.configured && S.cfg.configured[k === 'IG' ? 'instagram' : k === 'FB' ? 'facebook' : 'linkedin'];
          return `<div class="pt-row${posted ? ' done' : ''}">
            <span class="pt-name"><i class="dot ${k}"></i>${PLAT_LABEL[k] || k}</span>
            <button class="btn sm${posted ? ' ghost' : ''}" data-copy="${k}">📋 Copy caption &amp; save image</button>
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
        ${im ? `<a class="btn ghost sm" href="${im}" download="${esc(imgName(p))}">Download image</a>` : ''}
        <button class="btn ghost sm" data-edit="${p.id}">Edit</button>
        <button class="btn ghost sm" data-unplan="${p.id}">Unplan</button>
      </div>
    </div>
  </article>`;
}

/* one click = caption on the clipboard + image in Downloads */
async function copyAndSave(id, plat) {
  const p = find(id), s = sched(id);
  if (!p) return;
  const text = captionFor(p, s, plat);
  const im = dlURL(p.id, aspectOf(p));
  let msg;
  if (im) {
    const key = id + aspectOf(p);
    if (!S.savedImgs.has(key)) {
      downloadFile(im, imgName(p));
      S.savedImgs.add(key);
      msg = `${PLAT_LABEL[plat]} caption copied & image saved — now paste it in`;
    } else {
      msg = `${PLAT_LABEL[plat]} caption copied ✓ (image already saved)`;
    }
  } else {
    msg = `${PLAT_LABEL[plat]} caption copied ✓ (no image rendered yet — run the renderer)`;
  }
  await copy(text, msg);
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
$('#t-posts').addEventListener('click', e => {
  const copyBtn = e.target.closest('[data-copy]');
  if (copyBtn) return copyAndSave(copyBtn.closest('.tpost').dataset.id, copyBtn.dataset.copy);
  const postBtn = e.target.closest('[data-post]');
  if (postBtn) return togglePosted(postBtn.closest('.tpost').dataset.id, postBtn.dataset.post);
  const now = e.target.closest('[data-now]');
  if (now) return postNow(now.closest('.tpost').dataset.id, now.dataset.now);
  const ed = e.target.closest('[data-edit]');
  if (ed) return openPost(ed.dataset.edit);
  const up = e.target.closest('[data-unplan]');
  if (up) return unplan(up.dataset.unplan);
  const lb = e.target.closest('[data-lb]');
  if (lb) return lightbox(lb.dataset.lb);
  if (e.target.closest('[data-plan]')) return planAndReport(7);
});

function planAndReport(n) {
  const placed = planDays(n);
  if (placed) {
    S.day = 0;
    renderAll();
    toast(`${placed} posts planned — ${n === 7 ? 'your week' : `the next ${n} days`} is ready ⚡`, 'ok');
  } else {
    toast('Nothing left in the library to plan', 'err');
  }
}

/* ══════════════ lightbox ══════════════ */
function lightbox(id) {
  const url = imgURL(id, aspectOf(find(id) || {}));
  if (!url) return;
  $('#lb-img').src = url;
  $('#lightbox').hidden = false;
}
$('#lightbox').addEventListener('click', e => {
  if (e.target.closest('[data-lb-close]') || e.target.id === 'lb-img') $('#lightbox').hidden = true;
});

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

function renderLib() {
  const f = S.filters, q = f.q.toLowerCase();
  const list = S.posts.filter(p => {
    if (f.pillar && p.pillar !== f.pillar) return false;
    if (f.format && p.format !== f.format) return false;
    if (f.status && stOf(p) !== f.status) return false;
    if (q && !(field(p, sched(p.id), 'hook') + ' ' + field(p, sched(p.id), 'body') + ' ' + p.id).toLowerCase().includes(q)) return false;
    return true;
  });
  $('#lib-count').textContent = `${list.length} of ${S.posts.length} posts`;
  $('#lib').innerHTML = list.map(p => {
    const s = sched(p.id), st = stOf(p), im = imgURL(p.id);
    return `<article class="pcard" data-id="${p.id}" draggable="true" tabindex="0">
      <div class="thumb">
        ${im ? `<img loading="lazy" src="${im}" alt="">` : `<div class="ph">${esc(field(p, s, 'hook'))}</div>`}
        <div class="th-top"><span class="pill id">${esc(p.id)}</span></div>
        <div class="th-over"><div class="k">${esc(field(p, s, 'hook'))}</div></div>
      </div>
      <div class="foot">
        <span class="pill">${PFMT[p.format] || esc(p.format)}</span>
        <span class="pill ${st}">${st === 'draft' ? 'unscheduled' : st === 'posted' ? 'posted' : esc(s.date.slice(5))}</span>
        <div class="dots">${platsOf(p, s).map(x => `<i class="${x}"></i>`).join('')}</div>
      </div>
    </article>`;
  }).join('') || '<div class="empty">Nothing matches those filters.</div>';
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
  $('#c-id').textContent = p.id;
  $('#c-pillar').textContent = p.pillar_label;
  $('#c-format').textContent = PFMT[p.format] || p.format;
  $('#c-hook').value = field(p, s, 'hook');
  $('#c-body').value = field(p, s, 'body');
  $('#c-cta').value = field(p, s, 'cta');
  $('#c-lilead').value = s.liLead || p.li_lead || '';
  $('#c-prompt').value = p.image_prompt || '';
  $('#c-imgurl').value = s.imgurl || '';
  $('#c-time').value = s.time || S.settings.times[0] || '08:00';
  $('#c-platforms').innerHTML = ['IG','FB','LI'].map(k =>
    `<span class="chip${platsOf(p, s).includes(k) ? ' on' : ''}" data-p="${k}">${PLAT_LABEL[k]}</span>`).join('');
  capPlat = platsOf(p, s).includes(capPlat) ? capPlat : (platsOf(p, s)[0] || 'IG');
  $('#cap-tabs').innerHTML = ['IG','FB','LI'].map(k =>
    `<span class="chip${k === capPlat ? ' on' : ''}" data-c="${k}">${PLAT_LABEL[k]}</span>`).join('');
  $('#c-size').value = aspectOf(p);
  setImage();
  populateDates();
  showCap();
  $('#drawer').hidden = false;
}

function setImage() {
  const p = find(CUR); if (!p) return;
  const url = imgURL(p.id, $('#c-size').value);
  const im = $('#c-image'), ph = $('#c-img-empty');
  if (url) {
    im.src = url; im.style.display = 'block'; ph.hidden = true;
    $('#c-dl').href = url; $('#c-dl').setAttribute('download', imgName(p, $('#c-size').value));
    $('#c-open').href = url;
    $('#c-dl').style.display = ''; $('#c-open').style.display = '';
  } else {
    im.style.display = 'none'; ph.hidden = false;
    $('#c-dl').style.display = 'none'; $('#c-open').style.display = 'none';
  }
}
$('#c-size').onchange = setImage;

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
  const map = { 'c-hook':'hook', 'c-body':'body', 'c-cta':'cta', 'c-imgurl':'imgurl' };
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
    ['Facebook Page', c.facebook, 'Posts go straight to your Page'],
    ['Instagram',     c.instagram, 'Needs a public image URL (Vercel counts)'],
    ['LinkedIn Page', c.linkedin,  'Text posts work anywhere'],
    ['Image host',    c.imageHost, 'Optional — for Instagram from a laptop'],
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
    imageHost: { uploadEndpoint: $('#s-host').value },
  };
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
    if (!S.posts.length) return toast('Library is empty', 'err');
    dl('fenora-library.csv',
      [Object.keys(S.posts[0]).map(ce).join(','), ...S.posts.map(p => Object.values(p).map(ce).join(','))].join('\n'));
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
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ posts: S.sched, settings: S.settings }, null, 1)], { type: 'application/json' }));
  a.download = 'fenora-schedule-backup.json'; a.click();
  toast('Backup downloaded', 'ok');
};
$('#s-restore').onclick = () => $('#s-file').click();
$('#s-file').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    S.sched = { ...S.sched, ...(data.posts || {}) };
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

/* ══════════════ PUBLISH (optional API mode) ══════════════ */
async function postNow(id, plat) {
  const p = find(id), s = sched(id);
  if (!p) return;
  const caption = captionFor(p, s, plat);
  const to = { IG:'ig', FB:'fb', LI:'li' }[plat];
  const body = { to: [to], caption, message: caption };

  let img = s.imgurl || (isPublicHost() ? publicImgURL(p.id, aspectOf(p)) : null);
  if (plat === 'IG') {
    if (!img) {
      toast('Instagram needs a public image URL — use copy mode, or add one in Edit → Advanced', 'err');
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
  if (!$('#lightbox').hidden) return void ($('#lightbox').hidden = true);
  if (!$('#drawer').hidden) return void ($('#drawer').hidden = true);
  if (!$('#setup').hidden) return void ($('#setup').hidden = true);
});

})();
