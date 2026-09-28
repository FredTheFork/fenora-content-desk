#!/usr/bin/env node
/* Prove that app/captions.js reproduces every caption in content/posts.json
 * exactly. Run after touching either file:
 *
 *   node tools/captions_parity.js
 */
const fs = require('fs');
const path = require('path');
const cap = require('../app/captions.js');

const lib = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content', 'posts.json'), 'utf8'));
let ok = 0, bad = 0;

for (const p of lib.posts) {
  const fields = {
    id: p.id, format: p.format, hook: p.hook, body: p.body,
    cta: p.cta || '', cta_fb: p.cta_fb || '', li_lead: p.li_lead || '', tagset: p.tagset,
  };
  const checks = [
    ['caption_ig', cap.buildIG(fields, { tags: true, tagsets: lib.tagsets, discovery: lib.discovery })],
    ['caption_ig_notags', cap.buildIG(fields, { tags: false })],
    ['caption_fb', cap.buildFB(fields)],
    ['caption_li', cap.buildLI(fields)],
  ];
  const plats = String(p.platforms || '').split(',').map(s => s.trim());
  for (const [key, mine] of checks) {
    // build.py only emits captions for the platforms a post targets —
    // everything else is intentionally "".
    const targeted = key === 'caption_ig' || key === 'caption_ig_notags' ? 'IG' : key === 'caption_fb' ? 'FB' : 'LI';
    const want = plats.includes(targeted) ? (p[key] || '') : '';
    const mine2 = plats.includes(targeted) ? mine : '';
    if (want === mine2) { ok++; continue; }
    bad++;
    console.log(`✗ ${p.id} ${key} differs`);
    if (bad <= 3) {
      for (let i = 0; i < Math.max(want.length, mine2.length); i++) {
        if (want[i] !== mine2[i]) {
          console.log(`   first diff at char ${i}`);
          console.log(`   want: ${JSON.stringify(want.slice(Math.max(0, i - 30), i + 30))}`);
          console.log(`   mine: ${JSON.stringify(mine2.slice(Math.max(0, i - 30), i + 30))}`);
          break;
        }
      }
    }
  }
}

console.log(bad ? `\n✗ ${bad} mismatches, ${ok} ok` : `✓ ${ok} captions match byte-for-byte (${lib.posts.length} posts × 4)`);
process.exit(bad ? 1 : 0);
