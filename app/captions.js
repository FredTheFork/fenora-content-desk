/* Fenora Content Desk — the house caption engine.
 *
 * This is a byte-for-byte port of the builders in `content/build.py`:
 * the same banner, the same LinkedIn lead handling, the same slide
 * flattening, the same deterministic hashtag rotation.
 *
 * `node tools/captions_parity.js` diffs this against every caption stored in
 * content/posts.json. If the two ever drift, that test fails.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FenoraCaptions = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var BANNER = '\u{1FA9F}  fenora.pro  —  one record for the whole window job';
  var LI_SIGN = '\n\n— fenora.pro';

  function norm(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 60);
  }

  /* Drop a body opening line that just restates the lead. */
  function dedup(lead, body) {
    var lines = String(body || '').split('\n');
    while (lines.length && !lines[0].trim()) lines.shift();
    if (!lines.length) return String(body || '');
    var a = norm(lead), b = norm(lines[0]);
    if (a && b && (a.indexOf(b) === 0 || b.indexOf(a) === 0 || a === b)) lines.shift();
    return lines.join('\n').trim();
  }

  /* LinkedIn has no "Slide 1:" — turn carousel copy into a clean numbered list. */
  function flattenSlides(body) {
    var n = 0;
    return String(body || '').split('\n').map(function (line) {
      var m = line.match(/^\s*Slide\s*(\d+)\s*[:.—-]\s*(.+)$/);
      if (m) { n += 1; return n + '. ' + m[2].trim(); }
      return line;
    }).join('\n').trim();
  }

  /* Hashtag block: the pillar's tagset + a deterministic slice of the
     discovery tags, rotated by the post number so 251 posts don't all
     end in the same 14 tags. */
  function buildTags(p, tagsets, discovery) {
    var set = (tagsets && (tagsets[p.tagset] || tagsets.core)) || [];
    var tags = set.map(function (t) { return '#' + t; });
    var n = 0;
    var m = String(p.id || '').match(/(\d+)$/);
    if (m) n = parseInt(m[1], 10);
    var L = (discovery || []).length || 1;
    var k = n % L;
    var rot = (discovery || []).slice(k).concat((discovery || []).slice(0, k));
    return tags.concat(rot.slice(0, 14).map(function (t) { return '#' + t; }));
  }

  function buildIG(p, opts) {
    opts = opts || {};
    var parts = [p.hook, '', p.body];
    if (p.cta) parts.push('', p.cta);
    parts.push('', BANNER);
    var out = parts.join('\n');
    if (opts.tags !== false) {
      out += '\n\n' + buildTags(p, opts.tagsets, opts.discovery).join(' ');
    }
    return out;
  }

  function buildFB(p) {
    var parts = [p.hook, '', p.body];
    if (p.cta_fb || p.cta) parts.push('', p.cta_fb || p.cta);
    parts.push('', BANNER);
    return parts.join('\n');
  }

  function buildLI(p) {
    var lead = p.li_lead || p.hook;
    var body = dedup(lead, p.body);
    if (p.format === 'carousel') body = flattenSlides(body);
    var parts = body.trim() ? [lead, '', body] : [lead];
    if (p.cta) parts.push('', p.cta);
    parts.push(LI_SIGN);
    return parts.join('\n');
  }

  /* Build all three from one record:
     { id, format, hook, body, cta, cta_fb, li_lead, tagset } */
  function buildAll(p, lib) {
    lib = lib || {};
    return {
      IG: buildIG(p, { tags: true, tagsets: lib.tagsets, discovery: lib.discovery }),
      FB: buildFB(p),
      LI: buildLI(p),
    };
  }

  return {
    BANNER: BANNER,
    LI_SIGN: LI_SIGN,
    dedup: dedup,
    flattenSlides: flattenSlides,
    buildTags: buildTags,
    buildIG: buildIG,
    buildFB: buildFB,
    buildLI: buildLI,
    buildAll: buildAll,
  };
});
