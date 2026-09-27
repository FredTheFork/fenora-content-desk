<div align="center">

# Fenora Content Desk

**One page. Today's post, ready to go. Press “Post to Instagram”, “Post to Facebook”
or “Post to LinkedIn” and it publishes — image and caption, no copy-paste.**

For [fenora.pro](https://fenora.pro) — window business software, from CRM to DXF export.

</div>

---

## What this is

A two-page desk for a marketing team:

| Page | What it does |
|---|---|
| **Desk** (`/`) | Today's post and the ones after it, each with the finished image, the caption written for each platform, and a button per platform. Press it and the post is live. |
| **Settings** (`/settings`) | Connect the accounts once (Facebook, Instagram, LinkedIn), set the cadence, rebuild the calendar. |

Behind the buttons: 251 written posts, a designed image for every one, and the
Instagram, Facebook and LinkedIn APIs wired up properly — with the errors from
Meta and LinkedIn passed straight through when something needs fixing, and no
way to post the same thing twice by accident.

The strategy behind the writing is in **[STRATEGY.md](STRATEGY.md)**.

---

## Deploy to Vercel

Everything is set up for Vercel: push to GitHub, import the repo, done. Two
environment variables make it work.

### 1. Import the repo

Vercel → **Add New → Project** → import `fenora-content-desk`. Next.js is
detected automatically; leave the build settings alone.

### 2. Add a password (required)

**Settings → Environment Variables**

| Variable | Value |
|---|---|
| `DESK_PASSWORD` | a password of your choosing |
| `DESK_SECRET` | any long random string (encrypts stored tokens) |

Without `DESK_PASSWORD` the desk deliberately stays locked and shows a setup
page instead — it can post to your accounts, so it should never be open.

### 3. Add storage (one click, recommended)

**Storage → Create Database → Upstash Redis** (or Postgres). Both work; the desk
picks whichever it finds:

- Upstash Redis / Vercel KV → `KV_REST_API_URL` + `KV_REST_API_TOKEN`
- Postgres / Neon / Supabase → `DATABASE_URL`

This is where the connected accounts, the calendar and the posted-log live. If
you skip it the desk still runs, but forgets everything on the next deploy.

### 4. Redeploy and open the desk

You will be asked for the password, then you land on the Desk.

> **Images:** the rendered cards ship with the repo in `public/media/`, so
> Instagram and Facebook can fetch them from your own domain (`/media/TP-01_4x5.jpg`).
> That is why Instagram can publish without any extra image hosting.

---

## Connect the accounts

Open **Settings → Connections**. You have two ways to do it.

### Option A — one click (recommended)

Create the two apps once and the desk does the rest, including refreshing tokens.

**Meta (Instagram + Facebook)**

1. [developers.facebook.com](https://developers.facebook.com) → **Create App** → type **Business**.
2. Add the products **Facebook Login** and **Instagram**.
3. Facebook Login → Settings → **Valid OAuth Redirect URIs**:
   `https://your-domain/api/connect/callback/meta`
4. Copy the **App ID** and **App Secret** into
   `META_APP_ID` and `META_APP_SECRET`, redeploy.
5. Back on the desk: Settings → **Connect** next to Facebook Page. Sign in, pick
   your Page, and Instagram comes with it if the Instagram account is linked to
   that Page (Meta Business Suite → Settings → Linked accounts).

**LinkedIn**

1. [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps) → **Create app**.
2. Request the products **Share on LinkedIn** and **Sign In with LinkedIn using OpenID Connect**.
3. Auth tab → **Authorized redirect URLs**:
   `https://your-domain/api/connect/callback/linkedin`
4. Copy the **Client ID** and **Client Secret** into
   `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET`, redeploy.
5. Back on the desk: Settings → **Connect** next to LinkedIn, then choose whether
   posts go out as your **company Page** or your **personal profile**.

Both redirect URLs are printed on the Settings page so you can copy them exactly.

### Option B — paste a token

Under each connection there is a *“Paste a token instead”* section. Give it a
long-lived Page token and the desk works out the Page and the Instagram account
from it. Useful if you already have tokens, or cannot create an app.

### Check it

**Test connections** on the Settings page calls Meta and LinkedIn with your
credentials and reports what they said, in plain English.

---

## The daily loop

1. Open the desk. Today's post is at the top: image, captions, buttons.
2. Press **Post to all 3**, or a single platform. The image and the
   platform-specific caption go out.
3. Nothing posted twice: platforms that already carry the post show **✓** and are
   skipped. *Post again* is a deliberate, separate action inside **Details**.
4. Something wrong? Meta's or LinkedIn's actual message appears under the post
   with the fix — usually “reconnect in Settings”.
5. Want to change a caption? **Details → edit → Save caption.** Your version is
   used from then on; *Reset to original* brings back the copywriter's.

**Extra posts.** Open **Library** at the bottom of the desk, search all 251, and
press **Queue** to drop one into the next free slot. **Details → Swap** replaces a
scheduled post with another one.

**Auto-publishing (optional).** Settings → *Publish automatically when a post
comes due*, plus `CRON_SECRET` in Vercel. A daily cron at 09:00 UTC publishes
anything due; every platform stays idempotent, so a cron run can never
double-post. On a Pro plan you can change the schedule in `vercel.json` to
`0 * * * *` for hourly publishing.

---

## Day-to-day maintenance

```bash
npm install          # once
npm run dev          # http://localhost:3000
node tools/selftest.mjs   # proves Instagram/Facebook/LinkedIn publishing still works
```

The self-test starts mock Meta and LinkedIn APIs, connects fake accounts,
publishes a real post end-to-end and checks what each provider received. No
credentials needed and nothing is sent anywhere real.

### Editing the content library

```bash
cd content && python3 build.py     # regenerates posts.json + posts.csv
cd ../render && python3 render.py  # re-renders the card for anything that changed
python3 ../tools/to_jpg.py         # PNG masters → public/media JPEGs
python3 tools/build_site_data.py   # rebuilds data/posts.json for the desk
```

or all of it at once: `./build.sh` (requires Python 3 + Pillow).

Commit `public/media/` with the content changes — that is what the desk posts.

### The repo

```
├── app/                  the two pages + the API routes (Next.js, App Router)
├── components/           the Desk and Settings interfaces
├── lib/                  Meta, LinkedIn, storage, scheduling, sessions
├── data/posts.json       the 251 posts, compiled for the desk
├── public/media/         283 rendered JPEGs (4:5 feed + 9:16 story)
├── content/              the writing: posts_a–d.py → posts.json
├── render/               the brand image renderer (Pillow)
├── tools/                build helpers + the publishing self-test
└── middleware.ts         the password gate
```

### Environment variables

| Variable | Needed for |
|---|---|
| `DESK_PASSWORD` | the desk to open at all |
| `DESK_SECRET` | encrypting stored tokens at rest |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` **or** `DATABASE_URL` | remembering connections, calendar and posted-log |
| `META_APP_ID` / `META_APP_SECRET` | one-click Connect for Facebook + Instagram |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | one-click Connect for LinkedIn |
| `CRON_SECRET` | auto-publishing |
| `PUBLIC_BASE_URL` | only if the images should be served from a different domain |
| `META_PAGE_ID` / `META_PAGE_TOKEN` / `IG_USER_ID` | connecting by environment instead of the UI |
| `LINKEDIN_ACCESS_TOKEN` / `LINKEDIN_ORG_URN` | same, for LinkedIn |

Every one of these is explained in [`.env.example`](.env.example).

### If something stops working

| Symptom | Cause and fix |
|---|---|
| “The access token has expired” | Meta tokens last 60 days, LinkedIn’s about that too. Settings → **Reconnect**. |
| “Instagram needs the image at a public https address” | The desk is running on `localhost`, or Vercel Deployment Protection is on. Set `PUBLIC_BASE_URL` or turn protection off for production. |
| “No Instagram Business account is linked to that Facebook Page” | Link them in Meta Business Suite → Settings → Linked accounts, then reconnect. |
| “LinkedIn has retired the API version…” | Set `LINKEDIN_VERSION` in Vercel to a version LinkedIn names, redeploy. |
| Connections vanish after a deploy | No storage configured — add Upstash Redis or Postgres (step 3). |
| Desk shows a setup page on Vercel | `DESK_PASSWORD` is not set. |

---

## Requirements

Node 20+ and — only for re-rendering images — Python 3 with Pillow.
