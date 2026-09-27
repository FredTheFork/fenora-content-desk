<div align="center">

# Fenora Content Desk

**251 written posts, a designed image for every one, and a calendar that posts to
Instagram, Facebook and LinkedIn.**

For [fenora.pro](https://fenora.pro) — window business software, from CRM to DXF export.

`node server.js` → open `http://localhost:4321`. No build step, no `npm install`.

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
├── server.js                local server + Instagram/Facebook/LinkedIn publishing
├── config.example.json      copy to config.json and add your tokens
├── app/                     the dashboard (no framework, no build)
├── content/                 the 251-post library
│   ├── posts_a–d.py         written as Python, one file per pillar group
│   ├── build.py             → posts.json + posts.csv
│   ├── posts.json           all three platform captions pre-built per post
│   └── posts.csv            for Buffer / Later / Metricool / Hootsuite
├── render/
│   ├── core.py              brand image renderer: layout system + window geometry
│   └── render.py            produces a designed PNG for every post
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

Requires Pillow. Montserrat (variable) is vendored in `assets/fonts/`.

---

## The dashboard

Four tabs, because four is what you actually use:

- **Today** — the post that's going out, its rendered image, and one click per
  platform to copy the right caption. Mark it posted.
- **Library** — all 251 with thumbnails. Search and filter by pillar, format, status.
  Drag any card onto a calendar date.
- **Calendar** — month view with image thumbnails. Click an empty day to fill it
  automatically. **Fill 90 days** lays out a whole quarter on sensible rules
  (Mon–Fri, reels on Tue & Fri evenings, LinkedIn long-form on Wednesdays,
  pillars weighted by your mix).
- **Engage** — the 20-minute daily commenting routine and 26 click-to-copy
  comment templates.

The **composer** is a drawer: edit the hook, body, CTA and LinkedIn lead, and watch
the three platform captions update live.

---

## Posting to Instagram, Facebook and LinkedIn

### Copy mode — works immediately, zero setup

Every post has a **Copy IG / Copy FB / Copy LI** button that puts the
platform-correct caption on your clipboard. Paste into the app, upload the rendered
PNG, done. This is the recommended path for Instagram.

### API mode — posts for real

Facebook and LinkedIn text posts work directly from the dashboard once you add
tokens in **Setup**. Instagram needs one extra step.

1. Instagram must be a **Business or Creator** account linked to a **Facebook Page**.
2. [developers.facebook.com](https://developers.facebook.com) → create an app → add
   the **Instagram** product.
3. Graph API Explorer → **Generate Access Token** with `instagram_basic`,
   `instagram_content_publish`, `pages_show_list`, `pages_manage_posts`.
4. **Exchange for a long-lived token** (60 days). Use that one.
5. LinkedIn: [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps)
   → add `w_organization_social` → 3-legged OAuth for your **Company Page** (not a
   personal profile) → copy the token and the organisation URN.
6. Paste into **Setup → Save**.

**The Instagram caveat, plainly:** Meta requires a *publicly reachable* image URL. A
file on your laptop won't work, and neither will `localhost`. Either press
**Download PNG**, upload it anywhere public and paste the URL in the composer; or
point **Image host endpoint** at a small uploader (a Cloudflare Worker, a Vercel
function, a presigned S3 POST) and the dashboard pushes the rendered card there and
uses the returned URL automatically. It POSTs raw PNG bytes with an `X-Filename`
header and accepts `{"url":"…"}` or a plain-text URL back.

`config.json` is git-ignored and never leaves your machine.

---

## The actual plan

**5 posts a week, every week, for 12 weeks. 20 minutes of commenting every day.
Never pitch in a comment.** The full breakdown — funnel, platform roles, what
won't work — is in [STRATEGY.md](STRATEGY.md).

---

## Requirements

Node 18+ (zero dependencies) and Python 3 with Pillow (image renderer only).
