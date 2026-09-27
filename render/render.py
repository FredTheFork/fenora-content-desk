#!/usr/bin/env python3
"""Fenora — render a designed image for every post in the library."""
import json
import os
import re
import sys
import random

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from core import (SS, OUT, AI, PAL, ORANGE, F, new, finish, wrap, fit_text, draw_lines,
                  glow, grain, arched, sash_window, casement, frame_section, cill_detail,
                  sightline, bay_plan, reveal_section, glaze_pattern, ui_mock, phone_mock,
                  van_load, trickle, door_panel, GEOMS, pick_geom, pick_layout, LIGHT_SET)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SIZES = {"1:1": (1080, 1080), "4:5": (1080, 1350), "9:16": (1080, 1920)}


def soft_gradient(im, c1, c2, vertical=True):
    w, h = im.size
    g = Image.new("RGB", (1, h) if vertical else (w, 1))
    gd = ImageDraw.Draw(g)
    n = h if vertical else w
    for i in range(n):
        t = i / max(1, n - 1)
        col = tuple(int(c1[k] + (c2[k] - c1[k]) * t) for k in range(3))
        (gd.line if vertical else gd.line)(((0, i), (0, i)) if vertical else ((i, 0), (i, 0)), fill=col)
    return g.resize((w, h), Image.BILINEAR)


def render(p, size="4:5"):
    W0, H0 = SIZES[size]
    W, H = W0 * SS, H0 * SS
    light = p["id"] in LIGHT_SET
    bg1 = PAL["paper"] if light else PAL["carbon"]
    bg2 = (225, 220, 210) if light else PAL["slate"]

    ai_path = os.path.join(AI, p["id"] + ".png")
    photo = None
    if os.path.exists(ai_path):
        try:
            photo = Image.open(ai_path).convert("RGB")
        except Exception:
            photo = None

    layout = pick_layout(p, photo is not None)
    geom_name = pick_geom(p)
    geom = GEOMS.get(geom_name)

    if photo is not None:
        im, d = new(W, H, bg1)
        lay_photo_img(im, d, W, H, p, photo)
    else:
        im, d = new(W, H, bg1)
        if light:
            im = soft_gradient(im, PAL["paper"], (228, 223, 214))
            d = ImageDraw.Draw(im, "RGBA")
        else:
            im = soft_gradient(im, PAL["carbon"], (25, 29, 36))
            d = ImageDraw.Draw(im, "RGBA")
            glow(im, int(W * 0.5), int(H * 0.34), int(W * 0.72), alpha=34)

        if layout == "quote":
            from core import lay_quote
            lay_quote(d, W, H, p, light)
        elif layout == "number":
            from core import lay_number
            lay_number(d, W, H, p, light)
        elif layout == "diagram":
            from core import lay_diagram
            lay_diagram(d, W, H, p, light, geom)
        elif layout == "product":
            from core import lay_product
            lay_product(d, W, H, p, light, geom if geom_name in ("arched", "sash", "casement") else None)
        elif layout == "split":
            from core import lay_split
            lay_split(d, W, H, p, light, geom)
        else:
            from core import lay_statement
            lay_statement(d, W, H, p, light)

    from core import footers
    footers(d, W, H, light, p["pillar_label"])
    im = grain(im)
    out = finish(im, W0, H0)
    return out


def lay_photo_img(im, d, W, H, p, photo):
    pw, ph = photo.size
    sc = max(W / pw, H / ph)
    photo = photo.resize((max(W, int(pw * sc)), max(H, int(ph * sc))), Image.LANCZOS)
    im.paste(photo, ((W - photo.width) // 2, (H - photo.height) // 2))
    ov = Image.new("RGBA", im.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(ov)
    for i in range(int(H * 0.80)):
        a = int(240 * (i / (H * 0.80)) ** 0.75)
        od.line([(0, H - i), (W, H - i)], fill=(9, 11, 15, a))
    im.paste(Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB"), (0, 0))
    d = ImageDraw.Draw(im, "RGBA")
    x = int(W * 0.07)
    px, wt, lines = fit_text(d, p["hook"], W * 0.86, H * 0.34,
                             [int(W * 0.098), int(W * 0.086), int(W * 0.075), int(W * 0.066), int(W * 0.058)])
    draw_lines(d, lines, x, int(H * 0.545), F(px, wt), PAL["white"])


_POSTS = None
_LIGHT = set()


def _init(posts, light):
    global _POSTS, _LIGHT
    _POSTS, _LIGHT = posts, light
    import core
    core.LIGHT_SET = light


def _one(job):
    p, size = job
    try:
        im = render(p, size)
        im.save(os.path.join(OUT, f'{p["id"]}_{size.replace(":", "x")}.png'), "PNG", optimize=True)
        return None
    except Exception as e:
        return f'  ✗ {p["id"]} {size}: {type(e).__name__}: {e}'


def main():
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(AI, exist_ok=True)
    data = json.load(open(os.path.join(ROOT, "content", "posts.json")))
    posts = data["posts"]

    # Alternate light/dark so the grid has rhythm rather than a wall of black.
    for i, p in enumerate(posts):
        light = (i % 5) in (1, 3)
        if p["format"] in ("reel", "story") or p["pillar"] in ("wip", "build-in-public", "money"):
            light = False
        if p["pillar"] in ("planning", "customer-reality") and i % 3 == 0:
            light = True
        if os.path.exists(os.path.join(AI, p["id"] + ".png")):
            light = False
        if light:
            LIGHT_SET.add(p["id"])

    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    todo = [p for p in posts if not args or p["id"] in args]
    jobs = []
    for p in todo:
        for size in (("4:5", "9:16") if p["format"] in ("reel", "story") else ("4:5",)):
            jobs.append((p, size))

    from multiprocessing import Pool
    with Pool(2, initializer=_init, initargs=(posts, LIGHT_SET)) as pool:
        done = 0
        for err in pool.imap_unordered(_one, jobs, chunksize=4):
            done += 1
            if err:
                print(err, flush=True)
            if done % 40 == 0:
                print(f'  … {done}/{len(jobs)}', flush=True)
    print(f"✅ {done} images → {OUT}  ({len(LIGHT_SET)} light / {len(posts)-len(LIGHT_SET)} dark, "
          f"{len([1 for p in posts if os.path.exists(os.path.join(AI, p['id']+'.png'))])} photo-led)")


if __name__ == "__main__":
    main()
