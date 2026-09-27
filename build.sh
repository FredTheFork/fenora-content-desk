#!/usr/bin/env bash
# Fenora Content Desk — build everything from scratch.
#
#   ./build.sh          render all 251 images + zip them
#   ./build.sh serve    just start the dashboard
#
# Requires: Node 18+ (dashboard), Python 3 + Pillow (images).
set -euo pipefail
cd "$(dirname "$0")"

if [ "${1:-}" = "serve" ]; then
  echo "Starting Content Desk on http://localhost:4321"
  exec node server.js
fi

command -v python3 >/dev/null || { echo "Python 3 required."; exit 1; }
python3 -c "import PIL" 2>/dev/null || {
  echo "Pillow is required for the image renderer:"
  echo "    pip install Pillow"
  exit 1; }

if [ ! -f assets/fonts/MontserratVar.ttf ]; then
  echo "Fetching Montserrat (variable)…"
  mkdir -p assets/fonts
  curl -sL -o assets/fonts/MontserratVar.ttf \
    "https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/Montserrat%5Bwght%5D.ttf"
fi

if [ ! -f content/posts.json ] || [ content/posts_*.py -nt content/posts.json ]; then
  echo "Compiling the content library…"
  (cd content && python3 build.py)
fi

echo "Rendering images (251 posts, ~10 minutes)…"
(cd render && python3 render.py)

echo "Exporting JPEG copies (what the platforms actually want)…"
python3 tools/to_jpg.py

echo "Zipping…"
rm -f fenora-images.zip
(cd render && zip -q -r ../fenora-images.zip jpg)
echo
echo "✅ $(ls render/out/*.png | wc -l) PNGs  ·  $(ls render/jpg/*.jpg | wc -l) JPEGs"
echo "   render/out/          print-quality masters"
echo "   render/jpg/          upload-ready (22 MB total)"
echo "   fenora-images.zip    the whole set, zipped"
echo
echo "Now:  node server.js   →  http://localhost:4321"
