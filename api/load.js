/**
 * Vercel function — GET /api/load
 * Nothing persisted server-side: the browser (localStorage + Settings →
 * Backup) holds the schedule on Vercel.
 */
const { sendJson } = require('../lib/publish.js');

module.exports = async (req, res) => sendJson(res, 200, { posts: {}, persistent: false });
