#!/usr/bin/env python3
"""Compile content/posts.json + public/media into data/posts.json for the desk.

The desk needs the posts, their three platform captions and which rendered files
exist. Everything else in the library (image prompts, styles, tag sets, CSV
helpers) stays in content/ where the writers use it.

    python3 tools/build_site_data.py
"""
import json
import os
import sys
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "content", "posts.json")
MEDIA = os.path.join(ROOT, "public", "media")
OUT = os.path.join(ROOT, "data", "posts.json")

ORDER = ["ig", "fb", "li"]
LABEL = {"IG": "ig", "FB": "fb", "LI": "li"}


def captions(post):
    ig = (post.get("caption_ig") or post.get("hook") or "").strip()
    fb = (post.get("caption_fb") or "").strip() or ig
    li = (post.get("caption_li") or "").strip() or ig
    return {"ig": ig, "fb": fb, "li": li}


def media_for(post_id):
    feed = f"{post_id}_4x5.jpg"
    story = f"{post_id}_9x16.jpg"
    has_feed = os.path.exists(os.path.join(MEDIA, feed))
    has_story = os.path.exists(os.path.join(MEDIA, story))
    return {"feed": feed if has_feed else None, "story": story if has_story else None}


def platforms(post):
    raw = [p.strip().upper() for p in (post.get("platforms") or "").split(",") if p.strip()]
    keys = [LABEL[p] for p in raw if p in LABEL]
    return [k for k in ORDER if k in keys] or ["ig"]


def main():
    if not os.path.exists(SRC):
        sys.exit(f"Missing {SRC} — run: cd content && python3 build.py")

    library = json.load(open(SRC, encoding="utf-8"))
    posts, missing, pillar_counts = [], [], {}

    for post in library["posts"]:
        pid = post["id"]
        media = media_for(pid)
        if not media["feed"]:
            missing.append(pid)
        pillar = post["pillar"]
        pillar_counts[pillar] = pillar_counts.get(pillar, 0) + 1
        posts.append(
            {
                "id": pid,
                "pillar": pillar,
                "pillarLabel": post.get("pillar_label") or pillar,
                "format": post.get("format") or "static",
                "hook": (post.get("hook") or "").strip(),
                "platforms": platforms(post),
                "caption": captions(post),
                "media": {"feed": media["feed"] or f"{pid}_4x5.jpg", "story": media["story"]},
            }
        )

    pillars = [
        {
            "key": p["key"],
            "label": p["label"],
            "count": pillar_counts.get(p["key"], 0),
        }
        for p in library["pillars"]
    ]

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    payload = {
        "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "posts": posts,
        "pillars": pillars,
        "missingMedia": missing,
    }
    json.dump(payload, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

    size = os.path.getsize(OUT) / 1024
    rendered = sum(1 for p in posts if p["media"]["feed"] and not p["media"]["feed"].startswith("__"))
    print(
        f"✅ {len(posts)} posts → data/posts.json ({size:.0f} KB) · "
        f"{len(posts) - len(missing)} with rendered images"
    )
    if missing:
        print(f"⚠️  {len(missing)} posts have no rendered image yet: {', '.join(missing[:8])}"
              + (" …" if len(missing) > 8 else ""))
        print("   Run: cd render && python3 render.py   then   python3 tools/to_jpg.py")


if __name__ == "__main__":
    main()
