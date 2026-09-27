# tools/

Helper scripts. Run them from the repo root.

- **`to_jpg.py`** — converts every PNG master in `render/png/` to an
  upload-ready JPEG in `public/media/` (quality 92, 4:4:4 chroma, progressive).
  116 MB of PNG becomes ~18 MB of JPEG with no visible loss on text. Skips
  files that already exist; `python3 tools/to_jpg.py --force` re-encodes
  everything. These JPEGs are committed, because Instagram can only publish from
  a public URL and this is that URL.

- **`build_site_data.py`** — compiles `content/posts.json` plus the files in
  `public/media/` into `data/posts.json`: 251 posts with their hook, their three
  platform captions and the image that belongs to each. Run it after editing the
  library or re-rendering.

- **`selftest.mjs`** — end-to-end test of the publishing code:
  `node tools/selftest.mjs`. Starts a mock Graph API and a mock LinkedIn API,
  boots the desk against them, connects both accounts, publishes a post to all
  three platforms, checks that pressing the buttons again posts nothing twice,
  checks the expired-token error path, and prints exactly what each provider
  received. Nothing leaves your machine and no credentials are needed.
  Starts its own dev server on port 3222 with its own build directory, so it can
  run while the desk is open.
