/**
 * Vercel function — POST /api/publish
 * Publishes to Instagram / Facebook / LinkedIn using the tokens from the
 * project's Environment Variables (or any passed in the body).
 */
const { resolveConfig, runPublish, readJsonBody, sendJson } = require('../lib/publish.js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'POST only' });
  let body;
  try { body = await readJsonBody(req); }
  catch { return sendJson(res, 400, { error: 'invalid JSON body' }); }

  const cfg = resolveConfig();
  // Allow one-off credential overrides from the body without persisting them.
  if (body.igUserId) cfg.meta.igUserId = body.igUserId;
  if (body.token && body.to?.includes('ig')) cfg.meta.metaToken = body.token;
  if (body.token && body.to?.includes('fb')) cfg.meta.pageToken = body.token;
  if (body.token && body.to?.includes('li')) cfg.linkedin.liToken = body.token;
  if (body.pageId) cfg.meta.pageId = body.pageId;
  if (body.orgUrn) cfg.linkedin.orgUrn = body.orgUrn;

  try {
    const { results, errors } = await runPublish(body, cfg);
    return sendJson(res, errors.length && !Object.keys(results).length ? 400 : 200, { results, errors });
  } catch (e) {
    return sendJson(res, 500, { error: e.message });
  }
};
