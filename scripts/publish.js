#!/usr/bin/env node
/**
 * publish.js — Candor blog post publisher (single pipeline).
 *
 *   node scripts/publish.js path/to/post.html [--dry-run] [--no-git] [--force]
 *
 * Steps:
 *   1. copy the post into blog/ (if it isn't already there)
 *   2. node scripts/sync-shared.js blog/<slug>.html   (consent banner, footer links)
 *   3. validate the post  → exit 1 with the problem list unless --force
 *   4. rebuild blog/index.html cards and the blog block of sitemap.xml
 *   5. git add / commit "blog: publish <slug>" / push     (skipped by --no-git)
 *
 *   --dry-run  prints what would happen (validates a synced temp copy), writes nothing
 *   --no-git   writes files but skips git
 *   --force    publish even if validation reports problems
 */

'use strict';

const fs   = require('fs');
const os   = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const lib  = require('./lib/blog');

const { REPO_ROOT, BLOG_DIR, SITE_ORIGIN } = lib;
const SYNC_SCRIPT = path.join(__dirname, 'sync-shared.js');

// ── Args ──────────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const NO_GIT  = args.includes('--no-git');
const FORCE   = args.includes('--force');
const INPUT   = args.find(a => !a.startsWith('--'));

function usage(code) {
  console.error('Usage: node scripts/publish.js path/to/post.html [--dry-run] [--no-git] [--force]');
  process.exit(code);
}
if (!INPUT) usage(1);

const srcPath = path.resolve(INPUT);
if (!fs.existsSync(srcPath) || !srcPath.endsWith('.html')) {
  console.error(`✗ Not an .html file: ${srcPath}`);
  process.exit(1);
}
const slug     = path.basename(srcPath, '.html');
const destPath = path.join(BLOG_DIR, `${slug}.html`);
const inBlog   = path.resolve(srcPath) === destPath;
const rel      = p => path.relative(REPO_ROOT, p) || '.';
const tag      = DRY_RUN ? '[dry-run]' : '✓';

if (slug === 'index' || slug !== lib.slugify(slug, 200)) {
  console.error(`✗ "${slug}" is not a valid post slug (lowercase letters, digits and hyphens only).`);
  process.exit(1);
}

function run(cmd, cmdArgs, opts = {}) {
  return execFileSync(cmd, cmdArgs, { cwd: REPO_ROOT, stdio: 'inherit', ...opts });
}

function syncShared(file, quiet = false) {
  run(process.execPath, [SYNC_SCRIPT, file], quiet ? { stdio: 'pipe' } : {});
}

function report(problems) {
  if (!problems.length) { console.log(`${tag} Validation passed`); return true; }
  console.log(`${FORCE ? '⚠' : '✗'} Validation found ${problems.length} problem${problems.length === 1 ? '' : 's'}:`);
  problems.forEach(p => console.log(`    - ${p}`));
  return false;
}

console.log(`\n── publish ${slug} ${DRY_RUN ? '(dry run)' : ''}──────────────────────────`);
console.log(`  source: ${rel(srcPath)}`);
console.log(`  target: ${rel(destPath)}\n`);

// ── Dry run ───────────────────────────────────────────────────────────────────
if (DRY_RUN) {
  console.log(inBlog ? '[dry-run] Post already in blog/ — no copy needed'
                     : `[dry-run] Would copy → ${rel(destPath)}`);

  // Validate a synced temp copy so the result matches what publish would produce.
  const tmpDir  = fs.mkdtempSync(path.join(os.tmpdir(), 'candor-publish-'));
  const tmpFile = path.join(tmpDir, `${slug}.html`);
  fs.copyFileSync(srcPath, tmpFile);
  let problems;
  try {
    console.log(`[dry-run] Would run: node scripts/sync-shared.js ${rel(destPath)}`);
    syncShared(tmpFile, true);
    problems = lib.validatePost(tmpFile);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  const ok = report(problems);

  const meta = lib.extractPost(srcPath);
  console.log('\n  Parsed metadata');
  console.log(`    title:    ${meta.title}`);
  console.log(`    tag:      ${meta.tag}`);
  console.log(`    date:     ${meta.date} (${meta.dateLabel})`);
  console.log(`    excerpt:  ${meta.excerpt}`);
  console.log(`    og:image: ${meta.ogImage}\n`);

  const idx = lib.rebuildIndex({ dryRun: true });
  const sm  = lib.rebuildSitemap({ dryRun: true });
  const relDry = lib.rebuildRelated({ dryRun: true });
  console.log(`[dry-run] related posts:   ${relDry.changed.length ? `would update ${relDry.changed.join(', ')}` : 'up to date'}`);
  console.log(`[dry-run] blog/index.html: ${idx.changed ? 'would change' : 'already up to date'} (${idx.count} posts${inBlog ? '' : ' + this one once copied'}; featured: ${idx.featured})`);
  console.log(`[dry-run] sitemap.xml:     ${sm.changed ? 'would change' : 'already up to date'}`);
  console.log(NO_GIT ? '[dry-run] --no-git: would skip git'
                     : `[dry-run] Would run:\n    git add blog/${slug}.html <posts with new suggestions> blog/index.html sitemap.xml <post images>\n    git commit -m "blog: publish ${slug}"\n    git push`);
  console.log(`\nDry run complete — nothing was written.${ok || FORCE ? '' : ' Fix the problems above before publishing.'}\n`);
  process.exit(ok || FORCE ? 0 : 1);
}

// ── 1. Copy into blog/ ────────────────────────────────────────────────────────
let copied = false;
if (inBlog) {
  console.log('✓ Post already in blog/ — skipping copy');
} else {
  if (fs.existsSync(destPath) && !FORCE) {
    console.error(`✗ ${rel(destPath)} already exists. Edit that file directly, or pass --force to overwrite it.`);
    process.exit(1);
  }
  fs.copyFileSync(srcPath, destPath);
  copied = true;
  console.log(`✓ Copied → ${rel(destPath)}`);
}

// ── 2. Site-wide shared blocks ────────────────────────────────────────────────
console.log(`→ node scripts/sync-shared.js ${rel(destPath)}`);
syncShared(destPath);

// ── 2b. Hero image, if blog/images/<slug>.* exists ────────────────────────────
const hero = lib.applyHeroImage(destPath);
if (hero.changed) console.log(`✓ Added hero image ${hero.url} (${hero.width}×${hero.height})`);

// ── 3. Validate ───────────────────────────────────────────────────────────────
const problems = lib.validatePost(destPath);
if (!report(problems) && !FORCE) {
  if (copied) {
    fs.unlinkSync(destPath);
    console.log(`  Removed the copy at ${rel(destPath)}; your source file is untouched.`);
  }
  console.log('  Fix the problems and run again, or pass --force to publish anyway.\n');
  process.exit(1);
}

// ── 4. Rebuild index + sitemap ────────────────────────────────────────────────
const related = lib.rebuildRelated();
const idx = lib.rebuildIndex();
const sm  = lib.rebuildSitemap();
console.log(`✓ related posts ${related.changed.length ? `updated in ${related.changed.length} post(s)` : 'unchanged'}`);
console.log(`✓ blog/index.html ${idx.changed ? 'rebuilt' : 'unchanged'} — ${idx.count} posts, featured: ${idx.featured}`);
console.log(`✓ sitemap.xml ${sm.changed ? 'rebuilt' : 'unchanged'} — ${sm.count} blog URLs`);

// ── 5. Git ────────────────────────────────────────────────────────────────────
if (NO_GIT) {
  console.log('\n--no-git: files written, skipping git. Review with `git status`, then commit when ready.\n');
  process.exit(0);
}

const html   = fs.readFileSync(destPath, 'utf8');
const images = lib.bodyImgTags(html)
  .map(t => lib.attr(t, 'src'))
  .filter(Boolean)
  .filter(src => !/^https?:\/\//i.test(src))
  .map(src => src.startsWith('/') ? path.join(REPO_ROOT, src) : path.join(BLOG_DIR, src.replace(/^\.\//, '')))
  .filter(p => fs.existsSync(p))
  .map(rel);

const relatedFiles = related.changed.map(f => rel(path.join(BLOG_DIR, f)));
const toAdd = [...new Set([rel(destPath), ...relatedFiles, rel(lib.INDEX_FILE), rel(lib.SITEMAP_FILE), ...images])];
console.log('\nCommitting and pushing...');
try {
  run('git', ['add', '--', ...toAdd]);
  run('git', ['commit', '-m', `blog: publish ${slug}`]);
  run('git', ['push']);
  console.log(`\n✓ Done. Live at: ${SITE_ORIGIN}/blog/${slug}\n`);
} catch (e) {
  console.error('\n✗ Git step failed. Files were written locally — commit manually if needed.');
  process.exit(1);
}
