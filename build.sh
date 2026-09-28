#!/usr/bin/env bash
# Fenora Content Desk — build and serve.
#
#   ./build.sh          compile the content library, then start the dashboard
#   ./build.sh serve    just start the dashboard
#
# Requires: Node 18+. Python 3 is only needed to compile content/posts_*.py
# part files into content/posts.json — skip it entirely if you write your
# posts in the dashboard.
set -euo pipefail
cd "$(dirname "$0")"

if [ "${1:-}" = "serve" ]; then
  echo "Starting Content Desk on http://localhost:4321"
  exec node server.js
fi

if ls content/posts_*.py >/dev/null 2>&1; then
  command -v python3 >/dev/null || { echo "Python 3 is required to compile content/posts_*.py."; exit 1; }
  echo "Compiling the content library…"
  (cd content && python3 build.py)
else
  echo "No content/posts_*.py part files — the library stays empty."
  echo "Write posts in the dashboard, or add a part file and re-run."
fi

echo
exec node server.js
