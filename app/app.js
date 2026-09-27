/* Fenora Content Desk — app logic */
(() => {
'use strict';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const S  = { posts: [], sched: {}, images: new Set(), jpgs: new Set(), cfg: { configured: {}, defaults: {} },
             filters: { q:'', pillar:'', format:'', status:'' }, today: null };
const LS = 'fenora.desk.v2';
const PFMT = { static:'Static', reel:'Reel', carousel:'Carousel', poll:'Poll', quiz:'Quiz', story:'Story', text:'Long-form' };
const PPLAT = [['IG','Instagram'],['FB','Facebook'],['LI','LinkedIn']];
const HEX  = { IG:'#e1306c', FB:'#1877f2', LI:'#0a66c2' };

const sched = id => S.sched[id] || (S.sched[id] = { date:'', time:'08:15', status:'draft', hook:'', body:'',
  cta:'', liLead:'', imgurl:'', platforms:[], caps:{} });
const stOf  = p => { const s = sched(p.id); return s.status === 'posted' ? 'posted' : s.date ? 'scheduled' : 'draft'; };
const esc   = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
const iso   = d => d.toISOString().slice(0, 10);
const find  = id => S.posts.find(x => x.id === id);

let saveT;
const save = () => { clearTimeout(saveT); saveT = setTimeout(() => {
  localStorage.setItem(LS, JSON.stringify(S.sched));
  fetch('../api/save', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ posts:S.sched, saved:new Date().toISOString() }) }).catch(()=>{});
}, 400); };

const toast = (m,k='') => { const t=$('#toast'); t.textContent=m; t.className='toast on '+k;
  setTimeout(()=>t.className='toast', 2600); };
const copy = async (txt,msg) => { try { await navigator.clipboard.writeText(txt); toast(msg||'Copied','ok'); }
  catch { const a=document.createElement('textarea'); a.value=txt; document.body.appendChild(a);
    a.select(); document.execCommand('copy'); a.remove(); toast(msg||'Copied','ok'); } };

/* Image files produced by render/render.py → served at /render/png/
   tools/to_jpg.py also writes a matching set into /render/jpg/. We prefer the
   JPEG when it exists (5× lighter for the browser) and fall back to the PNG. */
const imgURL = (id,size) => {
  const s = size || '4x5';
  const j = `${id}_${s}.jpg`, p = `${id}_${s}.png`;
  if (S.jpgs.has(j)) return `../render/jpg/${j}`;
  return S.images.has(p) ? `../render/png/${p}` : null;
};
const dlURL = (id,size) => { const s = size || '4x5';
  return S.jpgs.has(`${id}_${s}.jpg`) ? `../render/jpg/${id}_${s}.jpg`
       : S.images.has(`${id}_${s}.png`) ? `../render/png/${id}_${s}.png` : null; };
const aspectOf = p => p.format === 'reel' || p.format === 'story' ? '9x16' : '4x5';

/* ══════════════ CAPTION ENGINE ══════════════ */
const BANNER = '— fenora.pro · one record for the whole window job';
const dedup = (lead, body) => {
  const n = s => s.toLowerCase().replace(/[^a-z0-9]+/g,'').slice(0,60);
  const L = body.split('\n'); while (L.length && !L[0].trim()) L.shift();
  if (L.length) { const a=n(lead), b=n(L[0]); if (a && b && (a.startsWith(b)||b.startsWith(a)||a===b)) L.shift(); }
  return L.join('\n').trim();
};
const flatten = b => { let n=0; return b.split('\n').map(l=>{ const m=l.match(/^\s*Slide\s*\d*\s*[:.—-]\s*(.+)$/);
  return m ? `${++n}. ${m[1].trim()}` : l; }).join('\n').trim(); };

function autoCap(p, plat) {
  const s = sched(p.id);
  const hook = s.hook || p.hook, body = s.body || p.body, cta = s.cta ?? p.cta, lead = s.liLead || '';
  const b = dedup(hook, body);
  // Build with spreads, never a nested array — Array.join() would stringify
  // an inner ['', x] as ",x" and glue a stray comma onto the caption.
  const gap = x => x ? ['', x] : [];
  if (plat === 'IG') return [hook,'',b,...gap(cta),'',BANNER,'',
    p.caption_ig.split('\n').filter(l=>l.startsWith('#')).join(' ')].filter(Boolean).join('\n');
  if (plat === 'FB') return [hook,'',b,...gap(cta),'',BANNER].filter(Boolean).join('\n');
  const L = lead || hook, bl = lead ? dedup(lead, body) : b;
  return [L,...gap(p.format==='carousel' ? flatten(bl) : bl),...gap(cta),'','— fenora.pro']
    .filter(Boolean).join('\n');
}

/* ══════════════ BOOT ══════════════ */
(async function boot(){
  const lib = await (await fetch('../content/posts.json')).json();
  S.posts = lib.posts;
  try { const r = await fetch('../content/schedule.json'); if (r.ok) S.sched = (await r.json()).posts || {}; } catch {}
  S.sched = { ...S.sched, ...JSON.parse(localStorage.getItem(LS) || '{}') };
  S.posts.forEach(p => { const s = sched(p.id);
    if (!s.hook) s.hook = p.hook; if (!s.body) s.body = p.body;
    if (!s.platforms?.length) s.platforms = p.platforms.split(','); if (s.cta === undefined) s.cta = p.cta; });
  try { const im = await (await fetch('../api/images')).json();
    (im.files||[]).forEach(f => S.images.add(f));
    (im.jpgs||[]).forEach(f => S.jpgs.add(f)); } catch {}

  const sel = $('#f-pillar');
  sel.innerHTML = '<option value="">All pillars</option>' +
    lib.pillars.map(p => `<option value="${p.key}">${p.label}</option>`).join('');
  const sf = $('#f-format');
  sf.innerHTML = '<option value="">All formats</option>' +
    Object.entries(PFMT).map(([k,v]) => `<option value="${k}">${v}</option>`).join('');

  loadCfg(); render(); drawCal(); renderToday();
})();

/* ══════════════ TABS ══════════════ */
const tab = n => { $$('.tab').forEach(t=>t.classList.remove('on'));
  $('#tab-'+n).classList.add('on'); $$('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===n));
  if (n==='today') renderToday(); if (n==='library') render(); if (n==='calendar') drawCal(); };
$('#tabs').onclick = e => { const b=e.target.closest('button'); if (b) tab(b.dataset.tab); };
$$('.brand').forEach(b => b.onclick = e => { e.preventDefault(); tab('today'); });

/* ══════════════ LIBRARY ══════════════ */
$('#q').oninput        = e => { S.filters.q = e.target.value; render(); };
$('#f-pillar').onchange= e => { S.filters.pillar = e.target.value; render(); };
$('#f-format').onchange= e => { S.filters.format = e.target.value; render(); };
$('#f-status').onchange= e => { S.filters.status = e.target.value; render(); };

function render(){
  const f = S.filters, q = f.q.toLowerCase();
  const list = S.posts.filter(p => {
    if (f.pillar && p.pillar !== f.pillar) return false;
    if (f.format && p.format !== f.format) return false;
    if (f.status && stOf(p) !== f.status) return false;
    if (q && !(p.hook+' '+p.body+' '+p.id).toLowerCase().includes(q)) return false;
    return true;
  });
  $('#lib-count').textContent = `${list.length} of ${S.posts.length} posts`;
  $('#lib').innerHTML = list.map(p => {
    const s = sched(p.id), st = stOf(p), im = imgURL(p.id);
    return `<article class="pcard" data-id="${p.id}" draggable="true">
      <div class="thumb">${im ? `<img loading="lazy" src="${im}" alt="">` : ''}
        <div class="th-top"><span class="pill id">${p.id}</span></div>
        <div class="th-over"><div class="k">${esc(s.hook||p.hook)}</div></div></div>
      <div class="foot"><span class="pill">${PFMT[p.format]||p.format}</span>
        <span class="pill ${st}">${st==='draft'?'unscheduled':st==='posted'?'posted':s.date.slice(5)}</span>
        <div class="dots">${(s.platforms||[]).map(x=>`<i class="${x}"></i>`).join('')}</div></div>
    </article>`;
  }).join('') || '<div class="empty">Nothing matches those filters.</div>';
  $$('#cal-grid .day').forEach(redrawDay);
}
$('#lib').addEventListener('click', e => { const c = e.target.closest('.pcard'); if (c) openPost(c.dataset.id); });
$('#lib').addEventListener('dragstart', e => { const c = e.target.closest('.pcard');
  if (c) e.dataTransfer.setData('text/plain', c.dataset.id); });

/* ══════════════ TODAY ══════════════ */
function nextDays(n=7){
  const out = []; const d = new Date(); d.setHours(0,0,0,0);
  for (let i=0;i<n;i++){ const x=new Date(d); x.setDate(d.getDate()+i); out.push(x); }
  return out;
}
function renderToday(){
  const days = nextDays(7);
  if (!S.today || days[0].toDateString() !== new Date().toDateString()) S.today = 0;
  const strip = days.map((d,i) => {
    const ids = S.posts.filter(p => sched(p.id).date === iso(d)).map(p => p.id);
    const dots = ids.flatMap(id => (sched(id).platforms||[]).map(x => `<i style="background:${HEX[x]}"></i>`)).slice(0,6).join('');
    return `<button data-d="${i}" class="${i===S.today?'on':''}">
      <small>${d.toLocaleDateString('en-GB',{weekday:'short'})}</small><b>${d.getDate()}</b>
      <div class="dotrow">${dots || '<i style="background:#2a2f39"></i>'}</div></button>`;
  }).join('');
  const d = days[S.today];
  const id = (S.posts.find(p => sched(p.id).date === iso(d)) || {}).id;
  const p = id ? find(id) : null;
  const im = p ? imgURL(p.id) : null;
  const dl = p ? dlURL(p.id) : null;
  const side = p ? `
    <h2>${esc(sched(p.id).hook || p.hook)}</h2>
    <p class="lede">${p.pillar_label} · ${PFMT[p.format]||p.format} · <span class="mono">${p.id}</span></p>
    ${(sched(p.id).platforms||[]).map(k => {
      const [key,label] = PPLAT.find(x=>x[0]===k) || [k,k];
      const t = sched(p.id).caps?.[k] ?? autoCap(p,key);
      return `<div class="plat"><div class="plat-head">
          <i class="dot ${key}" style="width:8px;height:8px;border-radius:50%;background:${HEX[key]}"></i>
          <b>${label}</b><div class="grow"></div>
          <span class="muted small">${t.length} chars</span></div>
        <textarea data-pl="${key}" readonly>${esc(t)}</textarea>
        <div class="bar"><button class="btn sm" data-copy="${key}">Copy ${label} caption</button></div>
      </div>`; }).join('')}
    <div class="row gap" style="margin-top:14px">
      <a class="btn ghost sm" href="${dl || '#'}" download>Download image</a>
      <button class="btn ghost sm" data-edit="${p.id}">Edit</button>
    </div>
    <button class="done ${sched(p.id).status==='posted'?'on':''}" data-done="${p.id}">
      ${sched(p.id).status==='posted' ? '✓ Marked as posted' : 'Mark as posted'}</button>`
  : `<div class="empty" style="padding:40px 0">
       <p><b>Nothing scheduled for ${d.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}.</b></p>
       <p class="lede">Hit <b>Fill 90 days</b> in the Calendar tab, or drag a card over from the Library.</p>
       <button class="btn" data-gocal>Go to Calendar</button></div>`;
  $('#today').innerHTML = `<div>${strip ? `<div class="daystrip">${strip}</div>` : ''}
      <div class="today-img">${im ? `<img src="${im}" alt="">` : '<div style="padding:60px 20px;text-align:center;color:var(--tx3)">No image rendered yet</div>'}</div>
    </div><div class="today-side">${side}</div>`;
}
$('#today').addEventListener('click', e => {
  const d = e.target.closest('.daystrip button'); if (d) { S.today = +d.dataset.d; return renderToday(); }
  const c = e.target.closest('[data-copy]');
  if (c) { const p = find(S.todayPostId()); if (p) { capPlat = c.dataset.copy; showCap(); return copy($('#cap').value, c.dataset.copy + ' caption copied'); } }
  const ed = e.target.closest('[data-edit]'); if (ed) return openPost(ed.dataset.edit);
  const dn = e.target.closest('[data-done]');
  if (dn) { const s = sched(dn.dataset.done); s.status = s.status==='posted' ? 'scheduled' : 'posted'; save(); render(); return renderToday(); }
  if (e.target.closest('[data-gocal]')) return tab('calendar');
});
function todayPostId(){
  const d = nextDays(7)[S.today];
  return (S.posts.find(p => sched(p.id).date === iso(d)) || {}).id || null;
}
$('#today').addEventListener('click', e => {
  const d = e.target.closest('.daystrip button'); if (d) { S.today = +d.dataset.d; return renderToday(); }
  const c = e.target.closest('[data-copy]');
  if (c) { const id = S.todayPostId(); if (id) return copy(autoCap(find(id), c.dataset.copy), c.dataset.copy + ' caption copied'); }
  const ed = e.target.closest('[data-edit]'); if (ed) return openPost(ed.dataset.edit);
  const dn = e.target.closest('[data-done]');
  if (dn) { const s = sched(dn.dataset.done); s.status = s.status==='posted' ? 'scheduled' : 'posted'; save(); render(); renderCalEvents(); return renderToday(); }
  if (e.target.closest('[data-gocal]')) return tab('calendar');
});

/* ══════════════ COMPOSER DRAWER ══════════════ */
let CUR = null, capPlat = 'IG';
function openPost(id){
  CUR = id; const p = find(id), s = sched(id);
  $('#c-id').textContent = id; $('#c-pillar').textContent = p.pillar_label;
  $('#c-format').textContent = PFMT[p.format] || p.format;
  $('#c-hook').value = s.hook; $('#c-body').value = s.body; $('#c-lilead').value = s.liLead || '';
  $('#c-prompt').value = p.image_prompt; $('#c-imgurl').value = s.imgurl || '';
  $('#c-time').value = s.time || '08:15';
  $('#c-platforms').innerHTML = PPLAT.map(([k,l]) =>
    `<span class="chip${(s.platforms||[]).includes(k)?' on':''}" data-p="${k}">${l}</span>`).join('');
  $('#cap-tabs').innerHTML = PPLAT.map(([k,l]) =>
    `<span class="chip${k===capPlat?' on':''}" data-c="${k}">${l}</span>`).join('');
  const a = aspectOf(p);
  $('#c-size').value = a.replace(':','x');
  setImage();
  populateDates(); showCap();
  $('#drawer').hidden = false;
}
function setImage(){
  const p = find(CUR); if (!p) return;
  const url = imgURL(CUR, $('#c-size').value);
  const im = $('#c-image');
  if (url) { im.src = url; im.style.display='block'; $('#c-dl').href = url; $('#c-open').href = url;
    $('#c-dl').style.display=''; $('#c-open').style.display=''; }
  else { im.style.display='none'; $('#c-dl').style.display='none'; $('#c-open').style.display='none'; }
}
$('#c-size').onchange = setImage;
$$('[data-close]').forEach(b => b.onclick = () => { $('#drawer').hidden = true; save(); });
$$('[data-setup-close]').forEach(b => b.onclick = () => $('#setup').hidden = true);
$('#btn-setup').onclick = () => { $('#setup').hidden = false; loadCfg(); };
$('#c-platforms').onclick = e => { const c = e.target.closest('.chip'); if (!c) return;
  const s = sched(CUR), k = c.dataset.p, i = s.platforms.indexOf(k);
  i < 0 ? s.platforms.push(k) : s.platforms.splice(i,1);
  c.classList.toggle('on'); save(); render(); };
$('#cap-tabs').onclick = e => { const c = e.target.closest('.chip'); if (!c) return; capPlat = c.dataset.c;
  $$('#cap-tabs .chip').forEach(x => x.classList.toggle('on', x===c)); showCap(); };
$('#cap-copy').onclick = () => copy($('#cap').value, capPlat + ' caption copied');
$('#cap-reset').onclick = () => { const s = sched(CUR); if (s.caps) delete s.caps[capPlat]; save(); showCap(); toast('Reset to auto'); };
$('#c-copy-prompt').onclick = () => copy($('#c-prompt').value, 'Image prompt copied');
$('#c-date').onchange = e => { const s = sched(CUR); s.date = e.target.value;
  if (s.date && s.status==='draft') s.status='scheduled'; if (!s.date) s.status='draft';
  save(); render(); drawCal(); renderToday(); toast(s.date?'Scheduled '+s.date:'Unscheduled','ok'); };
$('#c-time').onchange = e => { sched(CUR).time = e.target.value; save(); drawCal(); };

$('#drawer').addEventListener('input', e => {
  const s = sched(CUR); if (!s) return;
  const map = { 'c-hook':'hook','c-body':'body','c-lilead':'liLead','c-imgurl':'imgurl' };
  if (map[e.target.id]) { s[map[e.target.id]] = e.target.value;
    if (s.caps && ['c-hook','c-body','c-lilead'].includes(e.target.id)) delete s.caps[capPlat];
    save(); if (e.target.id==='c-hook'||e.target.id==='c-body') { showCap(); render(); } }
  if (e.target.id === 'cap') { (s.caps ||= {})[capPlat] = e.target.value; save(); capMeta(); }
});
function populateDates(){
  const s = sched(CUR), out = ['<option value="">— unscheduled —</option>'], d = new Date();
  for (let i=0;i<120;i++){ const x=new Date(d); x.setDate(d.getDate()+i);
    out.push(`<option value="${iso(x)}"${s.date===iso(x)?' selected':''}>${x.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}</option>`); }
  $('#c-date').innerHTML = out.join('');
}
function capMeta(){
  const t = $('#cap').value, lim = capPlat==='FB' ? 63206 : 3000;
  $('#cap-count').textContent = `${t.length} / ${lim}` + (t.length>lim ? ' ⚠️ over' : '');
}
function showCap(){
  const p = find(CUR); if (!p) return;
  $('#cap').value = sched(CUR).caps?.[capPlat] ?? autoCap(p, capPlat);
  capMeta();
}

/* ══════════════ CALENDAR ══════════════ */
let calY = new Date().getFullYear(), calM = new Date().getMonth();
$('#cal-prev').onclick = () => { calM--; if (calM<0){calM=11;calY--;} drawCal(); };
$('#cal-next').onclick = () => { calM++; if (calM>11){calM=0;calY++;} drawCal(); };
function drawCal(){
  const first = new Date(calY, calM, 1), start = (first.getDay()+6)%7;
  const startD = new Date(calY, calM, 1-start);
  $('#cal-title').textContent = first.toLocaleString('en-GB',{month:'long',year:'numeric'});
  $('#cal-dow').innerHTML = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
    .map((x,i)=>`<div class="${[1,2,4].includes(i)?'hl':''}">${x}</div>`).join('');
  $('#cal-grid').innerHTML = Array.from({length:42},(_,i)=>{
    const d = new Date(startD); d.setDate(startD.getDate()+i);
    return `<div class="day${d.getMonth()!==calM?' out':''}${iso(d)===iso(new Date())?' today':''}" data-d="${iso(d)}">
      <div class="dn">${d.getDate()}</div><div class="evs"></div></div>`;
  }).join('');
  $$('#cal-grid .day').forEach(redrawDay);
}
function redrawDay(el){
  const ds = el.dataset.d;
  el.querySelector('.evs').innerHTML = S.posts.filter(p=>sched(p.id).date===ds).map(p=>{
    const s = sched(p.id), im = imgURL(p.id);
    return `<div class="ev${s.status==='posted'?' published':''}" data-id="${p.id}" draggable="true">
      ${im?`<img loading="lazy" src="${im}" alt="">`:''}
      <div class="dots">${(s.platforms||[]).map(x=>`<i class="${x}"></i>`).join('')}</div></div>`;
  }).join('');
}
function renderCalEvents(){ $$('#cal-grid .day').forEach(redrawDay); }
$('#cal-grid').addEventListener('click', e => {
  const ev = e.target.closest('.ev'); if (ev) { e.stopPropagation(); return openPost(ev.dataset.id); }
  const d = e.target.closest('.day'); if (d) fillDay(d.dataset.d);
});
$('#cal-grid').addEventListener('dragover', e => { const d=e.target.closest('.day');
  if (d) { e.preventDefault(); d.classList.add('dragover'); } });
$('#cal-grid').addEventListener('dragleave', e => { const d=e.target.closest('.day'); if (d) d.classList.remove('dragover'); });
$('#cal-grid').addEventListener('drop', e => { e.preventDefault();
  const d = e.target.closest('.day'); if (!d) return; d.classList.remove('dragover');
  const id = e.dataTransfer.getData('text/plain'), s = sched(id);
  s.date = d.dataset.d; s.status = 'scheduled'; save(); redrawDay(d); render(); renderToday();
  toast(`${id} → ${d.dataset.d}`,'ok'); });
function fillDay(ds){
  const used = new Set(S.posts.filter(p=>sched(p.id).date===ds).map(p=>p.id));
  const pool = S.posts.filter(p=>!used.has(p.id) && stOf(p)==='draft');
  const dow = new Date(ds).getDay();
  let p = (dow===2||dow===5) ? pool.find(x=>x.format==='reel') : null;
  p = p || pool[0];
  if (!p) return toast('Nothing left to add on '+ds);
  const s = sched(p.id); s.date = ds; s.status='scheduled';
  s.time = (dow===2||dow===5) && p.format==='reel' ? '18:30' : (s.time||'08:15');
  save(); redrawDay($(`.day[data-d="${ds}"]`)); render(); renderToday();
  toast(`${p.id} added to ${ds}`,'ok');
}

/* ══════════════ AUTO-SCHEDULE ══════════════ */
$('#btn-autofill2').onclick = () => { $('#setup').hidden = false; setTimeout(autofill, 100); };
$('#s-resched').onclick = () => { S.posts.forEach(p=>{ const s=sched(p.id); if (s.status!=='posted') s.date=''; });
  save(); autofill(90); };
function autofill(nDays=90){
  const perWeek = Math.max(1, +$('#s-perweek').value || 5);
  const time = $('#s-time').value || '08:15';
  const mix = {}; $$('#s-mix input').forEach(i => mix[i.dataset.p] = +i.value);
  const tot = Object.values(mix).reduce((a,b)=>a+b,0) || 1;
  const used = S.posts.filter(p => stOf(p)!=='draft');
  const avail = S.posts.filter(p => stOf(p)==='draft').map(p => p.id);
  const taken = new Set(used.map(p=>p.id));
  const start = new Date(); start.setHours(0,0,0,0);
  const count = {}, lastUsed = {}, weekOf = d => Math.floor((new Date(d)-start)/6048e5);
  let placed = 0;
  for (let i=0;i<nDays && placed<avail.length;i++){
    const d = new Date(start); d.setDate(start.getDate()+i);
    const dow = d.getDay(); if (dow<1||dow>5) continue;
    const isReelDay = dow===2||dow===5, isWed = dow===3;
    const wk = weekOf(d);
    if (used.filter(p=>{ const x=sched(p.id).date; return x && weekOf(x)===wk; }).length >= perWeek) continue;
    const score = Object.entries(mix).filter(([,w])=>w>0).map(([pp,w])=>{
      const deficit = w/tot*perWeek - (count[pp+':'+wk]||0);
      const fairness = ((placed-(lastUsed[pp]??-99))/Math.max(avail.length,1))*2;
      return [pp, deficit+fairness]; }).sort((a,b)=>b[1]-a[1]);
    const want = score[0] ? score[0][0] : null;
    let idx = avail.findIndex(id=>!taken.has(id) && (!want || find(id).pillar===want));
    if (idx<0) idx = avail.findIndex(id=>!taken.has(id)); if (idx<0) break;
    let id = avail[idx];
    if (isReelDay) { const u = avail.find(x=>!taken.has(x)&&want&&find(x).pillar===want&&['reel','story'].includes(find(x).format)); if (u) id=u; }
    else if (isWed)  { const u = avail.find(x=>!taken.has(x)&&want&&find(x).pillar===want&&find(x).platforms.includes('LI')&&find(x).format==='text'); if (u) id=u; }
    taken.add(id);
    const s = sched(id), pl = find(id).pillar;
    s.date = iso(d); s.time = (isReelDay && find(id).format==='reel') ? '18:30' : time; s.status='scheduled';
    count[pl+':'+wk] = (count[pl+':'+wk]||0)+1; lastUsed[pl] = placed; placed++;
  }
  save(); drawCal(); render(); renderToday();
  toast(`${placed} posts scheduled across ${nDays} days`,'ok');
}

/* ══════════════ ENGAGE ══════════════ */
const TPLS = [
  ['Add a trade fact',"That's the bit nobody checks — is the sill actually going to have a fall on that? Because if the render's proud you'll never get drainage without packing it out."],
  ['Add a trade fact',"Half of those are the render, not the window. DPO is right on though — once it's gone you're on the scaff for every fitter after you."],
  ['Agree + expand',"Yep. And the bit that gets you is the reveal. Everyone agrees on the door, nobody ever measures the opening underneath it."],
  ['Agree + expand',"This is every job. The thing nobody photographs is the thing that comes back three weeks later."],
  ['Humour, self-deprecate',"Straight up watched this with the sound on and went 'oh god' — I've had that exact call and I did exactly that."],
  ['Humour, self-deprecate',"Saving this for the next time a customer says it's an easy fit. Absolutely not saying it to their face, obviously."],
  ['Question the poster',"Genuine question — did that change the reveal or just the frame? Asking because we've had one where that was the whole job."],
  ['Question the poster',"Out of interest, was the head on that level? Bit low for the vent to clear the plaster line on some regs."],
  ['Compliment the detail',"That reveal scribed to the wall rather than to the paper is the detail that makes the whole job look like a different price. Nice."],
  ['Compliment the detail',"Love that you shot the back of it. Most people only ever photograph the front and then wonder why it's short."],
  ['Share a war story',"Had a job exactly like this. Not the same material, same problem. Spent two days shimming and the customer still asked why it took so long."],
  ['Share a war story',"The old frames out is the best bit. Genuinely the only 30 seconds of any window job that feels like winning."],
  ['Recommendation',"Whatever you do, ask for the survey photos in writing before they order. A remade sash is never cheaper than checking."],
  ['Recommendation',"Might be worth asking them to put the internal and external colours in writing too. Interior never matches the sample."],
  ['Light disagreement',"Fair point, though — a 45 bay still loses you about a third of the glass to the sightlines. Cheaper on paper, darker in the room."],
  ['Light disagreement',"Depends on the wall. Solid 1930s and you're golden. 1970s extension and the reveal's lying to you the whole time."],
  ['Curious question',"Curious what this looked like before — just interested in whether the old frames were original or a 90s replacement. Changes the whole approach."],
  ['Curious question',"Was this a repeat job on the same site or a one-off? Makes a massive difference to how far you push the spec."],
  ['Tag-in friendly',"@[tag] this is the sort of thing that saves you a fortnight. The survey photos are the whole argument."],
  ['Community spirit',"This is a great thread actually. Bit more of this round here and less of 'my mate can do it for half that' would be an improvement for everyone."],
  ['Customer-side view',"As a customer this is genuinely useful — I had no idea cill projection was a thing and now I know to ask about it."],
  ['Customer-side view',"No idea what an astragal is. Just learned more from this than from the last three quotes I've had."],
  ['Reply to a reply',"Ha — yeah that came out wrong. I meant the sill, not the sale. The flood in my living room is a separate and ongoing situation."],
  ['Reply to a reply',"Genuinely didn't know that, thanks. That would absolutely explain what I'm looking at in my front room."],
  ['Late-night drive-by',"3am scroll and here I am learning about trickle vents. This algorithm has me figured out."],
  ['Simple + genuine',"Brilliant. That's exactly it, that's the whole thing. Genuinely helpful, cheers."],
];
$('#tpl-list').innerHTML = TPLS.map(([c,t])=>`<div class="tpl" data-t="${esc(t)}"><b>${c}</b>${esc(t)}</div>`).join('');
$('#tpl-list').onclick = e => { const t = e.target.closest('.tpl'); if (t) copy(t.dataset.t,'Comment copied'); };
const engKey = 'fenora.eng.' + new Date().toDateString();
const engGet = () => +(localStorage.getItem(engKey) || 0);
$('#eng-count').textContent = engGet();
$('#eng-plus').onclick = () => { const v = engGet()+1; localStorage.setItem(engKey,v); $('#eng-count').textContent=v; };
$('#eng-reset').onclick = () => { localStorage.removeItem(engKey); $('#eng-count').textContent=0; };

/* ══════════════ SETUP ══════════════ */
async function loadCfg(){
  try { S.cfg = await (await fetch('../api/config')).json(); } catch {}
  const c = S.cfg.configured || {};
  $('#conn-status').innerHTML = [
    ['Facebook Page', c.facebook, 'Text posts work directly'],
    ['Instagram',     c.instagram, 'Needs a public image URL'],
    ['LinkedIn Page', c.linkedin,  'Text posts work directly'],
    ['Image host',    c.imageHost, 'Optional — zero-click Instagram'],
  ].map(([n,ok,note])=>`<div class="crow"><div><b>${n}</b><div class="muted small">${note}</div></div>
    <span class="st ${ok?'ok':'no'}">${ok?'connected':'copy mode'}</span></div>`).join('');
  const d = S.cfg.defaults || {};
  const set = (id,v) => { const e=$(id); if (e && !e.value) e.value = v || ''; };
  set('#s-iguser',d.igUserId); set('#s-pageid',d.pageId); set('#s-orgurn',d.orgUrn); set('#s-host',d.imageHostEndpoint);
}
$('#s-save').onclick = async () => {
  const cfg = { meta:{ graphVersion:'v21.0', igUserId:$('#s-iguser').value, metaToken:$('#s-mtoken').value,
                        pageId:$('#s-pageid').value, pageToken:$('#s-ptoken').value },
                linkedin:{ orgUrn:$('#s-orgurn').value, liToken:$('#s-litoken').value },
                imageHost:{ uploadEndpoint:$('#s-host').value } };
  const r = await fetch('../api/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(cfg)});
  if (r.ok) { S.cfg.configured = (await r.json()).configured; loadCfg(); toast('config.json saved','ok'); }
  else { const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([JSON.stringify(cfg,null,2)],{type:'application/json'}));
    a.download='config.json'; a.click(); toast('Downloaded config.json','ok'); }
};
$('#s-mix').innerHTML = ['trade-pain','nerd-detail','customer-reality','planning','money','contrarian','wip','build-in-public','team']
  .map((k,i)=>{ const w=[9,8,6,5,4,7,3,2,2][i];
    return `<label>${(find(S.posts[0]) && ({'trade-pain':'Trade Pain','nerd-detail':'Nerd Detail','customer-reality':'Customer Reality','planning':'Planning Apps','money':'Margin & Money','contrarian':'Contrarian Takes','wip':'Behind the Scenes','build-in-public':'Build In Public','team':'Team & People'})[k])||k}<input type="range" data-p="${k}" min="0" max="10" value="${w}"><span class="w">${w}</span></label>`; }).join('');
$('#s-mix').oninput = e => { if (e.target.type==='range') e.target.nextElementSibling.textContent = e.target.value; };

/* ══════════════ EXPORT / BACKUP ══════════════ */
const dl = (n,t) => { const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([t],{type:'text/csv;charset=utf-8'})); a.download=n; a.click(); };
const ce = v => `"${String(v ?? '').replace(/"/g,'""')}"`;
function exportCSV(kind){
  const rows = S.posts.filter(p => sched(p.id).date);
  if (kind==='full') { dl('fenora-library.csv',
    [Object.keys(S.posts[0]).map(ce).join(','), ...S.posts.map(p=>Object.values(p).map(ce).join(','))].join('\n'));
    return toast('Full library exported','ok'); }
  const map = {
    buffer:{ 'Date':p=>sched(p.id).date,'Time':p=>sched(p.id).time,'Text':p=>autoCap(p,'IG'),'Profile':()=>'instagram' },
    metricool:{ 'Publication date':p=>sched(p.id).date+' '+sched(p.id).time,'Text':p=>autoCap(p,'IG'),
      'Social Networks':p=>(sched(p.id).platforms||[]).map(x=>({IG:'instagram',FB:'facebook',LI:'linkedin'}[x])).join(', ') },
    hootsuite:{ 'Date':p=>sched(p.id).date,'Time':p=>sched(p.id).time,'Post Text':p=>autoCap(p,'IG'),
      'Post Type':()=>'o','Social Network':()=>'instagram' },
  }[kind];
  const k = Object.keys(map);
  dl(`fenora-${kind}.csv`,[k.map(ce).join(','),...rows.map(p=>k.map(x=>ce(map[x](p))).join(','))].join('\n'));
  toast(`${rows.length} posts exported (${kind})`,'ok');
}
$$('[data-csv]').forEach(b => b.onclick = () => exportCSV(b.dataset.csv));
$('#s-backup').onclick = () => { const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify({posts:S.sched},null,1)],{type:'application/json'}));
  a.download='fenora-schedule-backup.json'; a.click(); };
$('#s-restore').onclick = () => $('#s-file').click();
$('#s-file').onchange = async e => { const f=e.target.files[0]; if (!f) return;
  S.sched = { ...S.sched, ...(JSON.parse(await f.text())).posts }; save(); drawCal(); render(); renderToday();
  toast('Restored','ok'); };

})();
