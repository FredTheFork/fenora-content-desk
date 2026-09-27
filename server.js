#!/usr/bin/env node
/**
 * Fenora Pro — Content Desk
 * Zero-dependency local server.
 *   • serves the dashboard
 *   • saves the schedule
 *   • proxies real publish calls to Instagram / Facebook / LinkedIn
 *
 * Run:  node server.js        →  http://localhost:4321
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const ROOT = __dirname;
const PORT = process.env.PORT || 4321;
const GRAPH = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8')).meta.graphVersion || 'v21.0'; }
  catch { return 'v21.0'; }
})();

function config() {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8')); }
  catch { return {}; }
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

const send = (res, code, type, body) => {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
};
const json = (res, code, obj) => send(res, code, 'application/json; charset=utf-8', JSON.stringify(obj));

function readBody(req) {
  return new Promise((resolve, reject) => {
    let d = '';
    req.on('data', (c) => { d += c; if (d.length > 25e6) req.destroy(); });
    req.on('end', () => { try { resolve(d ? JSON.parse(d) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

/* ── Platform publishers ─────────────────────────────────────────────────── */

async function publishFacebook({ pageId, token, message, link }) {
  const fields = ['id'].concat(link ? ['link'] : []);
  const params = new URLSearchParams({ message: message || '', access_token: token });
  if (link) params.set('link', link);
  const r = await fetch(`https://graph.facebook.com/${GRAPH}/${pageId}/feed?${params}`, { method: 'POST' });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message || JSON.stringify(j.error));
  return { id: j.id, url: `https://facebook.com/${j.id}` };
}

async function publishFacebookPhoto({ pageId, token, url, message }) {
  const params = new URLSearchParams({ url, message: message || '', access_token: token });
  const r = await fetch(`https://graph.facebook.com/${GRAPH}/${pageId}/photos?${params}`, { method: 'POST' });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message || JSON.stringify(j.error));
  return { id: j.post_id || j.id, url: `https://facebook.com/${j.post_id || j.id}` };
}

async function publishInstagram({ igUserId, token, imageUrl, caption }) {
  if (!imageUrl) throw new Error('Instagram requires a PUBLICLY reachable image URL (https://…). Render the card, host it, paste the link.');
  const c = new URLSearchParams({ image_url: imageUrl, caption: caption || '', access_token: token });
  const create = await fetch(`https://graph.facebook.com/${GRAPH}/${igUserId}/media?${c}`, { method: 'POST' });
  const cj = await create.json();
  if (cj.error) throw new Error('Container: ' + (cj.error.message || JSON.stringify(cj.error)));
  const p = new URLSearchParams({ creation_id: cj.id, access_token: token });
  const pub = await fetch(`https://graph.facebook.com/${GRAPH}/${igUserId}/media_publish?${p}`, { method: 'POST' });
  const pj = await pub.json();
  if (pj.error) throw new Error('Publish: ' + (pj.error.message || JSON.stringify(pj.error)));
  return { id: pj.id, url: `https://instagram.com/p/${pj.id}` };
}

async function publishLinkedIn({ orgUrn, token, text }) {
  const r = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'LinkedIn-Version': '202601',
      'X-Restli-Protocol-Version': '2.0.0',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      author: orgUrn.startsWith('urn:') ? orgUrn : `urn:li:organization:${orgUrn}`,
      commentary: text,
      visibility: 'PUBLIC',
      distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    }),
  });
  const txt = await r.text();
  let j = {};
  try { j = JSON.parse(txt); } catch { /* non-json error */ }
  if (!r.ok) throw new Error(j.message || txt.slice(0, 300) || `HTTP ${r.status}`);
  return { id: (txt.match(/"id"\s*:\s*"([^"]+)"/) || [])[1] || txt, url: 'https://www.linkedin.com/feed/' };
}

async function uploadToHost({ endpoint, filename, contentType, b64 }) {
  const r = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': contentType || 'image/png', 'X-Filename': filename || 'card.png' },
    body: Buffer.from(b64, 'base64'),
  });
  if (!r.ok) throw new Error(`Host returned HTTP ${r.status}`);
  const ct = r.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    const j = await r.json();
    return { url: j.url || j.link || j.data?.url || JSON.stringify(j) };
  }
  const t = await r.text();
  return { url: (t.match(/https?:\/\/\S+/) || [t])[0] };
}

/* ── API ─────────────────────────────────────────────────────────────────── */

async function api(req, res, pathname) {
  const cfg = config();
  const meta = cfg.meta || {};
  const li = cfg.linkedin || {};

  if (pathname === '/api/config') {
    return json(res, 200, {
      graphVersion: GRAPH,
      configured: {
        instagram: Boolean(meta.igUserId && meta.metaToken),
        facebook: Boolean(meta.pageId && meta.pageToken),
        linkedin: Boolean(li.orgUrn && li.liToken),
        imageHost: Boolean(cfg.imageHost && cfg.imageHost.uploadEndpoint),
      },
      defaults: {
        igUserId: meta.igUserId || '', pageId: meta.pageId || '',
        pageToken: meta.pageToken || '', metaToken: meta.metaToken || '',
        orgUrn: li.orgUrn || '', liToken: li.liToken || '',
        imageHostEndpoint: (cfg.imageHost && cfg.imageHost.uploadEndpoint) || '',
      },
      site: 'https://fenora.pro',
    });
  }

  if (pathname === '/api/publish') {
    const b = await readBody(req);
    const results = {};
    const errors = [];
    const t = (p, d) => (b[p] && b[p] !== 'use-config' ? b[p] : d);

    if (b.to?.includes('ig')) {
      try {
        results.instagram = await publishInstagram({
          igUserId: t('igUserId', meta.igUserId), token: t('token', meta.metaToken),
          imageUrl: b.imageUrl, caption: b.caption,
        });
      } catch (e) { errors.push('Instagram: ' + e.message); }
    }
    if (b.to?.includes('fb')) {
      try {
        const fn = b.imageUrl ? publishFacebookPhoto : publishFacebook;
        results.facebook = await fn({
          pageId: t('pageId', meta.pageId), token: t('token', meta.pageToken),
          message: b.message, link: b.link, url: b.imageUrl,
        });
      } catch (e) { errors.push('Facebook: ' + e.message); }
    }
    if (b.to?.includes('li')) {
      try {
        results.linkedin = await publishLinkedIn({
          orgUrn: t('orgUrn', li.orgUrn), token: t('token', li.liToken), text: b.message,
        });
      } catch (e) { errors.push('LinkedIn: ' + e.message); }
    }
    if (b.to?.includes('host')) {
      try {
        results.host = await uploadToHost({
          endpoint: b.endpoint, filename: b.filename, contentType: b.contentType, b64: b.b64,
        });
      } catch (e) { errors.push('Image host: ' + e.message); }
    }
    return json(res, errors.length && !Object.keys(results).length ? 400 : 200, { results, errors });
  }

  if (pathname === '/api/verify') {
    const b = await readBody(req);
    const out = {};
    if (b.provider === 'facebook' || b.provider === 'instagram') {
      const id = b.provider === 'facebook' ? b.id : b.id;
      const r = await fetch(`https://graph.facebook.com/${GRAPH}/${id}?fields=id,name,username&access_token=${encodeURIComponent(b.token)}`);
      out[b.provider] = await r.json();
    }
    if (b.provider === 'linkedin') {
      const r = await fetch(`https://api.linkedin.com/v2/organizations/${b.id}`, {
        headers: { Authorization: `Bearer ${b.token}`, 'LinkedIn-Version': '202601' },
      });
      out.linkedin = await r.json();
    }
    return json(res, 200, out);
  }

  if (pathname === '/api/save') {
    const body = await readBody(req);
    fs.writeFileSync(path.join(ROOT, 'content', 'schedule.json'), JSON.stringify(body, null, 1));
    return json(res, 200, { ok: true, saved: body.posts?.length ?? Object.keys(body).length });
  }

  if (pathname === '/api/images') {
    const list = (dir, ext) => { try { return fs.readdirSync(dir).filter(f => f.endsWith(ext)); } catch { return []; } };
    return json(res, 200, {
      files: list(path.join(ROOT, 'render', 'png'), '.png'),   // print masters
      jpgs:  list(path.join(ROOT, 'render', 'jpg'), '.jpg'),   // upload-ready
    });
  }

  if (pathname === '/api/load') {
    const p = path.join(ROOT, 'content', 'schedule.json');
    return json(res, 200, fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : { posts: {} });
  }

  // Write the platform credentials the Settings tab collects. Locked to config.json
  // so nothing in the content library can be overwritten from the browser.
  if (pathname === '/api/config' && req.method === 'POST') {
    const b = await readBody(req);
    const existing = config();
    const merged = {
      ...existing,
      meta: { ...(existing.meta || {}), ...(b.meta || {}), graphVersion: b.meta?.graphVersion || existing.meta?.graphVersion || 'v21.0' },
      linkedin: { ...(existing.linkedin || {}), ...(b.linkedin || {}) },
      imageHost: { ...(existing.imageHost || {}), ...(b.imageHost || {}) },
    };
    if (!merged.imageHost.uploadEndpoint) delete merged.imageHost;
    fs.writeFileSync(path.join(ROOT, 'config.json'), JSON.stringify(merged, null, 2));
    return json(res, 200, { ok: true, configured: {
      instagram: !!(merged.meta.igUserId && merged.meta.metaToken),
      facebook: !!(merged.meta.pageId && merged.meta.pageToken),
      linkedin: !!(merged.linkedin.orgUrn && merged.linkedin.liToken),
      imageHost: !!(merged.imageHost && merged.imageHost.uploadEndpoint),
    } });
  }

  return json(res, 404, { error: 'unknown endpoint' });
}

/* ── Static ──────────────────────────────────────────────────────────────── */

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://x');
  if (pathname.startsWith('/api/')) {
    try { return await api(req, res, pathname); }
    catch (e) { return json(res, 500, { error: e.message }); }
  }
  // Redirect to the app directory so its relative asset paths resolve correctly.
  if (pathname === '/') { res.writeHead(302, { Location: '/app/' }); return res.end(); }

  let rel = decodeURIComponent(pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(ROOT, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    return send(res, 404, 'text/plain', 'Not found: ' + pathname);
  }
  send(res, 200, MIME[path.extname(file)] || 'application/octet-stream', fs.readFileSync(file));
});

server.listen(PORT, '0.0.0.0', () => {
  const c = config();
  console.log(`\n  Fenora Content Desk  →  http://localhost:${PORT}\n`);
  console.log(`  Facebook  ${c.meta?.pageId && c.meta?.pageToken ? '✅ ready' : '⚠️  needs config.json'}`);
  console.log(`  Instagram ${c.meta?.igUserId && c.meta?.metaToken ? '✅ ready' : '⚠️  needs config.json'}`);
  console.log(`  LinkedIn  ${c.linkedin?.orgUrn && c.linkedin?.liToken ? '✅ ready' : '⚠️  needs config.json'}\n`);
});
