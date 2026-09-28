# tools/

Small helper scripts. Nothing here is needed to run the desk.

- `captions_parity.js` — proves that `app/captions.js` (the caption engine the
  dashboard runs in the browser) reproduces every caption stored in
  `content/posts.json` byte for byte. Run it after touching either file:

      node tools/captions_parity.js

  On an empty library it passes trivially. It earns its keep the moment you
  compile posts in bulk from a `content/posts_*.py` part file, because that is
  when the Python builders in `content/build.py` and the JavaScript ones can
  quietly drift apart.
