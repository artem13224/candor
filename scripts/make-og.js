#!/usr/bin/env node
/**
 * make-og.js — render branded share images (Open Graph / LinkedIn / Twitter)
 * from scripts/templates/og.html, so every post gets a card with its own title
 * instead of the generic site image.
 *
 *   npm run og -- blog/some-post.html      one post  → blog/images/og/some-post.jpg  (+ updates its og:image)
 *   npm run og -- --all                    every post
 *   npm run og -- --site                   images/heroes/webshare.jpg (home / assessment / legal pages)
 *   npm run og -- --all --dry-run          render to /tmp only, change nothing in the repo
 *
 * If images/heroes/og-bg.webp exists it is used as the card background
 * (drop one in images/_inbox/og-bg.png and run `npm run images`).
 *
 * Needs the optional dev dependency `playwright` (npm install) and a Chromium:
 *   npx playwright install chromium
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const lib  = require('./lib/blog');

const ROOT     = lib.REPO_ROOT;
const TEMPLATE = path.join(__dirname, 'templates', 'og.html');
const OUT_DIR  = path.join(lib.BLOG_DIR, 'images', 'og');
const BG_FILE  = path.join(ROOT, 'images', 'heroes', 'og-bg.webp');
const SITE_OUT = path.join(ROOT, 'images', 'heroes', 'webshare.jpg');

const args   = process.argv.slice(2);
const ALL    = args.includes('--all');
const SITE   = args.includes('--site');
const DRY    = args.includes('--dry-run');
const files  = args.filter(a => !a.startsWith('--')).map(f => path.resolve(f));

let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  console.error('✗ make-og needs `playwright`. Run:  npm install && npx playwright install chromium');
  process.exit(1);
}

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

/** Emphasise the last two words in green, the way the site's headings do. */
function titleHtml(title) {
  const clean = title.replace(/\.$/, '');
  const words = clean.split(' ');
  if (words.length < 4) return esc(clean);
  const head = words.slice(0, -2).join(' '), tail = words.slice(-2).join(' ');
  return `${esc(head)} <em>${esc(tail)}</em>`;
}

function titleSize(title) {
  const n = title.length;
  if (n <= 40) return 76;
  if (n <= 60) return 64;
  if (n <= 80) return 56;
  return 48;
}

function fill(vars) {
  let html = fs.readFileSync(TEMPLATE, 'utf8');
  for (const [k, v] of Object.entries(vars)) html = html.split(`{{${k}}}`).join(v);
  return html;
}

async function render(page, vars, outFile) {
  const html = fill(vars);
  const tmp = path.join(os.tmpdir(), `candor-og-${process.pid}.html`);
  fs.writeFileSync(tmp, html);
  await page.goto('file://' + tmp, { waitUntil: 'load' });
  try { await page.evaluate(() => document.fonts.ready); } catch (e) {}
  await page.waitForTimeout(250);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  await page.screenshot({ path: outFile, type: 'jpeg', quality: 86, clip: { x: 0, y: 0, width: 1200, height: 630 } });
  fs.unlinkSync(tmp);
}

function setOgImage(postFile, url) {
  let html = fs.readFileSync(postFile, 'utf8');
  const before = html;
  html = html.replace(/(<meta\s+property="og:image"\s+content=")[^"]*(")/i, `$1${url}$2`);
  html = html.replace(/(<meta\s+name="twitter:image"\s+content=")[^"]*(")/i, `$1${url}$2`);
  if (html !== before) fs.writeFileSync(postFile, html, 'utf8');
  return html !== before;
}

(async () => {
  const targets = ALL ? lib.postFiles().map(f => path.isAbsolute(f) ? f : path.join(lib.BLOG_DIR, f)) : files;
  if (!targets.length && !SITE) {
    console.log('Usage: node scripts/make-og.js <post.html>... | --all | --site  [--dry-run]');
    process.exit(1);
  }
  const bgSrc = fs.existsSync(BG_FILE) ? 'file://' + BG_FILE : '';
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const outRoot = DRY ? fs.mkdtempSync(path.join(os.tmpdir(), 'candor-og-')) : null;

  if (SITE) {
    const out = DRY ? path.join(outRoot, 'webshare.jpg') : SITE_OUT;
    await render(page, {
      TITLE: 'Candor', TITLE_HTML: 'Flat-fee B Corp certification consulting for <em>small businesses.</em>', TITLE_SIZE: 60,
      TAG: 'Vancouver, BC · Canada-wide', PATH: '', DATE: 'B Corp · Climate Neutral · 1% for the Planet', BG_SRC: bgSrc,
    }, out);
    console.log(`✓ site share image → ${path.relative(ROOT, out)}`);
  }

  for (const file of targets) {
    if (!fs.existsSync(file)) { console.error(`✗ not found: ${file}`); continue; }
    const p = lib.extractPost(file);
    const out = DRY ? path.join(outRoot, `${p.slug}.jpg`) : path.join(OUT_DIR, `${p.slug}.jpg`);
    await render(page, {
      TITLE: p.title, TITLE_HTML: titleHtml(p.title), TITLE_SIZE: titleSize(p.title),
      TAG: esc(p.tag || 'Resources'), PATH: esc(`/blog/${p.slug}`), DATE: esc(p.dateLabel || ''), BG_SRC: bgSrc,
    }, out);
    const url = `${lib.SITE_ORIGIN}/blog/images/og/${p.slug}.jpg`;
    const updated = DRY ? false : setOgImage(file, url);
    console.log(`✓ ${p.slug} → ${path.relative(ROOT, out)}${updated ? '  (og:image updated)' : ''}`);
  }

  await browser.close();
  if (DRY) console.log(`\nDry run — files written to ${outRoot}, repo untouched.`);
})().catch(e => { console.error(e); process.exit(1); });
