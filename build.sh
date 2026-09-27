#!/usr/bin/env bash
# Fenora Content Desk — rebuild everything from the written library to the site.
#
#   ./build.sh          content → images → desk data → ready to deploy
#   ./build.sh serve    start the desk on http://localhost:3000
#   ./build.sh check    run the publishing self-test (mock Meta + LinkedIn)
#
# Requires: Node 20+ (the desk), Python 3 + Pillow (the image renderer only).
set -euo pipefail
cd "$(dirname "$0")"

if [ "${1:-}" = "serve" ]; then
  exec npx next dev
fi

if [ "${1:-}" = "check" ]; then
  exec node tools/selftest.mjs
fi

command -v python3 >/dev/null || { echo "Python 3 is required for the image renderer."; exit 1; }
python3 -c "import PIL" 2>/dev/null || {
  echo "Pillow is required for the image renderer:"
  echo "    python3 -m venv .venv && .venv/bin/pip install Pillow"
  echo "…then run this script with .venv/bin/python on your PATH, or install it system-wide."
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

echo "Exporting upload-ready JPEGs to public/media…"
python3 tools/to_jpg.py

echo "Compiling the desk data…"
python3 tools/build_site_data.py

echo
echo "✅ $(ls render/png/*.png | wc -l) PNG masters · $(ls public/media/*.jpg | wc -l) JPEGs in public/media"
echo "   render/png/      print masters (not committed)"
echo "   public/media/    what the desk posts — commit these"
echo "   data/posts.json  what the desk reads"
echo
echo "Now:  npm install && npm run dev    →  http://localhost:3000"
