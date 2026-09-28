#!/usr/bin/env node
/**
 * Fenora Content Desk — local server. Zero dependencies.
 *   • serves the dashboard
 *   • saves the schedule to content/schedule.json
 *   • proxies real publish calls to Instagram / Facebook / LinkedIn
 *
 * Run:  node server.js        →  http://localhost:4321
 *
 * On Vercel the same app runs as static files + the functions in api/.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { ROOT, resolveConfig, configuredFlags, runPublish, readConfigFile } = require('./lib/publish.js');

const PORT = process.env.PORT || 4321;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.csv': 'text/csv; charset=utf-8',
  '.py': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
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

/* Live inventory of rendered images — the static file render/images.json
   serves the same shape when this app is deployed to Vercel. */
function imageInventory() {
  const list = (dir, ext) => { try { return fs.readdirSync(dir).filter(f => f.endsWith(ext)).sort(); } catch { return []; } };
  return {
    png: list(path.join(ROOT, 'render', 'png'), '.png'),
    jpg: list(path.join(ROOT, 'render', 'jpg'), '.jpg'),
  };
}

/* ── API ─────────────────────────────────────────────────────────────────── */

async function api(req, res, pathname) {
  const cfg = resolveConfig();

  if (pathname === '/api/config') {
    if (req.method === 'POST') {
      // Write only the credential sections; the content library stays read-only.
      const b = await readBody(req);
      const existing = readConfigFile();
      const mergeTok = (oldV, newV) => (newV ? newV : oldV || '');
      const merged = {
        ...existing,
        meta: {
          ...(existing.meta || {}),
          graphVersion: b.meta?.graphVersion || existing.meta?.graphVersion || 'v21.0',
          igUserId: b.meta?.igUserId ?? existing.meta?.igUserId ?? '',
          metaToken: mergeTok(existing.meta?.metaToken, b.meta?.metaToken),
          pageId: b.meta?.pageId ?? existing.meta?.pageId ?? '',
          pageToken: mergeTok(existing.meta?.pageToken, b.meta?.pageToken),
        },
        linkedin: {
          ...(existing.linkedin || {}),
          orgUrn: b.linkedin?.orgUrn ?? existing.linkedin?.orgUrn ?? '',
          liToken: mergeTok(existing.linkedin?.liToken, b.linkedin?.liToken),
        },
        imageHost: {
          ...(existing.imageHost || {}),
          uploadEndpoint: b.imageHost?.uploadEndpoint ?? existing.imageHost?.uploadEndpoint ?? '',
        },
      };
      if (!merged.imageHost.uploadEndpoint) delete merged.imageHost;
      fs.writeFileSync(path.join(ROOT, 'config.json'), JSON.stringify(merged, null, 2));
      return json(res, 200, { ok: true, persistent: true, configured: configuredFlags(merged) });
    }
    const c = readConfigFile();
    return json(res, 200, {
      persistent: true,
      configured: configuredFlags(cfg),
      defaults: {
        igUserId: cfg.meta.igUserId, pageId: cfg.meta.pageId, orgUrn: cfg.linkedin.orgUrn,
        imageHostEndpoint: cfg.imageHost.uploadEndpoint,
      },
      site: 'https://fenora.pro',
    });
  }

  if (pathname === '/api/publish' && req.method === 'POST') {
    const b = await readBody(req);
    const { results, errors } = await runPublish(b, cfg);
    return json(res, errors.length && !Object.keys(results).length ? 400 : 200, { results, errors });
  }

  if (pathname === '/api/save' && req.method === 'POST') {
    const body = await readBody(req);
    fs.writeFileSync(path.join(ROOT, 'content', 'schedule.json'), JSON.stringify(body, null, 1));
    return json(res, 200, { ok: true, persistent: true, saved: body.posts?.length ?? Object.keys(body).length });
  }

  if (pathname === '/api/load') {
    const p = path.join(ROOT, 'content', 'schedule.json');
    return json(res, 200, fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : { posts: {} });
  }

  if (pathname === '/api/images') {
    return json(res, 200, imageInventory());
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

  // Live image inventory, same URL and shape as the static file on Vercel.
  if (pathname === '/render/images.json') {
    return json(res, 200, imageInventory());
  }

  // The dashboard is the product — serve it at / as well as /app/.
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
  const c = resolveConfig();
  const ok = configuredFlags(c);
  console.log(`\n  Fenora Content Desk  →  http://localhost:${PORT}\n`);
  console.log(`  Facebook  ${ok.facebook ? '✅ ready' : '⚠️  needs config.json (copy mode still works)'}`);
  console.log(`  Instagram ${ok.instagram ? '✅ ready' : '⚠️  needs config.json (copy mode still works)'}`);
  console.log(`  LinkedIn  ${ok.linkedin ? '✅ ready' : '⚠️  needs config.json (copy mode still works)'}\n`);
});
