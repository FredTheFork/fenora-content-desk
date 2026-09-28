/**
 * Vercel function — POST /api/save
 * Serverless deployments have no writable disk worth keeping, so the browser
 * copy is authoritative there. This acknowledges the save and says so —
 * use Settings → Backup to keep a copy of your schedule and your posts.
 */
const { readJsonBody, sendJson } = require('../lib/publish.js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'POST only' });
  const body = await readJsonBody(req).catch(() => ({}));
  return sendJson(res, 200, {
    ok: true,
    persistent: false,
    saved: body.posts && typeof body.posts === 'object' ? Object.keys(body.posts).length : 0,
    posts: Array.isArray(body.custom) ? body.custom.length : 0,
  });
};
