#!/usr/bin/env node
/**
 * validate-post.js — check blog posts against the Candor post contract.
 *
 *   node scripts/validate-post.js                 # every post in blog/
 *   node scripts/validate-post.js blog/foo.html   # one or more files
 *   npm run validate
 *
 * Exits 1 if any file has problems. The rules live in validatePost() in scripts/lib/blog.js.
 */

'use strict';

const path = require('path');
const lib  = require('./lib/blog');

const files = process.argv.slice(2).filter(a => !a.startsWith('--'));
const targets = files.length ? files.map(f => path.resolve(f)) : lib.postFiles();

if (!targets.length) { console.log('No posts found in blog/.'); process.exit(0); }

let failed = 0;
for (const file of targets) {
  const problems = lib.validatePost(file);
  const name = path.relative(lib.REPO_ROOT, file);
  if (!problems.length) { console.log(`✓ ${name}`); continue; }
  failed++;
  console.log(`✗ ${name} — ${problems.length} problem${problems.length === 1 ? '' : 's'}`);
  problems.forEach(p => console.log(`    - ${p}`));
}

console.log(failed ? `\n${failed} of ${targets.length} file(s) need fixes.` : `\nAll ${targets.length} post(s) valid.`);
process.exit(failed ? 1 : 0);
