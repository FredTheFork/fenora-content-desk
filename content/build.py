#!/usr/bin/env python3
"""
Fenora Content Desk — content library builder.

Compiles the content library into `posts.json` (+ `posts.csv`, `tags.json`)
for the scheduling dashboard.

    cd content && python3 build.py

The library starts EMPTY — this is a blank desk, not a pre-written campaign.
There are two ways to put content on it:

  1. In the dashboard.  Library → "+ New post". Posts you write there live in
     the browser and in content/schedule.json; they never need this script.
  2. In bulk, from Python.  Drop a part file in this directory named
     posts_*.py that defines POSTS = [ {...}, {...} ], then re-run this
     script. Every part file is picked up automatically, in filename order.

A post dict understands these keys (only `id`, `pillar`, `format`, `hook`
and `body` matter; everything else has a sensible default):

    id         "TP-01" — unique, and the number at the end rotates the
                        discovery hashtags
    pillar     one of PILLAR_LABEL below ("pain"/"nerd"/"customers" are
                        accepted as shorthand)
    format     static | reel | carousel | poll | quiz | story | text
    hook       the big line — the whole post hangs off it
    body       the caption
    cta        closing line (IG + LinkedIn)
    cta_fb     closing line for Facebook, if it needs its own
    li_lead    opening line for LinkedIn, if it differs from the hook
    platforms  "IG,FB,LI"
    tags       which hashtag set to use (see TAGS)
    series     optional series name, for your own grouping
    prompt     image brief — only used if you generate your own artwork
    style      which house style to append to that brief (see STYLES)

The caption builders below are mirrored byte-for-byte in app/captions.js,
which is what the dashboard uses at runtime. `node tools/captions_parity.js`
fails if the two ever drift.
"""
import csv
import glob
import importlib.util
import json
import os
import re
import sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

# ── House image styles ──────────────────────────────────────────────────────
# Appended to a post's image brief. Kept so twenty separately-generated
# images still look like one campaign.
STYLES = {
    "photo-real": (
        "Photorealistic editorial photograph, UK domestic architecture, soft overcast British daylight, "
        "shot on 35mm, shallow depth of field, muted natural palette of slate grey, birch plywood, "
        "anthracite and warm oak. Documentary realism, not glossy advertising. "
        "Absolutely no text, no captions, no logos, no watermarks, no UI overlays."
    ),
    "photo-trades": (
        "Photorealistic candid documentary photograph of a UK tradesperson at work, hi-vis and worn workwear, "
        "tools and laser measure in frame, overcast British daylight, van or scaffold hinted in background, "
        "slightly chaotic and real, not staged. Muted natural palette, 35mm, shallow depth of field. "
        "Absolutely no text, no captions, no logos, no watermarks, no UI overlays."
    ),
    "illustration": (
        "Bold flat vector editorial illustration in the style of a British broadsheet newspaper cartoon, "
        "heavy confident linework, flat colour blocking, limited palette of ink navy, mustard, brick red, "
        "warm off-white and anthracite. Slight paper grain texture. Single clear focal gag, simple background. "
        "Absolutely no text, no speech bubbles, no letters, no logos, no watermarks."
    ),
    "screen-mock": (
        "Clean product photograph of a modern desktop software interface floating at a slight angle, "
        "dark charcoal UI with orange accent, crisp data tables and technical window drawings, "
        "soft neutral studio background with realistic reflections and shadow. "
        "Abstract unreadable micro-text only. No legible words, no logos, no watermarks."
    ),
    "textcard": (
        "Full-bleed typographic poster background, deep anthracite charcoal with subtle warm grain texture "
        "and a faint technical line drawing of a window elevation in the lower third at 6% opacity. "
        "Empty centre space reserved for overlaid text. "
        "Absolutely no text, no letters, no logos, no watermarks."
    ),
}

# ── Hashtag sets ────────────────────────────────────────────────────────────
TAGS = {
    "core": ["windowfittersofinstagram", "windowinstallation", "doubleglazing", "fenorapro"],
    "pain": ["fitterslife", "tradeslife", "windowfittersofinstagram", "uktrades", "fenorapro"],
    "nerd": ["windownerd", "sashwindows", "conservation", "windowdetailing", "fenorapro"],
    "customers": ["homeownerlife", "homeimprovement", "renovationuk", "ukhomeowner", "fenorapro"],
    "planning": ["planningpermission", "planningapplication", "conservationarea", "listedbuilding", "fenorapro"],
    "money": ["smallbusiness", "tradesbusiness", "margin", "quoting", "fenorapro"],
    "contrarian": ["tradesindustry", "unpopularopinion", "buildintrade", "tradesuk", "fenorapro"],
    "wip": ["buildinpublic", "saasbuild", "logistics", "behindthescenes", "fenorapro"],
    "build": ["buildinpublic", "indiehacker", "saasfounder", "startuplife", "fenorapro"],
    "team": ["teambuilding", "tradespeople", "apprentice", "teamwork", "fenorapro"],
    "oneliners": ["tradeslife", "fitterslife", "uktrades", "funnytrades", "fenorapro"],
}

# Broad, high-volume discovery tags added to every post (rotate position).
DISCOVERY = [
    "tradeslife", "tradesmen", "builderlife", "skilledtrades", "bluecollar",
    "constructionuk", "renovation", "homeimprovement", "diy", "makestrends",
    "fenestration", "glazing", "joinery", "doubleglazing", "windows",
    "fyp", "reels", "viral", "trending", "explore", "reelsinstagram",
]

# ── Smart caption generation ────────────────────────────────────────────────
BANNER = "🪟  fenora.pro  —  one record for the whole window job"
LI_SIGN = "\n\n— fenora.pro"


def build_ig(p):
    parts = [p["hook"], "", p["body"]]
    if p.get("cta"):
        parts += ["", p["cta"]]
    parts += ["", BANNER]
    return "\n".join(parts)


def build_ig_caption(p, include_tags=True):
    body = build_ig(p)
    if not include_tags:
        return body
    tags = [f"#{t}" for t in TAGS.get(p["tags"], TAGS["core"])]
    # rotate discovery tags deterministically by post id
    try:
        n = int(p["id"].split("-")[-1])
    except ValueError:
        n = 0
    rot = DISCOVERY[n % len(DISCOVERY):] + DISCOVERY[:n % len(DISCOVERY)]
    tags += [f"#{t}" for t in rot[:14]]
    return body + "\n\n" + " ".join(tags)


def build_fb(p):
    parts = [p["hook"], "", p["body"]]
    if p.get("cta_fb"):
        parts += ["", p["cta_fb"]]
    parts += ["", BANNER]
    return "\n".join(parts)


def _norm(s):
    return re.sub(r"[^a-z0-9]+", "", s.lower())[:60]


def _dedup(lead, body):
    """Drop a body opening line that just restates the lead."""
    lines = body.split("\n")
    while lines and not lines[0].strip():
        lines.pop(0)
    if not lines:
        return body
    a, b = _norm(lead), _norm(lines[0])
    if a and b and (a.startswith(b) or b.startswith(a) or a == b):
        lines.pop(0)
    return "\n".join(lines).strip()


def _flatten_slides(body):
    """LinkedIn has no 'Slide 1:' — turn carousel copy into a clean numbered list."""
    out, n = [], 0
    for line in body.split("\n"):
        m = re.match(r"^\s*Slide\s*(\d+)\s*[:.—-]\s*(.+)$", line)
        if m:
            n += 1
            out.append(f"{n}. {m.group(2).strip()}")
        else:
            out.append(line)
    return "\n".join(out).strip()


def build_li(p):
    lead = p.get("li_lead") or p["hook"]
    body = _dedup(lead, p["body"])
    if p["format"] == "carousel":
        body = _flatten_slides(body)
    parts = [lead, "", body] if body.strip() else [lead]
    if p.get("cta"):
        parts += ["", p["cta"]]
    parts += [LI_SIGN]
    return "\n".join(parts)


def full_prompt(p):
    brief = (p.get("prompt") or "").strip()
    style = STYLES.get(p.get("style"), STYLES["photo-real"])
    return (brief + " " + style).strip() if brief else ""


# ── Part files ──────────────────────────────────────────────────────────────
def load_parts():
    """Import every posts_*.py in this directory and collect its POSTS list."""
    found = []
    for path in sorted(glob.glob(os.path.join(HERE, "posts_*.py"))):
        name = os.path.splitext(os.path.basename(path))[0]
        spec = importlib.util.spec_from_file_location(name, path)
        mod = importlib.util.module_from_spec(spec)
        sys.modules[name] = mod
        spec.loader.exec_module(mod)
        posts = getattr(mod, "POSTS", None)
        if not isinstance(posts, list):
            print(f"⚠️  {name}.py defines no POSTS list — skipped")
            continue
        found.append((name, posts))
    return found


# ── Build ───────────────────────────────────────────────────────────────────
PILLAR_CANON = {
    "pain": "trade-pain", "nerd": "nerd-detail", "customers": "customer-reality",
}
PILLAR_LABEL = {
    "trade-pain": "Trade Pain",
    "nerd-detail": "Nerd Detail",
    "customer-reality": "Customer Reality",
    "planning": "Planning Apps",
    "money": "Margin & Money",
    "contrarian": "Contrarian Takes",
    "wip": "Behind the Scenes",
    "build-in-public": "Build In Public",
    "team": "Team & People",
}
PLATFORM_LABEL = {"IG": "Instagram", "FB": "Facebook", "LI": "LinkedIn"}

COLUMNS = [
    "id", "pillar", "pillar_label", "format", "series", "hook", "body", "cta", "cta_fb",
    "li_lead", "image_prompt", "image_style", "aspect", "platforms", "tagset",
    "caption_ig", "caption_ig_notags", "caption_fb", "caption_li",
    "date", "time", "status", "ig_url", "fb_url", "li_url",
]

rows = []
seen = set()
for part, posts in load_parts():
    for p in posts:
        pillar = PILLAR_CANON.get(p.get("pillar"), p.get("pillar"))
        if pillar not in PILLAR_LABEL:
            print(f"⚠️  {part}: {p.get('id')} has unknown pillar {pillar!r} — skipped")
            continue
        if p["id"] in seen:
            print(f"⚠️  {part}: duplicate id {p['id']} — skipped")
            continue
        seen.add(p["id"])
        p = dict(p, pillar=pillar)
        p.setdefault("format", "static")
        p.setdefault("platforms", "IG,FB,LI")
        p.setdefault("tags", "core")
        p.setdefault("hook", "")
        p.setdefault("body", "")
        plats = [x.strip() for x in str(p["platforms"]).split(",") if x.strip()]
        rows.append({
            "id": p["id"],
            "pillar": pillar,
            "pillar_label": PILLAR_LABEL[pillar],
            "format": p["format"],
            "series": p.get("series", ""),
            "hook": p["hook"],
            "body": p["body"],
            "cta": p.get("cta", ""),
            "cta_fb": p.get("cta_fb", "") or p.get("cta", ""),
            "li_lead": p.get("li_lead", ""),
            "image_prompt": full_prompt(p),
            "image_style": p.get("style", ""),
            "aspect": p.get("img", "4:5"),
            "platforms": ",".join(plats),
            "tagset": p["tags"],
            "caption_ig": build_ig_caption(p, True) if "IG" in plats else "",
            "caption_ig_notags": build_ig_caption(p, False) if "IG" in plats else "",
            "caption_fb": build_fb(p) if "FB" in plats else "",
            "caption_li": build_li(p) if "LI" in plats else "",
            "date": "",
            "time": "",
            "status": "draft",
            "ig_url": "",
            "fb_url": "",
            "li_url": "",
        })

out_json = os.path.join(HERE, "posts.json")
out_csv = os.path.join(HERE, "posts.csv")
out_tags = os.path.join(HERE, "tags.json")

with open(out_json, "w", encoding="utf-8") as f:
    json.dump({"styles": STYLES, "tagsets": TAGS, "discovery": DISCOVERY,
               "pillars": [{"key": k, "label": v} for k, v in PILLAR_LABEL.items()],
               "platforms": [{"key": k, "label": v} for k, v in PLATFORM_LABEL.items()],
               "posts": rows}, f, ensure_ascii=False, indent=1)

with open(out_csv, "w", encoding="utf-8", newline="") as f:
    w = csv.DictWriter(f, fieldnames=COLUMNS)
    w.writeheader()
    w.writerows(rows)

with open(out_tags, "w", encoding="utf-8") as f:
    json.dump({"tagsets": TAGS, "discovery": DISCOVERY, "styles": STYLES}, f,
              ensure_ascii=False, indent=1)

# ── Report ──────────────────────────────────────────────────────────────────
if rows:
    print(f"✅ {len(rows)} posts compiled")
    print("\nBy pillar:")
    for k, v in Counter(r["pillar"] for r in rows).most_common():
        print(f"   {k:<18} {v}")
    print("\nBy format:")
    for k, v in Counter(r["format"] for r in rows).most_common():
        print(f"   {k:<18} {v}")
else:
    print("✅ Library compiled — 0 posts (the desk is empty)")
    print("   Add posts in the dashboard (Library → + New post),")
    print("   or drop a content/posts_*.py part file here and re-run.")
print(f"\nFiles: {out_json}\n       {out_csv}\n       {out_tags}")
