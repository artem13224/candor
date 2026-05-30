#!/usr/bin/env node
/**
 * blog-watcher.js
 *
 * Drop a new article HTML into blog/ and this script auto-updates blog/index.html.
 * Run once with:  node blog-watcher.js
 *
 * Each article HTML must include these tags in <head>:
 *   <meta name="article:section" content="Your Tag">   ← label shown on the card
 *   <meta name="description" content="Card excerpt.">  ← text shown on the card
 *   "datePublished": "YYYY-MM-DD"                      ← inside the JSON-LD block
 *
 * The newest article (by datePublished) becomes the featured dark card.
 * Everything else becomes a regular card, newest-first.
 */

const fs   = require('fs');
const path = require('path');

const BLOG_DIR = path.join(__dirname, '..', 'blog');
const INDEX    = path.join(BLOG_DIR, 'index.html');
const MONTHS   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function extract(file) {
  const html  = fs.readFileSync(path.join(BLOG_DIR, file), 'utf8');
  const slug  = path.basename(file, '.html');

  const titleM  = html.match(/<title>([^<]+)<\/title>/i);
  const descM   = html.match(/<meta\s+name=["']description["']\s+content="([^"]+)"/i)
               || html.match(/<meta\s+name=["']description["']\s+content='([^']+)'/i);
  const dateM   = html.match(/"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})"/);
  const tagM    = html.match(/<meta\s+name=["']article:section["']\s+content="([^"]+)"/i)
               || html.match(/<meta\s+name=["']article:section["']\s+content='([^']+)'/i);

  const title      = titleM ? titleM[1].replace(/\s*\|\s*Candor\s*$/i, '').trim() : slug;
  const excerpt    = descM  ? descM[1].trim()  : '';
  const tag        = tagM   ? tagM[1].trim()   : '';
  const dateRaw    = dateM  ? dateM[1]         : null;
  const dateSort   = dateRaw ? new Date(dateRaw) : new Date(0);
  const [yr, mo]   = dateRaw ? dateRaw.split('-') : [];
  const dateLabel  = dateRaw ? `${MONTHS[parseInt(mo, 10) - 1]} ${yr}` : 'Coming soon';

  return { slug, href: `/blog/${slug}`, title, excerpt, tag, dateSort, dateLabel };
}

function buildFeatured(p) {
  return `    <a href="${p.href}" class="article-card featured" data-tag="${p.tag}" data-date="${p.dateSort.toISOString().slice(0,10)}">
      <div class="featured-left">
        <span class="card-tag">${p.tag}</span>
        <h2 class="card-title">${p.title}</h2>
      </div>
      <div class="featured-right">
        <p class="card-excerpt">${p.excerpt}</p>
        <div class="card-meta">
          <span class="card-date">${p.dateLabel}</span>
          <span class="card-arrow">&#8594;</span>
        </div>
      </div>
    </a>`;
}

function buildCard(p) {
  return `    <a href="${p.href}" class="article-card" data-tag="${p.tag}" data-date="${p.dateSort.toISOString().slice(0,10)}">
      <span class="card-tag">${p.tag}</span>
      <h2 class="card-title">${p.title}</h2>
      <p class="card-excerpt">${p.excerpt}</p>
      <div class="card-meta">
        <span class="card-date">${p.dateLabel}</span>
        <span class="card-arrow">&#8594;</span>
      </div>
    </a>`;
}

function rebuild() {
  const posts = fs.readdirSync(BLOG_DIR)
    .filter(f => f.endsWith('.html') && f !== 'index.html')
    .map(extract)
    .sort((a, b) => b.dateSort - a.dateSort);

  if (!posts.length) return;

  const [top, ...rest] = posts;
  const inner   = [buildFeatured(top), ...rest.map(buildCard)].join('\n\n');
  const section = `  <section class="articles">\n\n${inner}\n\n  </section>`;

  let idx = fs.readFileSync(INDEX, 'utf8');
  idx = idx.replace(/<section class="articles">[\s\S]*?<\/section>/, section);
  fs.writeFileSync(INDEX, idx, 'utf8');

  console.log(`[blog-watcher] Rebuilt index.html — featured: ${top.slug}`);
}

// Build immediately on start so the index is always in sync
rebuild();

console.log('[blog-watcher] Watching blog/ for new articles. Press Ctrl+C to stop.');

let debounce = null;
fs.watch(BLOG_DIR, (event, filename) => {
  if (!filename || !filename.endsWith('.html') || filename === 'index.html') return;
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    const full = path.join(BLOG_DIR, filename);
    const verb = fs.existsSync(full) ? 'Added' : 'Removed';
    console.log(`[blog-watcher] ${verb}: ${filename}`);
    rebuild();
  }, 600);
});
