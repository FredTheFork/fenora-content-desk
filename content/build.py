#!/usr/bin/env python3
"""
Fenora Pro — content library builder.
Compiles all post parts into posts.json + posts.csv for the scheduling dashboard.
"""
import csv
import re
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from posts_a import POSTS, STYLES  # noqa: E402
import posts_b  # noqa: E402,F401
import posts_c  # noqa: E402,F401
import posts_d  # noqa: E402,F401

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
    return (p["prompt"].strip() + " " + STYLES.get(p["style"], STYLES["photo-real"])).strip()


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

rows = []
for p in POSTS:
    p["pillar"] = PILLAR_CANON.get(p["pillar"], p["pillar"])
    plats = [x.strip() for x in p["platforms"].split(",")]
    rows.append({
        "id": p["id"],
        "pillar": p["pillar"],
        "format": p["format"],
        "series": p.get("series", ""),
        "hook": p["hook"],
        "body": p["body"],
        "cta": p.get("cta", ""),
        "image_prompt": full_prompt(p),
        "image_style": p["style"],
        "aspect": p.get("img", "4:5"),
        "platforms": p["platforms"],
        "tagset": p["tags"],
        "caption_ig": build_ig_caption(p, True) if "IG" in plats else "",
        "caption_ig_notags": build_ig_caption(p, False) if "IG" in plats else "",
        "caption_fb": build_fb(p) if "FB" in plats else "",
        "caption_li": build_li(p) if "LI" in plats else "",
        "date": "",
        "time": "08:15",
        "status": "draft",
        "ig_url": "",
        "fb_url": "",
        "li_url": "",
        "pillar_label": PILLAR_LABEL[p["pillar"]],
    })

out_json = os.path.join(HERE, "posts.json")
out_csv = os.path.join(HERE, "posts.csv")
out_tags = os.path.join(HERE, "tags.json")

with open(out_json, "w", encoding="utf-8") as f:
    json.dump({"styles": STYLES, "tagsets": TAGS, "discovery": DISCOVERY,
               "pillars": [{"key": k, "label": v} for k, v in PILLAR_LABEL.items()],
               "platforms": [{"key": k, "label": v} for k, v in PLATFORM_LABEL.items()],
               "posts": rows}, f, ensure_ascii=False, indent=1)

cols = list(rows[0].keys())
with open(out_csv, "w", encoding="utf-8", newline="") as f:
    w = csv.DictWriter(f, fieldnames=cols)
    w.writeheader()
    w.writerows(rows)

with open(out_tags, "w", encoding="utf-8") as f:
    json.dump({"tagsets": TAGS, "discovery": DISCOVERY, "styles": STYLES}, f,
              ensure_ascii=False, indent=1)

# ── Report ──────────────────────────────────────────────────────────────────
from collections import Counter  # noqa: E402
print(f"✅ {len(rows)} posts compiled")
print("\nBy pillar:")
for k, v in Counter(r["pillar"] for r in rows).most_common():
    print(f"   {k:<18} {v}")
print("\nBy format:")
for k, v in Counter(r["format"] for r in rows).most_common():
    print(f"   {k:<18} {v}")
print(f"\nFiles: {out_json}\n       {out_csv}\n       {out_tags}")
