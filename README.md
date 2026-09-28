<div align="center">

# Fenora Content Desk

**251 written posts, a designed image for every one, and a calendar that posts to
Instagram, Facebook and LinkedIn.**

For [fenora.pro](https://fenora.pro) — window business software, from CRM to DXF export.

**This is the content. Click to post.** Every day: open the app, copy each
caption, save the picture, tick posted. Once a week: press *Plan this week*.

Deploy to **Vercel** (one click — it's a static app + tiny functions), or run
locally with `node server.js` → `http://localhost:4321`. No build step, no
`npm install`.

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
the post is about. The full strategy is in **[STRATEGY.md](STRATEGY.md)**.

---

## What's in here

```
├── STRATEGY.md              the thinking: funnel, cadence, platform roles, 90-day ramp
├── vercel.json              deploy config — the app runs at / with zero setup
├── server.js                local server + Instagram/Facebook/LinkedIn publishing
├── lib/publish.js           publishing + config helpers shared with api/
├── api/                     Vercel functions: config, publish, save, load
├── config.example.json      copy to config.json and add your tokens (local runs)
├── app/                     the dashboard (no framework, no build)
│   ├── captions.js          the house caption engine (byte-checked against build.py)
│   └── app.js
├── content/                 the 251-post library
│   ├── posts_a–d.py         written as Python, one file per pillar group
│   ├── build.py             → posts.json + posts.csv
│   ├── posts.json           all three platform captions pre-built per post
│   └── posts.csv            for Buffer / Later / Metricool / Hootsuite
├── render/
│   ├── core.py              brand image renderer: layout system + window geometry
│   ├── render.py            produces a designed PNG for every post
│   ├── jpg/                 upload-ready JPEGs — committed, deployed with the app
│   ├── png/                 print masters (git-ignored, ~116 MB)
│   └── images.json          image manifest the dashboard reads
├── tools/
│   ├── to_jpg.py            PNG → upload-ready JPEG (116 MB → 22 MB) + manifest
│   └── captions_parity.js   proves captions.js matches build.py exactly
└── assets/
    ├── fonts/               Montserrat variable
    └── ai/                  AI hero photos (composited by the renderer)
```

---

## The content library

**251 posts** across nine pillars. Every post ships with three finished captions
(Instagram / Facebook / LinkedIn), a finished image-generator prompt with the house
style already appended, and a rendered PNG.

| Pillar | Posts | What it's for |
|---|---:|---|
| Trade Pain | 56 | the relatable stuff — reveals, dogs, "easy fit", squinting in the rain |
| Nerd Detail | 48 | the credibility moat — sightlines, astragals, cill projection, trickle vents |
| Contrarian Takes | 33 | the opinionated stuff — stop pricing fitting as a percentage |
| Customer Reality | 31 | "just tell me what you'd do", the dog on the job |
| Planning Apps | 24 | replacement uPVC with uPVC; Article 4; conservation areas |
| Behind the Scenes | 21 | how the product actually works |
| Margin & Money | 16 | where the margin actually goes |
| Build In Public | 13 | shipping notes, published pricing, no fake testimonials |
| Team & People | 9 | the office, the workshop, the apprentice |

Roughly **half the library is written to land as a bold text card with no image
at all** — the cheapest, fastest, highest-reach format available.

### Editing the library

```bash
cd content && python3 build.py     # regenerates posts.json + posts.csv
```

Posts live in `posts_a.py` (trade pain + nerd detail), `posts_b.py` (customers,
planning, money), `posts_c.py` (contrarian, WIP, build-in-public, team), `posts_d.py`
(one-liners, POVs, carousels, polls, seasonal, LinkedIn long-form).

Edits you make in the Composer's hook/body/CTA are kept separately in
`content/schedule.json`, so rebuilding never loses them.

---

## The image renderer

There is no image for 251 posts. So this repo draws them.

`render/render.py` renders a **designed, on-brand image for every post** — not
filler. It has a layout system (statement, quote, number, diagram, product, split,
photo) and a library of **real window geometry** drawn as vector art: sash and
casement elevations, box-sash and spiral frames, glazing-bar patterns, sightline
diagrams, cill sections with horns and fall, frame profile cross-sections, reveal
sections, canted-bay plans, trickle vents, delivery loads, and abstract product UI.

```bash
cd render && python3 render.py            # all 251
cd render && python3 render.py TP-01 ND-05   # just those
```

Each post's geometry is chosen from its own subject matter, so a post about a cill
detail gets a cill section and a post about sightlines gets a sightline diagram.
Light and dark cards alternate so a profile grid has rhythm.

**AI hero photos** go in `assets/ai/<POST-ID>.png`. If one exists the renderer uses
it as a full-bleed photo with a legibility plate; otherwise it draws the card. The
12 shipped ones cover the posts where a photograph genuinely beats a graphic.

Each post is rendered at **4:5** (Instagram + Facebook feed) and the 32
vertical formats also get **9:16** (Stories / Reels cover) — 283 files in all.

`tools/to_jpg.py` then writes a matching JPEG set into `render/jpg/` at
quality 92 with 4:4:4 chroma. The dashboard and the zip bundle both prefer
those, which takes the set from 116 MB to 22 MB with no visible loss on text.
Use `render/png/` when you want the print masters.

Requires Pillow. Montserrat (variable) is vendored in `assets/fonts/`.

```bash
./build.sh            # compile content → render 283 PNGs → export JPEG → zip
```

---

## The dashboard

Four tabs, and the first one is the whole product:

- **Today** — the day's posts, ready to go. For every platform: one click copies
  the caption *and* downloads the picture. Paste, post, tick **Posted** — the row
  goes green, the day goes green. A day strip shows the week at a glance, and a
  streak counter counts the days everything got posted.
- **Calendar** — month view with image thumbnails. Click an empty day to fill it.
  **⚡ Plan this week** lays out the next seven days — two posts a day, every day,
  pillar mix weighted, no pillar twice in a day. Plan 30 / 90 days does the same
  for a month or a quarter. Drag any Library card onto a date to place it by hand.
- **Library** — all 251 with thumbnails. Search and filter by pillar, format,
  status.
- **Grow** — the 20-minute daily commenting routine and 26 click-to-copy
  comment templates.

The **composer** is a drawer: edit the hook, caption, CTA and LinkedIn lead, and
the three platform captions rebuild live (the same engine that wrote them —
`node tools/captions_parity.js` proves it matches `content/build.py` byte for
byte). Type over a caption to pin your own version.

Your schedule lives in the browser (localStorage) and is mirrored to
`content/schedule.json` when the local server is running. **Settings → Backup**
downloads the lot as JSON — do it now and then.

---

## Deploy on Vercel

Import the repo into Vercel and press deploy. That's it:

- The dashboard is served at `/` (static files + the functions in `api/`).
- The rendered JPEGs are committed in `render/jpg/`, so every post ships with
  its image — and because they're served from your public URL, **Instagram
  auto-posting works with no extra image host**.
- The schedule lives in the browser; use **Settings → Backup** to move it
  between machines.

Optional — add these under **Project Settings → Environment Variables** and
**Post now** buttons appear next to every caption:

```
META_TOKEN        long-lived Meta token (instagram_content_publish, pages_manage_posts)
FB_PAGE_ID        Facebook Page ID
FB_PAGE_TOKEN     Facebook Page token
IG_USER_ID        Instagram Business account ID
LI_ORG_URN        urn:li:organization:…
LI_TOKEN          token with w_organization_social
META_GRAPH_VERSION   (optional, default v21.0)
IMAGE_HOST_ENDPOINT  (optional)
```

---

## Posting to Instagram, Facebook and LinkedIn

### Copy mode — works immediately, zero setup

Every post has a **Copy caption & save image** button per platform: the right
caption hits your clipboard and the rendered picture lands in Downloads. Paste
into the app, attach the picture, post. Tick **Posted**. This is the whole daily
routine and it works everywhere — including a school laptop.

### API mode — posts for real

Facebook and LinkedIn posts work directly from the dashboard once tokens are in
**Settings** (or Vercel env vars). Instagram needs one extra step.

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

**The Instagram caveat, plainly:** Meta requires a *publicly reachable* image URL.
On Vercel that's automatic — the app hands Meta its own `/render/jpg/…` URL. From
a laptop, either paste a public image URL into the composer (Edit → Advanced) or
point **Image host endpoint** at a small uploader (a Cloudflare Worker, a Vercel
function, a presigned S3 POST): the dashboard POSTs raw PNG bytes with an
`X-Filename` header and uses the returned URL.

`config.json` is git-ignored and never leaves your machine.

---

## The actual plan

**Two posts a day, every day, on every platform. 20 minutes of commenting every
day. Never pitch in a comment.** The full breakdown — funnel, platform roles,
what won't work — is in [STRATEGY.md](STRATEGY.md). The weekly ritual: write the
next batch of posts, open the dashboard, press **⚡ Plan this week**.

---

## Requirements

Node 18+ (zero dependencies) and Python 3 with Pillow (image renderer only).
Captions and schedule need neither — `node tools/captions_parity.js` is plain Node.
