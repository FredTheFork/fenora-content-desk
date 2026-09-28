<div align="center">

# Fenora Content Desk

**An empty desk. Write your posts, plan the calendar, publish to Instagram,
Facebook and LinkedIn.**

For [fenora.pro](https://fenora.pro) — window business software, from CRM to DXF export.

It ships with **no posts and nothing scheduled**. What it ships with is the
frame: nine content pillars, the hashtag sets, the house caption engine and a
calendar that knows how to space things out. You put the content in.

Deploy to **Vercel** (one click — it's a static app + tiny functions), or run
locally with `node server.js` → `http://localhost:4321`. No build step, no
`npm install`, no dependencies.

</div>

---

## Why this exists

"Full stack software for the window trade" is the least engaging sentence in the
industry. Nobody scrolling Instagram at 11pm is excited about a configurator.

A fitter scrolling at 11pm *will* engage with this:

> *the reveal said 70. the reveal measured 52. the reveal is 70 at the top and 52
> at the bottom and 61 in the middle, because of course it is.*

So this is not a software company posting about software. It's a trade account
with a software punchline. The product is where the posts point; it's never what
the post is about. The full strategy — funnel, cadence, platform roles, the
90-day ramp — is in **[STRATEGY.md](STRATEGY.md)**.

This repo is the tool that strategy runs on. The content that used to ship with
it has been cleared out so you can start from scratch.

---

## What's in here

```
├── STRATEGY.md              the thinking: funnel, cadence, platform roles, 90-day ramp
├── vercel.json              deploy config — the app runs at / with zero setup
├── server.js                local server + Instagram/Facebook/LinkedIn publishing
├── lib/publish.js           publishing + config helpers shared with api/
├── api/                     Vercel functions: config, publish, save, load, health
├── config.example.json      copy to config.json and add your tokens (local runs)
├── app/                     the dashboard (no framework, no build)
│   ├── captions.js          the house caption engine (byte-checked against build.py)
│   └── app.js
├── content/                 the library — empty until you fill it
│   ├── build.py             compiles posts_*.py → posts.json + posts.csv
│   ├── posts.json           the frame (pillars, tagsets, banner) + 0 posts
│   ├── tags.json            hashtag sets and discovery tags
│   └── schedule.json        your dates, ticks and posts (git-ignored)
├── tools/
│   └── captions_parity.js   proves captions.js matches build.py exactly
└── assets/
    ├── Favicon-Logo.png     the brand mark
    └── fonts/               Montserrat variable, if you ever want it
```

No image pipeline. There is no renderer, no rendered artwork and no photo
library — the desk handles **copy and scheduling**. Artwork is yours: shoot it,
design it, generate it, then paste a public URL into the post when you want
Instagram to publish it automatically.

---

## The desk starts empty

`content/posts.json` holds the frame and nothing else:

| Kept | What it does |
|---|---|
| **9 pillars** | Trade Pain, Nerd Detail, Customer Reality, Planning Apps, Margin & Money, Contrarian Takes, Behind the Scenes, Build In Public, Team & People |
| **11 hashtag sets** | one per pillar, plus `core` and `oneliners` |
| **21 discovery tags** | rotated deterministically by post ID so a week of posts never looks copy-pasted |
| **Caption engine** | hook → body → CTA → banner, rebuilt per platform: Instagram (with tags), Facebook, LinkedIn (own lead, carousel slides flattened, signed off) |
| **5 image styles** | house briefs to append when you generate your own artwork |

**0 posts. Nothing scheduled. No posted ticks.** The schedule storage key was
reset too, so an old browser session doesn't drag 251 stale entries back in, and
any schedule entry pointing at a post that no longer exists is dropped on boot.

### Two ways to add content

**1. In the dashboard** — *Library → ＋ New post*. Pick a pillar and a format,
write the hook and the caption, give it a date. Those posts are yours: they live
in the browser, are mirrored into `content/schedule.json` when you run the local
server, are included in **Settings → Backup**, and can be edited or deleted any
time. This is the normal way to work.

**2. In bulk, from Python** — drop a part file at `content/posts_a.py` defining
`POSTS = [ {...}, {...} ]`, then:

```bash
cd content && python3 build.py     # → posts.json + posts.csv + tags.json
```

Every `content/posts_*.py` file is picked up automatically in filename order, so
you can keep one file per pillar group. A post needs `id`, `pillar`, `format`,
`hook` and `body`; `cta`, `cta_fb`, `li_lead`, `platforms`, `tags`, `series`,
`prompt` and `style` are optional. `content/build.py` documents each key.
Library posts are read-only in the dashboard — recompile them from source — but
every edit you make in the composer is stored separately in `schedule.json`, so
rebuilding never loses your work.

`content/posts.csv` is regenerated alongside the JSON for Buffer, Later,
Metricool or Hootsuite if you'd rather schedule somewhere else.

---

## The dashboard

Four tabs, and the first one is the whole product:

- **Today** — the day's posts, ready to go. For every platform: one click copies
  the right caption. Paste, post, tick **Posted** — the row goes green, the day
  goes green. A day strip shows the week at a glance and a streak counter counts
  the days everything got posted. When the desk is empty this screen says so and
  offers **＋ New post**.
- **Calendar** — month view of everything planned. Click an empty day to fill it.
  **⚡ Plan this week** lays out the next seven days — two posts a day, pillar mix
  weighted, no pillar twice in a day. Plan 30 / 90 days does the same for a month
  or a quarter. Drag any Library card onto a date to place it by hand.
- **Library** — every post, searchable and filterable by pillar, format and
  status. **＋ New post** starts one; clicking a card opens the composer.
- **Grow** — the 20-minute daily commenting routine and 26 click-to-copy comment
  templates, because half of this strategy isn't your own posts.

The **composer** is a drawer: pillar, format, schedule, platforms, and the hook,
caption, CTA and LinkedIn lead. The three platform captions rebuild live as you
type — the same engine that writes them at build time
(`node tools/captions_parity.js` proves the two match byte for byte). Type over a
caption to pin your own version. Under **Artwork** you can keep an image brief
for whoever makes the picture, and paste the public image URL Instagram needs.

Your schedule and your posts live in the browser (localStorage) and are mirrored
to `content/schedule.json` when the local server is running. **Settings →
Backup** downloads the lot as JSON — do it now and then. **Settings → Clear the
whole desk** wipes every date, tick and post you wrote, if you want another
scratch start.

---

## Deploy on Vercel

Import the repo into Vercel and press deploy. That's it — no build command, the
dashboard is served from `/app/index.html`, and the functions in `/api` provide
config, publishing, persistence acknowledgement and a health check.

1. Import this repository into your Vercel project and deploy the branch.
2. Optional — add these under **Project Settings → Environment Variables** and
   **Post now** buttons appear next to every caption:

   ```
   META_TOKEN           long-lived Meta token (instagram_content_publish, pages_manage_posts)
   FB_PAGE_ID           Facebook Page ID
   FB_PAGE_TOKEN        Facebook Page token
   IG_USER_ID           Instagram Business account ID
   LI_ORG_URN           urn:li:organization:…
   LI_TOKEN             token with w_organization_social
   META_GRAPH_VERSION      (optional, default v21.0)
   LINKEDIN_VERSION        (optional, default 202601)
   IMAGE_HOST_ENDPOINT     (optional — API-level artwork uploader, see below)
   ```

3. Verify `https://your-domain.example/api/health` returns JSON with `ok: true`.
4. Open the domain root. Everything the dashboard reads comes from the same
   origin, so it never depends on localhost or a separate server.

On Vercel there is no writable disk worth keeping, so the browser copy of your
schedule and your posts is authoritative — use **Settings → Backup** to move it
between machines or deployments. Locally, `node server.js` writes the same state
to `content/schedule.json` (git-ignored).

---

## Posting to Instagram, Facebook and LinkedIn

### Copy mode — works immediately, zero setup

Every post has a **Copy caption** button per platform: the right caption for
that platform hits your clipboard, hashtags and banner included. Paste into the
app, attach your own picture, post, tick **Posted**. This is the whole daily
routine and it works everywhere — including a laptop you don't control.

### API mode — posts for real

Facebook and LinkedIn publish directly from the dashboard once tokens are in
**Settings** (or Vercel env vars). Instagram needs one extra thing.

1. Instagram must be a **Business or Creator** account linked to a **Facebook Page**.
2. [developers.facebook.com](https://developers.facebook.com) → create an app → add
   the **Instagram** product.
3. Graph API Explorer → **Generate Access Token** with `instagram_basic`,
   `instagram_content_publish`, `pages_show_list`, `pages_manage_posts`.
4. **Exchange for a long-lived token** (60 days). Use that one.
5. LinkedIn: [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps)
   → add `w_organization_social` → 3-legged OAuth for your **Company Page** (not a
   personal profile) → copy the token and the organisation URN.
6. Local runs: paste into **Settings → Save**. Vercel: put them in the
   environment variables above.

**The Instagram caveat, plainly:** Meta requires a *publicly reachable* image
URL, and there is no image library in this repo to serve one. So paste a URL
into the post's **Edit → Artwork → Public image URL** field — anything already
on the public web works (your site's `/media`, a Cloudflare R2 or S3 bucket, an
image CDN). Without it, Instagram stays in copy mode and Facebook/LinkedIn still
publish for real.

If you have an uploader of your own, `POST /api/publish` with
`to: ["host"]` sends raw bytes plus an `X-Filename` header to
`IMAGE_HOST_ENDPOINT` and returns the public URL it replies with. That is an
API-level option — the dashboard itself only ever needs the URL.

`config.json` is git-ignored and never leaves your machine.

---

## The actual plan

**Two posts a day, every day, on every platform. 20 minutes of commenting every
day. Never pitch in a comment.** The full breakdown is in
[STRATEGY.md](STRATEGY.md). The weekly ritual: write the next batch of posts,
open the dashboard, press **⚡ Plan this week**.

---

## Requirements

Node 18+ and nothing else — zero dependencies. Python 3 is only needed if you
compile a bulk library from `content/posts_*.py`, and
`node tools/captions_parity.js` is plain Node.
