/**
 * Shared publishing + config helpers, used by both the local server
 * (server.js) and the Vercel functions (api/). Zero dependencies.
 *
 * Config sources, in priority order:
 *   1. environment variables  (Vercel → Project Settings → Environment Variables)
 *   2. config.json next to server.js  (local runs — git-ignored)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function readConfigFile() {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8')); }
  catch { return {}; }
}

/** Merge config.json with environment variables (env wins). */
function resolveConfig() {
  const file = readConfigFile();
  const env = process.env;
  const meta = file.meta || {};
  const li = file.linkedin || {};
  const host = file.imageHost || {};
  const cfg = {
    meta: {
      graphVersion: env.META_GRAPH_VERSION || meta.graphVersion || 'v21.0',
      igUserId: env.IG_USER_ID || meta.igUserId || '',
      metaToken: env.META_TOKEN || meta.metaToken || '',
      pageId: env.FB_PAGE_ID || meta.pageId || '',
      pageToken: env.FB_PAGE_TOKEN || meta.pageToken || '',
    },
    linkedin: {
      orgUrn: env.LI_ORG_URN || li.orgUrn || '',
      liToken: env.LI_TOKEN || li.liToken || '',
    },
    imageHost: {
      uploadEndpoint: env.IMAGE_HOST_ENDPOINT || host.uploadEndpoint || '',
    },
  };
  return cfg;
}

function configuredFlags(cfg) {
  return {
    instagram: Boolean(cfg.meta.igUserId && cfg.meta.metaToken),
    facebook: Boolean(cfg.meta.pageId && cfg.meta.pageToken),
    linkedin: Boolean(cfg.linkedin.orgUrn && cfg.linkedin.liToken),
    imageHost: Boolean(cfg.imageHost && cfg.imageHost.uploadEndpoint),
  };
}

/* ── Platform publishers ─────────────────────────────────────────────────── */

async function publishFacebook({ graphVersion = 'v21.0', pageId, token, message, link }) {
  const params = new URLSearchParams({ message: message || '', access_token: token });
  if (link) params.set('link', link);
  const r = await fetch(`https://graph.facebook.com/${graphVersion}/${pageId}/feed?${params}`, { method: 'POST' });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message || JSON.stringify(j.error));
  return { id: j.id, url: `https://facebook.com/${j.id}` };
}

async function publishFacebookPhoto({ graphVersion = 'v21.0', pageId, token, url, message }) {
  const params = new URLSearchParams({ url, message: message || '', access_token: token });
  const r = await fetch(`https://graph.facebook.com/${graphVersion}/${pageId}/photos?${params}`, { method: 'POST' });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message || JSON.stringify(j.error));
  return { id: j.post_id || j.id, url: `https://facebook.com/${j.post_id || j.id}` };
}

async function publishInstagram({ graphVersion = 'v21.0', igUserId, token, imageUrl, caption }) {
  if (!imageUrl) throw new Error('Instagram requires a PUBLICLY reachable image URL (https://…). Host the card, paste the link, or use copy mode.');
  const c = new URLSearchParams({ image_url: imageUrl, caption: caption || '', access_token: token });
  const create = await fetch(`https://graph.facebook.com/${graphVersion}/${igUserId}/media?${c}`, { method: 'POST' });
  const cj = await create.json();
  if (cj.error) throw new Error('Container: ' + (cj.error.message || JSON.stringify(cj.error)));
  const p = new URLSearchParams({ creation_id: cj.id, access_token: token });
  const pub = await fetch(`https://graph.facebook.com/${graphVersion}/${igUserId}/media_publish?${p}`, { method: 'POST' });
  const pj = await pub.json();
  if (pj.error) throw new Error('Publish: ' + (pj.error.message || JSON.stringify(pj.error)));
  return { id: pj.id, url: `https://instagram.com/p/${pj.id}` };
}

async function publishLinkedIn({ orgUrn, token, text, version }) {
  const r = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'LinkedIn-Version': version || process.env.LINKEDIN_VERSION || '202601',
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
  try { j = JSON.parse(txt); } catch { /* non-json error body */ }
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

/** Run the requested publishes. `b.to` holds 'ig' | 'fb' | 'li' | 'host'. */
async function runPublish(b, cfg) {
  const results = {};
  const errors = [];
  const t = (p, d) => (b[p] && b[p] !== 'use-config' ? b[p] : d);
  const G = cfg.meta.graphVersion;

  if (b.to?.includes('ig')) {
    try {
      results.instagram = await publishInstagram({
        graphVersion: G,
        igUserId: t('igUserId', cfg.meta.igUserId), token: t('token', cfg.meta.metaToken),
        imageUrl: b.imageUrl, caption: b.caption,
      });
    } catch (e) { errors.push('Instagram: ' + e.message); }
  }
  if (b.to?.includes('fb')) {
    try {
      const fn = b.imageUrl ? publishFacebookPhoto : publishFacebook;
      results.facebook = await fn({
        graphVersion: G,
        pageId: t('pageId', cfg.meta.pageId), token: t('token', cfg.meta.pageToken),
        message: b.message, link: b.link, url: b.imageUrl,
      });
    } catch (e) { errors.push('Facebook: ' + e.message); }
  }
  if (b.to?.includes('li')) {
    try {
      results.linkedin = await publishLinkedIn({
        orgUrn: t('orgUrn', cfg.linkedin.orgUrn), token: t('token', cfg.linkedin.liToken), text: b.message,
      });
    } catch (e) { errors.push('LinkedIn: ' + e.message); }
  }
  if (b.to?.includes('host')) {
    try {
      results.host = await uploadToHost({
        endpoint: b.endpoint || cfg.imageHost.uploadEndpoint, filename: b.filename,
        contentType: b.contentType, b64: b.b64,
      });
    } catch (e) { errors.push('Image host: ' + e.message); }
  }
  return { results, errors };
}

/** JSON request body — handles both raw streams (local server) and the
 *  pre-parsed `req.body` that Vercel's Node runtime hands over. */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    if (typeof req.body === 'string' && req.body) {
      try { return resolve(JSON.parse(req.body)); } catch (e) { return reject(e); }
    }
    let d = '';
    req.on('data', (c) => { d += c; if (d.length > 25e6) req.destroy(); });
    req.on('end', () => { try { resolve(d ? JSON.parse(d) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

/** Tiny JSON responder that works for both runtimes. */
function sendJson(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

module.exports = {
  ROOT, readConfigFile, resolveConfig, configuredFlags, runPublish, readJsonBody, sendJson,
  publishFacebook, publishFacebookPhoto, publishInstagram, publishLinkedIn, uploadToHost,
};
