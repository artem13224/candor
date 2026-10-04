#!/usr/bin/env node
/**
 * blog-watcher.js — keeps blog/index.html and sitemap.xml in sync with blog/*.html.
 *
 *   npm run watch                      # rebuild now, then watch blog/ for changes
 *   node scripts/blog-watcher.js --once  # rebuild once and exit (same as `npm run rebuild`)
 *
 * All metadata extraction and card markup live in scripts/lib/blog.js.
 * The newest post (by JSON-LD datePublished) becomes the featured card.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const lib  = require('./lib/blog');

const ONCE = process.argv.includes('--once');

function rebuild(reason) {
  try {
    const idx = lib.rebuildIndex();
    const sm  = lib.rebuildSitemap();
    console.log(`[blog-watcher] ${reason}: index ${idx.changed ? 'rebuilt' : 'unchanged'} (${idx.count} posts, featured: ${idx.featured}); sitemap ${sm.changed ? 'rebuilt' : 'unchanged'}`);
  } catch (e) {
    console.error(`[blog-watcher] rebuild failed: ${e.message}`);
    if (ONCE) process.exit(1);
  }
}

function lint(file) {
  if (!fs.existsSync(file)) return;
  const problems = lib.validatePost(file);
  if (!problems.length) return;
  console.log(`[blog-watcher] ${path.basename(file)} has ${problems.length} validation problem${problems.length === 1 ? '' : 's'}:`);
  problems.forEach(p => console.log(`    - ${p}`));
}

rebuild('startup');
if (ONCE) process.exit(0);

console.log('[blog-watcher] Watching blog/ for changes. Press Ctrl+C to stop.');

let debounce = null;
fs.watch(lib.BLOG_DIR, (event, filename) => {
  if (!filename || !filename.endsWith('.html') || filename === 'index.html') return;
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    const full = path.join(lib.BLOG_DIR, filename);
    const verb = fs.existsSync(full) ? 'Changed' : 'Removed';
    rebuild(`${verb} ${filename}`);
    lint(full);
  }, 600);
});
