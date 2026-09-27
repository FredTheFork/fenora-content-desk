# tools/

Small helper scripts used by `build.sh`.

- `to_jpg.py` — converts every PNG in `render/out/` to a print-ready-for-social
  JPEG in `render/jpg/` (quality 92, 4:4:4 chroma, progressive). Cuts the
  283-image set from ~116 MB to ~22 MB with no visible loss on text.
  Safe to re-run; it skips files that already exist.
