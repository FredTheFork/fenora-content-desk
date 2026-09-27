#!/usr/bin/env python3
"""PNG masters → upload-ready JPEGs in public/media/.

The desk serves these straight from /media, and Instagram and Facebook fetch
them from that public URL when a post is published, so they are committed with
the site rather than kept out of it.

    python3 tools/to_jpg.py            # everything missing
    python3 tools/to_jpg.py --force    # re-encode everything
"""
import os
import sys
from concurrent.futures import ProcessPoolExecutor

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "render", "png")
DST = os.path.join(ROOT, "public", "media")
QUALITY = 92


def convert(name: str) -> int:
    out = os.path.join(DST, name[:-4] + ".jpg")
    if os.path.exists(out) and "--force" not in sys.argv:
        return 0
    image = Image.open(os.path.join(SRC, name)).convert("RGB")
    image.save(out, "JPEG", quality=QUALITY, optimize=True, progressive=True, subsampling=0)
    return os.path.getsize(out)


def main() -> None:
    if not os.path.isdir(SRC):
        sys.exit(f"Missing {SRC} — render first:  cd render && python3 render.py")
    os.makedirs(DST, exist_ok=True)
    files = sorted(f for f in os.listdir(SRC) if f.endswith(".png"))
    if not files:
        sys.exit(f"No PNGs in {SRC}")

    workers = min(8, (os.cpu_count() or 2) * 2)
    with ProcessPoolExecutor(max_workers=workers) as pool:
        sizes = list(pool.map(convert, files, chunksize=4))

    total = sum(sizes) / 1e6
    print(f"{len(files)} images → public/media ({total:.1f} MB written, quality {QUALITY})")


if __name__ == "__main__":
    main()
