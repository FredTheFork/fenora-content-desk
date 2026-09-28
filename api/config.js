/**
 * Vercel function — GET  /api/config : what's connected (from env vars)
 *                  POST /api/config : not writable on Vercel (tokens live in
 *                                     project Environment Variables)
 */
const { resolveConfig, configuredFlags, readJsonBody, sendJson } = require('../lib/publish.js');

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    await readJsonBody(req).catch(() => ({}));
    return sendJson(res, 200, {
      ok: false,
      persistent: false,
      configured: configuredFlags(resolveConfig()),
      note: 'On Vercel, set the tokens in Project Settings → Environment Variables.',
    });
  }
  const cfg = resolveConfig();
  return sendJson(res, 200, {
    persistent: false,
    configured: configuredFlags(cfg),
    defaults: {
      igUserId: cfg.meta.igUserId, pageId: cfg.meta.pageId, orgUrn: cfg.linkedin.orgUrn,
      imageHostEndpoint: cfg.imageHost.uploadEndpoint,
    },
    site: 'https://fenora.pro',
  });
};
