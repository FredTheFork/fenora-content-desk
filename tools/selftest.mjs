#!/usr/bin/env node
/**
 * End-to-end self-test for the publishing paths.
 *
 *   node tools/selftest.mjs
 *
 * Starts a mock Graph API and mock LinkedIn API, boots the desk against them,
 * connects both accounts, publishes a post to Instagram, Facebook and LinkedIn,
 * checks that nothing is posted twice, checks the error path, and prints what
 * each provider actually received. No credentials needed, nothing is sent
 * anywhere real. Your .data/state.json is backed up and restored afterwards.
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const MOCK_PORT = 4111;
const APP_PORT = 3222;
const APP = `http://localhost:${APP_PORT}`;
const MOCK = `http://localhost:${MOCK_PORT}`;
const STATE = path.join(ROOT, '.data', 'state.json');

const calls = [];
let passed = 0;
let failed = 0;
let igPollCount = 0;

function check(name, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

/* ── Mock providers ───────────────────────────────────────────────────────── */

function json(res, body, status = 200, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(body));
}

const mock = createServer(async (req, res) => {
  const url = new URL(req.url, MOCK);
  // The client asks for /meta/v23.0/... — the mock answers with or without a version.
  const p = url.pathname.replace(/^\/meta\/v\d+\.\d+/, '/meta');
  let raw = '';
  for await (const chunk of req) raw += chunk;
  const form = new URLSearchParams(raw);
  const token =
    form.get('access_token') ||
    url.searchParams.get('access_token') ||
    (req.headers.authorization ?? '').replace('Bearer ', '');
  calls.push({
    method: req.method,
    path: p + (url.search || ''),
    body: raw.slice(0, 6000),
    bytes: raw.length,
    at: Date.now(),
  });

  // ── Anything holding an "expired" token gets Meta's real 190 error.
  if (token.includes('expired') && p.startsWith('/meta')) {
    return json(
      res,
      {
        error: {
          message: 'Error validating access token: Session has expired.',
          type: 'OAuthException',
          code: 190,
          error_subcode: 463,
        },
      },
      400,
    );
  }
  if (token.includes('expired') && p.startsWith('/li')) {
    return json(
      res,
      { message: 'Invalid access token', status: 401, serviceErrorCode: 65601 },
      401,
    );
  }

  if (req.method === 'PUT' && p.startsWith('/upload')) return json(res, {}, 201);

  // ── Meta / Graph ────────────────────────────────────────────────────────
  if (p === '/meta/me') return json(res, { id: '1000', name: 'Fred Fenora' });
  if (p === '/meta/me/accounts') {
    return json(res, {
      data: [
        {
          id: 'page_1',
          name: 'Fenora Pro',
          access_token: 'page-token-1',
          instagram_business_account: { id: 'ig_1', username: 'fenora.pro' },
        },
        { id: 'page_2', name: 'Fenora Trade', access_token: 'page-token-2' },
      ],
    });
  }
  if (p === '/meta/page_1' || p === '/meta/page_2') {
    const fields = form.get('fields') || url.searchParams.get('fields') || '';
    return json(res, {
      id: p.split('/').pop(),
      name: p.endsWith('1') ? 'Fenora Pro' : 'Fenora Trade',
      access_token: p.endsWith('1') ? 'page-token-1' : 'page-token-2',
      ...(fields.includes('instagram_business_account') && p.endsWith('1')
        ? { instagram_business_account: { id: 'ig_1', username: 'fenora.pro' } }
        : {}),
    });
  }
  if (p === '/meta/ig_1') return json(res, { id: 'ig_1', username: 'fenora.pro', name: 'Fenora' });
  if (p === '/meta/page_1/photos') return json(res, { id: 'photo_1', post_id: 'page_1_post_1' });
  if (p === '/meta/ig_1/media') return json(res, { id: 'container_1' });
  if (p === '/meta/container_1') {
    igPollCount++;
    return json(
      res,
      igPollCount === 1 ? { status_code: 'IN_PROGRESS' } : { status_code: 'FINISHED' },
    );
  }
  if (p === '/meta/ig_1/media_publish') return json(res, { id: 'media_1' });
  if (p === '/meta/media_1') return json(res, { permalink: 'https://www.instagram.com/p/ABC123/' });

  // ── LinkedIn ────────────────────────────────────────────────────────────
  if (p === '/li/v2/userinfo') return json(res, { sub: 'member_1', name: 'Fred Fenora' });
  if (p === '/li/rest/organizationAcls')
    return json(res, { elements: [{ organization: 'urn:li:organization:9999' }] });
  if (p === '/li/rest/organizations')
    return json(res, { elements: [{ id: '9999', localizedName: 'Fenora Pro' }] });
  if (p === '/li/rest/images') {
    return json(res, { value: { uploadUrl: `${MOCK}/upload/1`, image: 'urn:li:image:C4E10AQF' } });
  }
  if (p === '/li/rest/posts') {
    return json(res, {}, 201, { 'x-restli-id': 'urn:li:share:7188' });
  }

  return json(res, { error: { message: `mock: no route for ${req.method} ${p}`, code: 404 } }, 404);
});

/* ── Helpers ──────────────────────────────────────────────────────────────── */

async function post(pathname, body) {
  const res = await fetch(`${APP}${pathname}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

async function waitForApp(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(APP, { redirect: 'manual' });
      if (res.status < 500) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

function lastCall(pathname, method = 'POST') {
  return [...calls].reverse().find((c) => c.method === method && c.path.startsWith(pathname));
}

/* ── The test run ─────────────────────────────────────────────────────────── */

let server;
let backup = null;

async function main() {
  try {
    backup = await fs.readFile(STATE, 'utf8');
  } catch {
    backup = null;
  }

  await new Promise((resolve) => mock.listen(MOCK_PORT, '127.0.0.1', resolve));
  console.log(`\nMock providers on ${MOCK}  ·  desk on ${APP}\n`);

  // Fresh state so the run is reproducible.
  await fs.rm(STATE, { force: true });
  await fs.rm(`${STATE}.bak`, { force: true });

  server = spawn('npx', ['next', 'dev', '-p', String(APP_PORT)], {
    cwd: ROOT,
    detached: true,
    env: {
      ...process.env,
      META_GRAPH_BASE: `${MOCK}/meta`,
      LINKEDIN_API_BASE: `${MOCK}/li`,
      PUBLIC_BASE_URL: 'https://desk.test',
      NEXT_DIST_DIR: '.next-selftest',
      CRON_SECRET: 'test-cron-secret',
      DESK_PASSWORD: '',
      NODE_ENV: 'development',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', () => {});
  server.stderr.on('data', (d) => {
    const text = String(d);
    if (/error/i.test(text) && !/ExperimentalWarning/.test(text))
      process.stderr.write(`  [desk] ${text.slice(0, 300)}`);
  });

  if (!(await waitForApp())) throw new Error('the desk did not start in time');
  await fetch(APP).catch(() => {}); // first load plans the calendar

  console.log('Connections');
  const meta = await post('/api/settings', { action: 'manual-meta', pageToken: 'test-token' });
  check(
    'Meta connects and picks the Page',
    meta.json.ok === true,
    JSON.stringify(meta.json).slice(0, 200),
  );
  check(
    'Instagram handle is read from the Page',
    /@fenora\.pro/.test(meta.json.message ?? ''),
    meta.json.message,
  );

  const li = await post('/api/settings', { action: 'manual-linkedin', token: 'test-token' });
  check(
    'LinkedIn connects and finds the Page',
    li.json.ok === true,
    JSON.stringify(li.json).slice(0, 200),
  );
  check(
    'LinkedIn picks the organisation',
    /Fenora Pro/.test(li.json.message ?? ''),
    li.json.message,
  );

  console.log('\nPublishing to all three');
  calls.length = 0;
  const publish = await post('/api/desk', {
    action: 'publish',
    postId: 'TP-01',
    platforms: ['ig', 'fb', 'li'],
  });
  const outcomes = publish.json.report?.outcomes ?? [];
  check('three outcomes come back', outcomes.length === 3, JSON.stringify(outcomes));
  check(
    'Instagram succeeded',
    outcomes.find((o) => o.platform === 'ig')?.ok === true,
    JSON.stringify(outcomes.find((o) => o.platform === 'ig')),
  );
  check(
    'Facebook succeeded',
    outcomes.find((o) => o.platform === 'fb')?.ok === true,
    JSON.stringify(outcomes.find((o) => o.platform === 'fb')),
  );
  check(
    'LinkedIn succeeded',
    outcomes.find((o) => o.platform === 'li')?.ok === true,
    JSON.stringify(outcomes.find((o) => o.platform === 'li')),
  );
  check('Instagram waited for the container', igPollCount >= 2, `polls: ${igPollCount}`);

  const igMedia = calls.find((c) => c.path.split('?')[0] === '/meta/ig_1/media');
  const igPayload = new URLSearchParams(igMedia?.body ?? '');
  check(
    'Instagram got a public https image URL',
    (igPayload.get('image_url') ?? '').startsWith('https://'),
    igPayload.get('image_url'),
  );
  check(
    'Instagram got the caption with hashtags',
    (igPayload.get('caption') ?? '').includes('#fenorapro'),
    `${(igPayload.get('caption') ?? '').length} chars`,
  );
  check(
    'Instagram did not ask for a story',
    !(igPayload.get('media_type') ?? '').includes('STORIES'),
  );

  const fbPhoto = calls.find((c) => c.path.split('?')[0] === '/meta/page_1/photos');
  const fbPayload = new URLSearchParams(fbPhoto?.body ?? '');
  check('Facebook posted the photo to the right Page', Boolean(fbPhoto), fbPhoto?.path);
  check(
    'Facebook got the same public image',
    (fbPayload.get('url') ?? '').includes('/media/TP-01_4x5.jpg'),
    fbPayload.get('url'),
  );
  check(
    'Facebook caption has no Instagram hashtags',
    !(fbPayload.get('caption') ?? '').includes('#fenorapro'),
  );

  const liInit = calls.find((c) => c.path.split('?')[0] === '/li/rest/images');
  check(
    'LinkedIn opened an image upload',
    liInit?.body.includes('urn:li:organization:9999'),
    liInit?.body,
  );
  const liUpload = calls.find((c) => c.method === 'PUT' && c.path.startsWith('/upload'));
  check(
    'LinkedIn received real image bytes',
    (liUpload?.bytes ?? 0) > 5000,
    `${liUpload?.bytes} bytes`,
  );
  const liPost = calls.find((c) => c.path.split('?')[0] === '/li/rest/posts');
  check(
    'LinkedIn post carries the image',
    (liPost?.body ?? '').includes('urn:li:image:C4E10AQF'),
    (liPost?.body ?? '').slice(-160),
  );
  check(
    'LinkedIn post is public and live',
    (liPost?.body ?? '').includes('"visibility":"PUBLIC"') &&
      (liPost?.body ?? '').includes('"lifecycleState":"PUBLISHED"'),
  );

  console.log('\nPressing the buttons again');
  const again = await post('/api/desk', {
    action: 'publish',
    postId: 'TP-01',
    platforms: ['ig', 'fb', 'li'],
  });
  const againOutcomes = again.json.report?.outcomes ?? [];
  check(
    'nothing is posted twice',
    againOutcomes.every((o) => o.ok && o.skipped === true),
    JSON.stringify(againOutcomes),
  );

  console.log('\nWhen a token expires');
  const stateDoc = JSON.parse(await fs.readFile(STATE, 'utf8'));
  stateDoc.connections.meta =
    'plain:' +
    JSON.stringify({
      pages: [
        {
          id: 'page_1',
          name: 'Fenora Pro',
          token: 'expired-token',
          ig: { id: 'ig_1', username: 'fenora.pro' },
        },
      ],
      selectedPageId: 'page_1',
      connectedAt: new Date().toISOString(),
      source: 'manual',
    });
  await fs.writeFile(STATE, JSON.stringify(stateDoc), 'utf8');
  const expired = await post('/api/desk', {
    action: 'publish',
    postId: 'TP-02',
    platforms: ['fb'],
    force: true,
  });
  const expiredOutcome = expired.json.report?.outcomes?.[0];
  check(
    'the real reason is passed through',
    /expired/i.test(expiredOutcome?.error ?? ''),
    expiredOutcome?.error,
  );
  check(
    'the fix is explained',
    /Reconnect/i.test(expiredOutcome?.hint ?? ''),
    expiredOutcome?.hint,
  );

  console.log('\nAuto-publishing on the cron');
  const cronDoc = JSON.parse(await fs.readFile(STATE, 'utf8'));
  cronDoc.connections.meta =
    'plain:' +
    JSON.stringify({
      pages: [
        {
          id: 'page_1',
          name: 'Fenora Pro',
          token: 'page-token-1',
          ig: { id: 'ig_1', username: 'fenora.pro' },
        },
      ],
      selectedPageId: 'page_1',
      connectedAt: new Date().toISOString(),
      source: 'manual',
    });
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  cronDoc.schedule.config.autoPublish = true;
  cronDoc.schedule.entries = [
    ...cronDoc.schedule.entries.filter((e) => e.id !== 'TP-03'),
    { id: 'TP-03', date: yesterday, time: '08:15' },
  ];
  await fs.writeFile(STATE, JSON.stringify(cronDoc), 'utf8');

  calls.length = 0;
  const cronRes = await fetch(`${APP}/api/cron`, {
    headers: { Authorization: 'Bearer test-cron-secret' },
  });
  const cronJson = await cronRes.json();
  check(
    'the cron publishes what is due',
    cronJson.published === 1,
    JSON.stringify(cronJson).slice(0, 300),
  );
  check(
    'it went to all three platforms',
    calls.filter(
      (c) =>
        c.path.includes('/media') || c.path.includes('/photos') || c.path.includes('/rest/posts'),
    ).length >= 3,
    `${calls.length} calls`,
  );

  const cronAgain = await (
    await fetch(`${APP}/api/cron`, { headers: { Authorization: 'Bearer test-cron-secret' } })
  ).json();
  check(
    'a second cron run posts nothing',
    cronAgain.published === 0,
    JSON.stringify(cronAgain).slice(0, 200),
  );

  const unauthed = await fetch(`${APP}/api/cron`);
  check(
    'the cron is closed without the secret',
    unauthed.status === 401,
    `HTTP ${unauthed.status}`,
  );

  console.log(`\n${failed ? '✗' : '✓'} ${passed} passed, ${failed} failed\n`);
}

main()
  .catch((err) => {
    failed++;
    console.error(`\n✗ Self-test crashed: ${err.message}\n`);
  })
  .finally(async () => {
    // next dev spawns children: take the whole process group down.
    try {
      if (server?.pid) process.kill(-server.pid, 'SIGTERM');
    } catch {
      server?.kill('SIGTERM');
    }
    mock.close();
    await new Promise((r) => setTimeout(r, 300));
    if (backup === null) await fs.rm(STATE, { force: true });
    else await fs.writeFile(STATE, backup, 'utf8');
    process.exit(failed ? 1 : 0);
  });
