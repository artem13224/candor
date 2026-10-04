#!/usr/bin/env node
/**
 * rebuild.js — regenerate blog/index.html cards and the blog block of sitemap.xml
 * from the posts currently in blog/. Safe to run any time.
 *
 *   npm run rebuild        (alias for: node scripts/rebuild.js)
 *   node scripts/rebuild.js --dry-run
 */

'use strict';

const lib = require('./lib/blog');
const dryRun = process.argv.includes('--dry-run');

const heroes = lib.applyHeroImages({ dryRun });
heroes.forEach(h => console.log(`${dryRun ? '[dry-run] would add' : '✓ added'} hero ${h.url} (${h.width}×${h.height}) to blog/${h.file}`));
const idx = lib.rebuildIndex({ dryRun });
const sm  = lib.rebuildSitemap({ dryRun });
const verb = s => dryRun ? (s ? 'would change' : 'up to date') : (s ? 'rebuilt' : 'unchanged');
console.log(`blog/index.html: ${verb(idx.changed)} — ${idx.count} posts, featured: ${idx.featured}`);
console.log(`sitemap.xml:     ${verb(sm.changed)} — ${sm.count} blog URLs`);
