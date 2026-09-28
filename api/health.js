/* Deployment health check for Vercel and uptime monitors. */
const { sendJson, configuredFlags } = require('../lib/publish.js');
const { resolveConfig } = require('../lib/publish.js');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'GET only' });
  return sendJson(res, 200, {
    ok: true,
    service: 'fenora-content-desk',
    runtime: 'vercel',
    configured: configuredFlags(resolveConfig()),
  });
};
