#!/usr/bin/env node
/**
 * optimize-images.js — turn whatever lands in images/_inbox/ into the exact
 * file the site expects.
 *
 *   npm run images              process every file in images/_inbox/
 *   npm run images -- --list    print every slot, its size, and whether a file exists
 *   npm run images -- --check   exit 1 if any illustration slot is still empty
 *   npm run images -- --keep    keep the originals in the inbox after processing
 *   node scripts/optimize-images.js --slot hero-art ~/Downloads/some-file.png
 *
 * Naming rule: the inbox filename (minus extension) must equal a slot name from
 * scripts/lib/image-slots.js, or  blog-<slug>  for a blog post hero.
 *
 * Needs the optional dev dependency `sharp` (npm install).
 */

const fs   = require('fs');
const path = require('path');
const { SLOTS, BLOG_HERO, findSlot } = require('./lib/image-slots');

const ROOT  = path.resolve(__dirname, '..');
const INBOX = path.join(ROOT, 'images', '_inbox');
const args  = process.argv.slice(2);
const LIST  = args.includes('--list');
const CHECK = args.includes('--check');
const KEEP  = args.includes('--keep');

let sharp;
try { sharp = require('sharp'); }
catch (e) {
  if (!LIST && !CHECK) {
    console.error('✗ The image tool needs `sharp`. Run:  npm install   (it is already listed in package.json)');
    process.exit(1);
  }
}

function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function kb(rel) { try { return Math.round(fs.statSync(path.join(ROOT, rel)).size / 1024) + ' KB'; } catch (e) { return '—'; } }

if (LIST || CHECK) {
  let missing = 0;
  console.log('\nSlot            Size        Format  Present  Dest');
  console.log('──────────────  ──────────  ──────  ───────  ────────────────────────────────');
  for (const s of SLOTS) {
    const has = exists(s.dest);
    if (!has && s.kind === 'illustration') missing++;
    console.log(`${s.name.padEnd(15)} ${(s.width + '×' + s.height).padEnd(11)} ${s.format.padEnd(7)} ${(has ? 'yes ' + kb(s.dest) : 'no').padEnd(8)} ${s.dest}`);
  }
  console.log(`${'blog-<slug>'.padEnd(15)} ${(BLOG_HERO.width + '×' + BLOG_HERO.height).padEnd(11)} ${BLOG_HERO.format.padEnd(7)} ${'per post'.padEnd(8)} blog/images/<slug>.webp`);
  console.log('\nInbox: images/_inbox/  (drop files there, named after the slot)\n');
  if (CHECK && missing) { console.log(`✗ ${missing} illustration slot(s) still empty.`); process.exit(1); }
  process.exit(0);
}

async function processFile(file, slot) {
  const dest = path.join(ROOT, slot.dest);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  let img = sharp(file, { failOn: 'none' }).rotate();
  const meta = await img.metadata();
  img = img.resize(slot.width, slot.height, { fit: 'cover', position: 'attention', withoutEnlargement: false });
  if (slot.format === 'webp')      img = img.webp({ quality: slot.quality, effort: 5 });
  else if (slot.format === 'jpeg') img = img.jpeg({ quality: slot.quality, mozjpeg: true, progressive: true, chromaSubsampling: '4:2:0' });
  else if (slot.format === 'png')  img = img.png({ compressionLevel: 9 });
  await img.toFile(dest);
  const out = fs.statSync(dest).size;
  console.log(`✓ ${path.basename(file)}  ${meta.width}×${meta.height} → ${slot.width}×${slot.height} ${slot.format}  ${Math.round(out / 1024)} KB  → ${slot.dest}`);
  if (slot.kind === 'blog-hero') console.log(`  Run  npm run rebuild  to inject it into blog/${slot.slug}.html and the blog index.`);
  if (slot.kind === 'portrait')  console.log('  Reminder: this slot is for a real photograph only.');
}

(async () => {
  const jobs = [];
  const slotIdx = args.indexOf('--slot');
  if (slotIdx !== -1) {
    const name = args[slotIdx + 1], file = args[slotIdx + 2];
    const slot = findSlot(name);
    if (!slot || !file || !fs.existsSync(file)) { console.error('Usage: --slot <slot-name> <file>'); process.exit(1); }
    jobs.push({ file: path.resolve(file), slot, fromInbox: false });
  } else {
    if (!fs.existsSync(INBOX)) fs.mkdirSync(INBOX, { recursive: true });
    for (const f of fs.readdirSync(INBOX)) {
      if (f.startsWith('.') || !/\.(png|jpe?g|webp|avif|tiff?)$/i.test(f)) continue;
      const stem = f.replace(/\.[^.]+$/, '').toLowerCase().replace(/\s+/g, '-');
      const slot = findSlot(stem);
      if (!slot) { console.log(`⚠ ${f}: no slot called "${stem}". Run --list to see the names.`); continue; }
      jobs.push({ file: path.join(INBOX, f), slot, fromInbox: true });
    }
  }
  if (!jobs.length) { console.log('Nothing to do — images/_inbox/ is empty. Run --list to see the slot names.'); return; }
  let failed = 0;
  for (const j of jobs) {
    try { await processFile(j.file, j.slot); if (j.fromInbox && !KEEP) fs.unlinkSync(j.file); }
    catch (e) { failed++; console.error(`✗ ${path.basename(j.file)}: ${e.message}`); }
  }
  if (failed) process.exit(1);
})();
