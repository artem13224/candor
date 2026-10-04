#!/usr/bin/env node
/**
 * new-post.js — scaffold a new blog post from scripts/templates/post.html.
 *
 *   node scripts/new-post.js "Post title" --tag "Process" [--date YYYY-MM-DD]
 *        [--lede "..."] [--description "..."] [--read 6] [--og-image URL]
 *        [--slug custom-slug] [--dry-run] [--force]
 *
 * Writes blog/<slug>.html (slug = kebab-case title, max ~60 chars) with every
 * {{PLACEHOLDER}} filled. --dry-run prints the resolved values and target path
 * without writing anything. --force overwrites an existing file.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const lib  = require('./lib/blog');

const TEMPLATE = path.join(__dirname, 'templates', 'post.html');

// ── Args ──────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const opts = { _: [] };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) {
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) { opts[key] = next; i++; }
    else opts[key] = true;
  } else opts._.push(a);
}

const DRY   = !!(opts['dry-run'] || opts['no-write']);
const title = opts._.join(' ').trim();

function die(msg) {
  console.error(`✗ ${msg}`);
  console.error('\nUsage: node scripts/new-post.js "Post title" --tag "Process" [--date YYYY-MM-DD] [--lede "..."] [--description "..."] [--read 6] [--og-image URL] [--slug custom-slug] [--dry-run] [--force]');
  console.error(`Allowed tags: ${lib.ALLOWED_TAGS.join(', ')}`);
  process.exit(1);
}

if (!title) die('A post title is required.');
if (!opts.tag || opts.tag === true) die('--tag is required.');
if (!lib.ALLOWED_TAGS.includes(opts.tag)) die(`--tag "${opts.tag}" is not allowed. Use one of: ${lib.ALLOWED_TAGS.join(', ')}`);

const today   = new Date().toISOString().slice(0, 10);
const dateIso = opts.date && opts.date !== true ? String(opts.date) : today;
if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso) || isNaN(Date.parse(dateIso))) die(`--date must be YYYY-MM-DD (got "${dateIso}")`);

const slug = opts.slug && opts.slug !== true ? lib.slugify(opts.slug, 80) : lib.slugify(title);
if (!slug) die('Could not derive a slug from the title.');

const readMin = parseInt(opts.read, 10) || 5;
const lede    = opts.lede && opts.lede !== true ? String(opts.lede) : `One or two sentences that frame the problem this post solves for a BC small-business owner.`;
const desc    = opts.description && opts.description !== true ? String(opts.description) : lede;
const ogImage = opts['og-image'] && opts['og-image'] !== true ? lib.absoluteUrl(String(opts['og-image']), slug) : lib.DEFAULT_OG_IMAGE;

// Keep values safe in attributes, text and JSON-LD: curly quotes instead of ", no tags.
const clean = s => String(s).replace(/"/g, '”').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();

const values = {
  TITLE:       clean(title),
  SLUG:        slug,
  TAG:         opts.tag,
  LEDE:        clean(lede),
  DESCRIPTION: clean(desc),
  DATE_ISO:    dateIso,
  DATE_LABEL:  lib.toLongDateLabel(dateIso),
  READ_MIN:    String(readMin),
  OG_IMAGE:    ogImage,
};

const dest = path.join(lib.BLOG_DIR, `${slug}.html`);

console.log(`\n── new post ${DRY ? '(dry run)' : ''}──────────────────────────────`);
Object.entries(values).forEach(([k, v]) => console.log(`  ${k.padEnd(12)} ${v}`));
console.log(`  ${'FILE'.padEnd(12)} ${path.relative(lib.REPO_ROOT, dest)}\n`);

if (!fs.existsSync(TEMPLATE)) die(`Template not found: ${TEMPLATE}`);
if (fs.existsSync(dest) && !opts.force && !DRY) die(`${path.relative(lib.REPO_ROOT, dest)} already exists. Pick another title, pass --slug, or --force to overwrite.`);

let html = fs.readFileSync(TEMPLATE, 'utf8');
html = html.replace(/\{\{([A-Z_]+)\}\}/g, (m, key) => {
  if (!(key in values)) die(`Template uses unknown placeholder {{${key}}}`);
  return values[key];
});

if (DRY) {
  console.log('Dry run — nothing written.');
  process.exit(0);
}

fs.writeFileSync(dest, html, 'utf8');
console.log(`✓ Created ${path.relative(lib.REPO_ROOT, dest)}`);
console.log(`\nNext:\n  1. Write the article inside <article class="article-body"> (see the comments in the file).\n  2. node scripts/validate-post.js ${path.relative(lib.REPO_ROOT, dest)}\n  3. node scripts/publish.js ${path.relative(lib.REPO_ROOT, dest)} --dry-run\n`);
