#!/usr/bin/env python3
"""
Fenora — brand image renderer.

Produces a designed, on-brand image for every post in the library.
Draws real window geometry as vector art (sash, casement, bay, cill section,
sightline diagrams, frame profiles) rather than generic filler, and composites
the Fenora mark, palette and typography system on top.

  python3 render.py            → all 251 posts
  python3 render.py TP-01 ND-05 → just those
  python3 render.py --contact  → contact sheet
"""
import json
import math
import os
import re
import sys
import random

from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(HERE, "png")
AI = os.path.join(ROOT, "assets", "ai")
FONT = os.path.join(ROOT, "assets", "fonts", "MontserratVar.ttf")
SS = 2  # supersample factor

random.seed(7)

# ── Brand ────────────────────────────────────────────────────────────────
ORANGE = (242, 107, 33)
ORANGE_D = (196, 80, 20)
PAL = {
    "charcoal": (27, 31, 37),
    "carbon":   (20, 23, 28),
    "slate":    (30, 34, 42),
    "paper":    (243, 240, 234),
    "bone":     (232, 228, 220),
    "white":    (242, 244, 247),
    "dim":      (120, 128, 140),
    "mute":     (86, 93, 104),
    "line":     (44, 49, 58),
}

_fc = {}


def F(px, weight=800):
    """Montserrat at a given weight (variable font)."""
    k = (int(px), weight)
    if k in _fc:
        return _fc[k]
    f = ImageFont.truetype(FONT, int(px))
    f.set_variation_by_axes([weight])
    _fc[k] = f
    return f


def TW(d, txt, f):
    b = d.textbbox((0, 0), txt, font=f)
    return b[2] - b[0], b[3] - b[1], b[1]


# ── Canvas helpers ───────────────────────────────────────────────────────
def new(w, h, bg):
    im = Image.new("RGB", (w * SS, h * SS), bg)
    return im, ImageDraw.Draw(im, "RGBA")


def finish(im, w, h):
    return im.resize((w, h), Image.LANCZOS)


def wrap(d, txt, f, maxw):
    words, lines, cur = txt.split(), [], ""
    for wd in words:
        t = (cur + " " + wd).strip()
        if d.textlength(t, font=f) <= maxw or not cur:
            cur = t
        else:
            lines.append(cur)
            cur = wd
    if cur:
        lines.append(cur)
    return lines


def fit_text(d, txt, box_w, box_h, sizes, weights=(900, 800, 700, 600), gap=1.22):
    """Pick the largest size that fits, avoiding stranded single-word lines."""
    best = None
    for px in sizes:
        for wt in weights:
            f = F(px, wt)
            ls = wrap(d, txt, f, box_w)
            if any(len(l.split()) == 1 for l in ls[1:-1]):
                sc = ls[:]
            else:
                sc = ls
            need = len(sc) * px * gap
            score = (px if len(sc) <= 7 else 0) - (6 if any(len(l.split()) == 1 for l in sc[1:-1]) else 0)
            if need <= box_h and (best is None or px > best[0]):
                best = (px, wt, sc)
            if best and px > best[0]:
                break
    if not best:
        px = sizes[-1]
        f = F(px, 700)
        return px, 700, wrap(d, txt, f, box_w)[:8]
    return best


def draw_lines(d, lines, x, y, f, fill, gap=1.22, anchor_x=None):
    lh = f.size * gap
    for i, ln in enumerate(lines):
        d.text((anchor_x if anchor_x is not None else x, y + i * lh), ln, font=f, fill=fill)
    return y + len(lines) * lh


def glow(im, cx, cy, r, color=(242, 107, 33), alpha=46):
    g = Image.new("RGBA", im.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(g)
    gd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color + (alpha,))
    g = g.filter(ImageFilter.GaussianBlur(r * 0.55))
    im.paste(Image.alpha_composite(im.convert("RGBA"), g).convert("RGB"), (0, 0))


def grain(im, amount=7):
    w, h = im.size
    n = Image.effect_noise((w // 3, h // 3), amount).convert("L").resize((w, h), Image.BILINEAR)
    n = n.filter(ImageFilter.GaussianBlur(0.6)).convert("RGB")
    return Image.blend(im, Image.blend(im, n, 0.5), 0.055)


# ══════════════════════════ WINDOW GEOMETRY ══════════════════════════════
def rr(d, box, r, **kw):
    d.rounded_rectangle(box, radius=r, **kw)


def frame_win(d, x, y, w, h, ink, glass, r=6, t=None):
    """Generic rectangular window: frame + glazing."""
    t = t or max(6, int(w * 0.055))
    rr(d, (x, y, x + w, y + h), r, fill=ink)
    rr(d, (x + t, y + t, x + w - t, y + h - t), max(2, r - 3), fill=glass)


def arched(d, cx, top, w, h, ink, glass, mullion=True, t=None):
    """The Fenora mark: an arched window with a cross division."""
    t = t or max(7, int(w * 0.075))
    x0, x1 = cx - w / 2, cx + w / 2
    y0, y1 = top, top + h
    r = w / 2
    d.pieslice([x0, y0, x0 + w, y0 + w], 180, 360, fill=ink)
    d.rectangle([x0, y0 + r, x1, y1], fill=ink)
    # aperture
    ix0, ix1, iy0, iy1 = x0 + t, x1 - t, y0 + t, y1 - t
    ir = (ix1 - ix0) / 2
    d.pieslice([ix0, iy0, ix0 + (ix1 - ix0), iy0 + (ix1 - ix0)], 180, 360, fill=glass)
    d.rectangle([ix0, iy0 + ir, ix1, iy1], fill=glass)
    if mullion:
        mx = cx
        my = y0 + t + ir
        d.line([mx, y0 + t, mx, y1 - t], fill=ink, width=int(t * 0.82))
        d.line([x0 + t, my, x1 - t, my], fill=ink, width=int(t * 0.82))
    return (x0, y0, x1, y1)


def sash_window(d, x, y, w, h, ink, glass, over=2, cols=3, meeting=True):
    t = max(8, int(w * 0.07))
    frame_win(d, x, y, w, h, ink, glass, r=4, t=t)
    ix0, iy0, ix1, iy1 = x + t, y + t, x + w - t, y + h - t
    midy = (iy0 + iy1) / 2 if meeting else iy1
    d.line([ix0, midy, ix1, midy], fill=ink, width=int(t * 0.9))
    if meeting:
        d.rectangle([x + t, midy - t * 0.5, x + w - t, midy + t * 0.5], fill=ink)
    for i in range(1, over):
        yy = iy0 + (midy - iy0) * i / over
        d.line([ix0, yy, ix1, yy], fill=ink, width=int(t * 0.55))
    for j in range(1, cols):
        xx = ix0 + (ix1 - ix0) * j / cols
        for (a, b) in [(iy0, midy), (midy, iy1)]:
            d.line([xx, a, xx, b], fill=ink, width=int(t * 0.55))
    # cill
    d.rectangle([x - w * 0.03, y + h, x + w * 1.03, y + h + t * 0.85], fill=ink)


def casement(d, x, y, w, h, ink, glass, openers=1, split=0.5):
    t = max(8, int(w * 0.075))
    frame_win(d, x, y, w, h, ink, glass, r=4, t=t)
    ix0, iy0, ix1, iy1 = x + t, y + t, x + w - t, y + h - t
    mx = ix0 + (ix1 - ix0) * split
    d.line([mx, iy0, mx, iy1], fill=ink, width=int(t * 0.95))
    for (a, b, side) in [(ix0, mx, 1), (mx, ix1, -1)]:
        hx = b - t * 0.9 if side > 0 else a + t * 0.9
        d.line([hx, (iy0 + iy1) / 2, hx, (iy0 + iy1) / 2 + t * 1.6], fill=ORANGE, width=int(t * 0.42))
    d.rectangle([x - w * 0.03, y + h, x + w * 1.03, y + h + t * 0.85], fill=ink)


def frame_section(d, cx, cy, w, h, ink, glass, accent=ORANGE):
    """uPVC-ish profile cross-section with a glazing bead and glass edge."""
    t = max(5, int(w * 0.10))
    rr(d, (cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2), int(t * 0.6), fill=ink)
    # hollow chamber ribs
    for i in range(4):
        xx = cx - w / 2 + w * (i + 0.5) / 4
        d.line([xx, cy - h / 2 + t * 0.8, xx, cy + h / 2 - t * 0.8], fill=glass, width=int(t * 0.22))
    d.line([cx - w / 2, cy - h / 2, cx + w / 2, cy - h / 2], fill=accent, width=int(t * 0.5))
    d.rectangle([cx + w / 2 - t * 0.2, cy - h * 0.42, cx + w / 2 + t * 1.5, cy - h * 0.22], fill=glass)
    d.rectangle([cx + w / 2 + t * 1.5, cy - h * 0.46, cx + w / 2 + t * 2.1, cy - h * 0.18], fill=accent)


def cill_detail(d, x, y, w, ink, glass, accent=ORANGE):
    """Cill in section: horn, fall, sealant, DPC."""
    t = max(8, int(w * 0.035))
    d.rectangle([x, y, x + w * 0.86, y + t * 1.5], fill=ink)                 # cill
    d.polygon([(x + w * 0.86, y), (x + w, y + t * 0.7), (x + w, y + t * 1.9), (x + w * 0.86, y + t * 1.5)], fill=ink)
    d.polygon([(x, y), (x - w * 0.06, y + t * 0.6), (x - w * 0.06, y + t * 1.0), (x, y + t * 1.5)], fill=ink)
    d.line([(x + w * 0.05, y + t * 1.5), (x + w * 0.9, y + t * 1.5)], fill=accent, width=int(t * 0.3))
    d.rectangle([x + w * 0.10, y - t * 2.4, x + w * 0.30, y], fill=glass)    # frame above
    d.ellipse([x + w * 0.24, y + t * 0.3, x + w * 0.31, y + t * 1.2], fill=accent)
    d.arc([x - w * 0.02, y + t * 1.6, x + w * 0.34, y + t * 3.4], 200, 340, fill=accent, width=int(t * 0.24))


def sightline(d, x, y, w, h, ink, glass, accent=ORANGE, label=""):
    """Frame + bar, glass area filled — the 'how much is actually glass' diagram."""
    t = max(10, int(w * 0.115))
    rr(d, (x, y, x + w, y + h), 4, fill=ink)
    ix0, iy0, ix1, iy1 = x + t, y + t, x + w - t, y + h - t
    rr(d, (ix0, iy0, ix1, iy1), 2, fill=glass)
    mx = (ix0 + ix1) / 2
    my = (iy0 + iy1) / 2
    d.line([mx, iy0, mx, iy1], fill=ink, width=int(t * 0.62))
    d.line([ix0, my, ix1, my], fill=ink, width=int(t * 0.62))
    # arrows showing sightlines
    for (a, b) in [((x, my), (ix0, my)), ((ix1, my), (x + w, my))]:
        d.line([a, b], fill=accent, width=int(t * 0.26))
    d.text((x + w + int(t * 0.8), my), label, font=F(int(t * 0.78), 700), fill=accent, anchor="lm")


def bay_plan(d, cx, cy, w, ink, glass, accent=ORANGE):
    """Canted bay in plan — 30° vs 45°."""
    hw = w / 2
    seg = [(-hw, 0), (-hw * 0.42, -hw * 0.72), (hw * 0.42, -hw * 0.72), (hw, 0)]
    pts = [(cx + a, cy + b) for a, b in seg]
    d.line(pts + [pts[0]], fill=ink, width=int(w * 0.028), joint="curve")
    for i in range(1, len(pts) - 1):
        d.line([pts[i], pts[i + 1]], fill=accent, width=int(w * 0.016))
    d.line([(cx - hw, cy), (cx + hw, cy)], fill=glass, width=int(w * 0.008))
    d.line([(cx - hw, cy), (cx - hw, cy - hw * 0.2)], fill=ink, width=int(w * 0.02))


def reveal_section(d, x, y, w, h, ink, glass, accent=ORANGE):
    """Wall in section showing a deep reveal and the frame sitting in it."""
    d.rectangle([x, y, x + w, y + h * 0.2], fill=ink)                        # head
    d.rectangle([x, y, x + w * 0.2, y + h], fill=ink)                        # jamb
    d.rectangle([x + w, y, x + w + h * 0.2, y + h], fill=ink)
    d.rectangle([x, y + h * 0.8, x + w, y + h], fill=ink)
    d.rectangle([x + w * 0.2, y + h * 0.2, x + w * 0.42, y + h * 0.8], fill=glass)
    d.rectangle([x + w * 0.45, y + h * 0.2, x + w * 0.95, y + h * 0.8], fill=(150, 175, 195, 60))
    d.line([(x + w * 0.45, y + h * 0.2), (x + w * 0.45, y + h * 0.8)], fill=accent, width=4)
    d.line([(x + w * 0.2, y + h * 0.2), (x + w, y + h * 0.2)], fill=accent, width=3)
    d.polygon([(x + w * 0.45, y + h * 0.8), (x + w * 0.62, y + h * 0.66), (x + w * 0.45, y + h * 0.54)], fill=accent)


def glaze_pattern(d, x, y, w, h, ink, glass, cols, rows, kind="georgian"):
    t = max(6, int(w * 0.06))
    frame_win(d, x, y, w, h, ink, glass, r=4, t=t)
    ix0, iy0, ix1, iy1 = x + t, y + t, x + w - t, y + h - t
    for i in range(1, cols):
        xx = ix0 + (ix1 - ix0) * i / cols
        d.line([xx, iy0, xx, iy1], fill=ink, width=int(t * (0.5 if kind != "georgian" else 0.34)))
    for j in range(1, rows):
        yy = iy0 + (iy1 - iy0) * j / rows
        d.line([ix0, yy, ix1, yy], fill=ink, width=int(t * (0.5 if kind != "georgian" else 0.34)))


def ui_mock(d, x, y, w, h, ink, glass, accent=ORANGE):
    """Abstract product-UI card — pipeline / table / chart feel."""
    rr(d, (x, y, x + w, y + h), int(w * 0.028), fill=ink)
    d.line([x, y + h * 0.13, x + w, y + h * 0.13], fill=glass, width=2)
    for i in range(3):
        d.ellipse([x + w * 0.035 + i * w * 0.035, y + h * 0.05,
                   x + w * 0.055 + i * w * 0.035, y + h * 0.075], fill=glass)
    cols = 4
    for r in range(5):
        for c in range(cols):
            cxx = x + w * 0.045 + c * (w * 0.91 / cols)
            cyy = y + h * 0.22 + r * h * 0.145
            on = (r + c) % 5 == 0
            rr(d, (cxx, cyy, cxx + w * (0.91 / cols - 0.025), cyy + h * 0.105), int(w * 0.012),
               fill=accent + (52,) if on else glass)
            if on:
                d.rectangle((cxx, cyy, cxx + w * 0.012, cyy + h * 0.105), fill=accent)
    d.line([x + w * 0.045, y + h * 0.19, x + w * 0.52, y + h * 0.19], fill=glass, width=3)


def phone_mock(d, x, y, w, h, ink, glass, accent=ORANGE):
    rr(d, (x, y, x + w, y + h), int(w * 0.11), fill=ink, outline=glass, width=max(2, int(w * 0.014)))
    d.rounded_rectangle((x + w * 0.40, y + h * 0.026, x + w * 0.60, y + h * 0.055), int(w * 0.02), fill=glass)
    ix0, iy0, ix1 = x + w * 0.09, y + h * 0.10, x + w * 0.91
    for i in range(5):
        yy = iy0 + i * h * 0.155
        d.line([ix0, yy, ix1, yy], fill=glass, width=2)
        rr(d, (ix0, yy + h * 0.035, ix0 + w * (0.30 + 0.12 * ((i * 7) % 4)), yy + h * 0.075),
           int(h * 0.012), fill=accent + (70,) if i < 3 else glass)


def van_load(d, x, y, w, h, ink, glass, accent=ORANGE):
    """Frames stacked on a rack, seen side on."""
    n = 6
    for i in range(n):
        yy = y + h * 0.12 + i * h * 0.13
        ww = w * (0.90 - i * 0.035)
        d.rectangle((x + i * w * 0.02, yy, x + i * w * 0.02 + ww, yy + h * 0.085), fill=glass,
                    outline=ink, width=2)
        d.line([(x + i * w * 0.02 + ww * 0.5, yy), (x + i * w * 0.02 + ww * 0.5, yy + h * 0.085)],
               fill=ink, width=2)
    d.line([(x - w * 0.03, y + h * 0.95), (x + w * 1.03, y + h * 0.95)], fill=accent, width=4)
    d.line([(x, y + h * 0.05), (x, y + h * 0.95)], fill=accent, width=4)


def trickle(d, x, y, w, ink, glass, accent=ORANGE):
    h = w * 0.14
    rr(d, (x, y, x + w, y + h), int(h * 0.35), fill=ink)
    for i in range(4):
        xx = x + w * (0.22 + i * 0.19)
        d.rectangle((xx, y + h * 0.30, xx + w * 0.10, y + h * 0.74), fill=glass)
    d.line([(x + w * 0.5, y - h * 0.9), (x + w * 0.5, y)], fill=accent, width=3)
    d.polygon([(x + w * 0.5, y - h * 1.5), (x + w * 0.38, y - h * 0.95), (x + w * 0.62, y - h * 0.95)], fill=accent)


def door_panel(d, x, y, w, h, ink, glass, panels=2, accent=ORANGE):
    t = max(8, int(w * 0.06))
    frame_win(d, x, y, w, h, ink, glass, r=3, t=t)
    ix0, iy0, ix1, iy1 = x + t, y + t, x + w - t, y + h - t
    for i in range(panels):
        ph = (iy1 - iy0) / panels
        yy = iy0 + i * ph
        d.line([ix0, yy, ix1, yy], fill=ink, width=int(t * 0.5))
    d.ellipse([ix1 - t * 2.0, (iy0 + iy1) / 2 - t * 0.35, ix1 - t * 0.6, (iy0 + iy1) / 2 + t * 0.35], fill=accent)
    d.rectangle([x - w * 0.02, y + h, x + w * 1.02, y + h + t * 0.7], fill=ink)


# ══════════════════════════ LAYOUTS ═════════════════════════════════════
def footers(d, W, H, bg_light, pillar):
    ink = PAL["mute"] if bg_light else PAL["dim"]
    fy = H - int(H * 0.042)
    fs = int(W * 0.0245)
    d.text((int(W * 0.075), fy), "FENORA", font=F(fs, 800), fill=ORANGE, anchor="lm")
    d.text((int(W * 0.075) + int(W * 0.098), fy), "fenora.pro", font=F(int(fs * 0.94), 500), fill=ink, anchor="lm")
    d.line([(int(W * 0.925) - int(fs * 5.2), fy), (int(W * 0.925) - int(fs * 0.4), fy)], fill=ink, width=1)
    d.text((int(W * 0.925), fy), pillar.upper(), font=F(int(fs * 0.82), 700), fill=ink, anchor="rm")


def arched_outline(d, cx, top, w, h, color, t):
    """The Fenora arch drawn as line art (not a filled block)."""
    x0, x1 = cx - w / 2, cx + w / 2
    y0, y1 = top, top + h
    r = w / 2
    d.arc([x0, y0, x0 + w, y0 + w], 180, 360, fill=color, width=t)
    d.line([(x0, y0 + r), (x0, y1)], fill=color, width=t)
    d.line([(x1, y0 + r), (x1, y1)], fill=color, width=t)
    d.line([(x0, y1), (x1, y1)], fill=color, width=t)
    ix0, ix1, iy0, iy1 = x0 + t, x1 - t, y0 + t, y1 - t
    ir = (ix1 - ix0) / 2
    d.arc([ix0, iy0, ix0 + (ix1 - ix0), iy0 + (ix1 - ix0)], 180, 360, fill=color, width=max(1, int(t * 0.8)))
    d.line([(ix0, iy0 + ir), (ix0, iy1)], fill=color, width=max(1, int(t * 0.8)))
    d.line([(ix1, iy0 + ir), (ix1, iy1)], fill=color, width=max(1, int(t * 0.8)))
    d.line([(ix0, iy1), (ix1, iy1)], fill=color, width=max(1, int(t * 0.8)))
    d.line([(cx, iy0), (cx, iy1)], fill=color, width=int(t * 0.8))
    d.line([(ix0, iy0 + ir), (ix1, iy0 + ir)], fill=color, width=int(t * 0.8))


def _ink(light):
    return PAL["charcoal"] if light else PAL["white"]


def _glass(light):
    return (150, 170, 196, 105) if light else (172, 190, 212, 95)


def _draw_ink(light):
    return (52, 58, 68) if light else (226, 232, 240)


def hero_mark(d, W, H, light, alpha=34):
    """Large brand arch in line art, used as a quiet anchor."""
    col = (46, 52, 62, alpha + (14 if light else 0)) if light else (255, 255, 255, alpha)
    w = W * 0.80
    arched_outline(d, W / 2, int(H * 0.48) - w * 0.75, w, w * 1.5, col, int(W * 0.016))


def kicker(p):
    """First line of the body, trimmed — the image should work without the caption."""
    body = (p.get("body") or "").strip()
    for ln in body.split("\n"):
        ln = ln.strip()
        if not ln or ln.lower().startswith("slide") or ln.lower() == p["hook"].strip().lower():
            continue
        return ln
    return ""


def lay_kicker(d, W, H, p, light, y, maxlines=3):
    k = kicker(p)
    if not k:
        return y
    ink = PAL["mute"] if light else PAL["dim"]
    fs = int(W * 0.033)
    f = F(fs, 500)
    maxw = W * 0.80
    ls = wrap(d, k, f, maxw)[:maxlines]
    for i, ln in enumerate(ls):
        d.text((int(W * 0.075), y + i * fs * 1.42), ln, font=f, fill=ink)
    return y + len(ls) * fs * 1.42


def lay_statement(d, W, H, p, light):
    """Big type, optically centred, brand arch behind, kicker beneath."""
    ink = _ink(light)
    hero_mark(d, W, H, light, alpha=40 if not light else 52)
    x, maxw = int(W * 0.075), W * 0.85
    px, wt, lines = fit_text(d, p["hook"], maxw, H * 0.48,
                             [int(W * 0.150), int(W * 0.132), int(W * 0.116), int(W * 0.102),
                              int(W * 0.090), int(W * 0.080), int(W * 0.070), int(W * 0.062)])
    lh = px * 1.16
    top = int(H * 0.44 - (len(lines) * lh) / 2)
    for i, ln in enumerate(lines):
        d.text((x, top + i * lh), ln, font=F(px, wt), fill=ink)
    y = top + len(lines) * lh
    d.rectangle((x, y + int(H * 0.030), x + int(W * 0.17), y + int(H * 0.030) + int(H * 0.0105)), fill=ORANGE)
    lay_kicker(d, W, H, p, light, int(y + H * 0.085))


def lay_number(d, W, H, p, light):
    """A single figure, enormous."""
    ink = _ink(light)
    m = re.search(r"(£[\d,]+|\d[\d,]{0,6})", p["hook"])
    big = (m.group(1) if m else "—").strip()
    rest = p["hook"].replace(big, "").strip(" .:,;—–-“”\"'()")
    x = int(W * 0.075)
    fs = F(int(W * 0.40), 900)
    tw = d.textlength(big, font=fs)
    if tw > W * 0.86:                                   # shrink to fit
        fs = F(int(W * 0.40 * (W * 0.86) / tw), 900)
    d.text((x, int(H * 0.22)), big, font=fs, fill=ORANGE)
    y = int(H * 0.22) + fs.size * 1.02
    if rest:
        px, wt, lines = fit_text(d, rest, W * 0.85, H * 0.40,
                                 [int(W * 0.100), int(W * 0.088), int(W * 0.076), int(W * 0.066), int(W * 0.058)])
        for i, ln in enumerate(lines):
            d.text((x, y + int(H * 0.045) + i * px * 1.18), ln, font=F(px, wt), fill=ink)
    d.rectangle((x, y + int(H * 0.018), x + int(W * 0.15), y + int(H * 0.018) + int(H * 0.010)), fill=ORANGE)


def lay_quote(d, W, H, p, light):
    """Quotation mark in its own band, never overlapping the text."""
    ink = _ink(light)
    hero_mark(d, W, H, light, alpha=26 if not light else 34)
    d.text((int(W * 0.060), int(H * 0.075)), "“", font=F(int(W * 0.34), 900), fill=ORANGE)
    x, maxw = int(W * 0.10), W * 0.80
    px, wt, lines = fit_text(d, p["hook"], maxw, H * 0.46,
                             [int(W * 0.130), int(W * 0.114), int(W * 0.100), int(W * 0.088),
                              int(W * 0.078), int(W * 0.068), int(W * 0.060)])
    lh = px * 1.16
    top = int(H * 0.46 - (len(lines) * lh) / 2) + int(H * 0.035)
    for i, ln in enumerate(lines):
        d.text((x, top + i * lh), ln, font=F(px, wt), fill=ink)
    y = top + len(lines) * lh
    d.rectangle((x, y + int(H * 0.035), x + int(W * 0.15), y + int(H * 0.035) + int(H * 0.0105)), fill=ORANGE)
    lay_kicker(d, W, H, p, light, int(y + H * 0.090))


def lay_diagram(d, W, H, p, light, geom):
    """Title band up top, large technical drawing filling the rest."""
    ink = _ink(light)
    dink, dglass = _draw_ink(light), _glass(light)
    x, maxw = int(W * 0.075), W * 0.85
    px, wt, lines = fit_text(d, p["hook"], maxw, H * 0.32,
                             [int(W * 0.120), int(W * 0.106), int(W * 0.094), int(W * 0.082),
                              int(W * 0.072), int(W * 0.064)])
    for i, ln in enumerate(lines):
        d.text((x, int(H * 0.105) + i * px * 1.16), ln, font=F(px, wt), fill=ink)
    y = int(H * 0.105) + len(lines) * px * 1.16
    d.rectangle((x, y + int(H * 0.026), x + int(W * 0.17), y + int(H * 0.026) + int(H * 0.0105)), fill=ORANGE)
    gy, gh = int(H * 0.46), int(H * 0.40)
    if geom:
        geom(d, W, gy, gh, dink, dglass, ORANGE)
    else:
        ui_mock(d, int(W * 0.10), gy, int(W * 0.80), gh, dink, dglass, ORANGE)


def lay_product(d, W, H, p, light, geom=None):
    """Title band, then a real product surface — window or UI."""
    ink = _ink(light)
    dink, dglass = _draw_ink(light), _glass(light)
    x, maxw = int(W * 0.075), W * 0.85
    px, wt, lines = fit_text(d, p["hook"], maxw, H * 0.32,
                             [int(W * 0.120), int(W * 0.106), int(W * 0.094), int(W * 0.082),
                              int(W * 0.072), int(W * 0.064)])
    for i, ln in enumerate(lines):
        d.text((x, int(H * 0.105) + i * px * 1.16), ln, font=F(px, wt), fill=ink)
    y = int(H * 0.105) + len(lines) * px * 1.16
    d.rectangle((x, y + int(H * 0.026), x + int(W * 0.17), y + int(H * 0.026) + int(H * 0.0105)), fill=ORANGE)
    gy, gh = int(H * 0.47), int(H * 0.38)
    card = (222, 218, 210) if light else PAL["slate"]
    if geom:
        geom(d, W, gy, gh, dink, dglass, ORANGE)
    else:
        ui_mock(d, int(W * 0.09), gy, int(W * 0.82), gh, card, dglass, ORANGE)


def lay_split(d, W, H, p, light, geom=None):
    """Two-tone: type above the fold, drawing below it."""
    ink = _ink(light)
    split = int(H * 0.56)
    d.rectangle((0, 0, W, split), fill=(228, 223, 214) if light else (29, 33, 40))
    d.rectangle((0, 0, int(W * 0.016), H), fill=ORANGE)
    dink = _draw_ink(light) if not light else (48, 54, 64)
    dglass = (170, 186, 206, 70) if not light else (120, 142, 168, 85)
    x, maxw = int(W * 0.075), W * 0.84
    px, wt, lines = fit_text(d, p["hook"], maxw, split * 0.62,
                             [int(W * 0.130), int(W * 0.114), int(W * 0.100), int(W * 0.088),
                              int(W * 0.078), int(W * 0.068)])
    lh = px * 1.16
    top = int(split * 0.46 - (len(lines) * lh) / 2)
    for i, ln in enumerate(lines):
        d.text((x, top + i * lh), ln, font=F(px, wt), fill=ink)
    if geom:
        geom(d, W, int(H * 0.60), int(H * 0.32), dink, dglass, ORANGE)
    else:
        ui_mock(d, int(W * 0.12), int(H * 0.60), int(W * 0.76), int(H * 0.32), dink, dglass, ORANGE)


def lay_photo(d, W, H, p, light, photo=None):
    if photo is None:
        return lay_statement(d, W, H, p, light)
    return None  # handled in render.py before the draw object exists


# ══════════════════════════ GEOMETRY PICKER ═════════════════════════════
GEOMS = {
    "arched":     lambda d, W, y, h, i, g, a: arched(d, W / 2, y + h * 0.06, h * 0.80, h * 0.88, i, g),
    "sash":       lambda d, W, y, h, i, g, a: sash_window(d, W * 0.235, y + h * 0.02, W * 0.53, h * 0.90, i, g, over=2, cols=3),
    "sash6":      lambda d, W, y, h, i, g, a: sash_window(d, W * 0.235, y + h * 0.02, W * 0.53, h * 0.90, i, g, over=3, cols=2),
    "casement":   lambda d, W, y, h, i, g, a: casement(d, W * 0.215, y + h * 0.03, W * 0.57, h * 0.88, i, g),
    "glazing":    lambda d, W, y, h, i, g, a: glaze_pattern(d, W * 0.255, y + h * 0.03, W * 0.49, h * 0.88, i, g, 3, 3, "astragal"),
    "sightline":  lambda d, W, y, h, i, g, a: sightline(d, W * 0.195, y + h * 0.02, W * 0.52, h * 0.92, i, g, a, "t"),
    "section":    lambda d, W, y, h, i, g, a: frame_section(d, W * 0.44, y + h * 0.5, W * 0.60, h * 0.80, i, g, a),
    "cill":       lambda d, W, y, h, i, g, a: cill_detail(d, W * 0.16, y + h * 0.30, W * 0.62, i, g, a),
    "bay":        lambda d, W, y, h, i, g, a: bay_plan(d, W / 2, y + h * 0.52, W * 0.66, i, g, a),
    "reveal":     lambda d, W, y, h, i, g, a: reveal_section(d, W * 0.19, y + h * 0.04, W * 0.55, h * 0.90, i, g, a),
    "door":       lambda d, W, y, h, i, g, a: door_panel(d, W * 0.285, y + h * 0.03, W * 0.43, h * 0.88, i, g, 2, a),
    "trickle":    lambda d, W, y, h, i, g, a: trickle(d, W * 0.22, y + h * 0.40, W * 0.56, i, g, a),
    "van":        lambda d, W, y, h, i, g, a: van_load(d, W * 0.16, y + h * 0.02, W * 0.62, h * 0.94, i, g, a),
    "ui":         lambda d, W, y, h, i, g, a: ui_mock(d, W * 0.065, y + h * 0.02, W * 0.87, h * 0.96, i, g, a),
    "phone":      lambda d, W, y, h, i, g, a: phone_mock(d, W * 0.325, y, W * 0.35, h * 0.98, i, g, a),
}

KEY = [
    (r"sash\b|sashes", "sash"),
    (r"\bcill\b|\bsill\b|dog.?ear|projection|horn", "cill"),
    (r"sightline|glass area|how much glass|28%|glazing bar|astragal|georgian|pane", "sightline"),
    (r"\bbay\b|coupled|oriel|porch|45°|45 degree|30°", "bay"),
    (r"reveal|plaster|architrave|return\b", "reveal"),
    (r"section|frame|profile|u-?value|psi|thermal|spacer|argon|sealed unit|glazing|trickle", "section"),
    (r"door|french|stable|bifold|sliding", "door"),
    (r"delivery|load|van|frame rack|payload|route|drop", "van"),
    (r"survey app|phone|offline|site|crm|record|job finder|dashboard|system|software", "ui"),
    (r"casement|tilt|flush casement|opener", "casement"),
]

GEOM_BY_PILLAR = {
    "trade-pain": "reveal", "nerd-detail": "sightline", "customer-reality": "arched",
    "planning": "arched", "money": "ui", "contrarian": "sash",
    "wip": "ui", "build-in-public": "ui", "team": "arched",
}


def pick_geom(p):
    t = (p["hook"] + " " + p["body"] + " " + p.get("image_prompt", "")).lower()
    for pat, g in KEY:
        if re.search(pat, t):
            return g
    return GEOM_BY_PILLAR.get(p["pillar"], "arched")


def pick_layout(p, has_photo):
    if has_photo:
        return "photo"
    st = p.get("image_style", "")
    fmt = p["format"]
    if st == "screen-mock" or p["pillar"] in ("wip", "build-in-public"):
        return "product"
    if p["pillar"] == "money" and p["format"] == "text":
        return "product"
    if p["hook"].strip().startswith("“") and len(p["hook"]) < 60:
        return "quote"
    if re.match(r"^[\"“]?[\d£]", p["hook"].strip()) and len(p["hook"]) < 46:
        return "number"
    if p["format"] in ("carousel", "reel") or st in ("photo-real", "photo-trades"):
        return "diagram" if p["pillar"] in ("nerd-detail",) else "statement"
    if p["pillar"] in ("contrarian",):
        return "split"
    return "statement"


def light_bg(p):
    return p["id"] in LIGHT_SET


LIGHT_SET = set()
