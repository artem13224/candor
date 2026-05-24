#!/usr/bin/env node
/**
 * publish.js — Candor blog post publisher
 * Usage:  node publish.js path/to/new-post.html
 *         node publish.js path/to/new-post.html --dry-run
 */

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── Config ────────────────────────────────────────────────────────────────────
const REPO_ROOT   = path.resolve(__dirname);
const BLOG_DIR    = path.join(REPO_ROOT, 'blog');
const INDEX_FILE  = path.join(BLOG_DIR, 'index.html');
const SITEMAP     = path.join(REPO_ROOT, 'sitemap.xml');
const SITE_ORIGIN = 'https://candorcertified.com';

// ── Args ──────────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const INPUT   = args.find(a => !a.startsWith('--'));

if (!INPUT) {
  console.error('Usage: node publish.js path/to/post.html [--dry-run]');
  process.exit(1);
}

const srcPath = path.resolve(INPUT);
if (!fs.existsSync(srcPath)) {
  console.error(`File not found: ${srcPath}`);
  process.exit(1);
}

// ── Parse the post HTML ───────────────────────────────────────────────────────
const html = fs.readFileSync(srcPath, 'utf8');

function extract(pattern, fallback = '') {
  const m = html.match(pattern);
  return m ? m[1].trim() : fallback;
}

const slug     = path.basename(srcPath, '.html');
const title    = extract(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
                   .replace(/<[^>]+>/g, '')
                   .replace(/\.$/, '').trim();
const category = extract(/<span class="article-tag">([\s\S]*?)<\/span>/i);
const lede     = extract(/<p class="article-lede">([\s\S]*?)<\/p>/i)
                   .replace(/<[^>]+>/g, '').trim();
const dateStr  = extract(/<span>([A-Z][a-z]+ \d{4})<\/span>/);
const today    = new Date().toISOString().split('T')[0];

if (!title)    { console.error('Could not parse <h1> from post.'); process.exit(1); }
if (!category) { console.error('Could not parse article-tag from post.'); process.exit(1); }

const excerpt = lede.length > 120 ? lede.slice(0, 117) + '...' : lede;

console.log('\n── Parsed post ─────────────────────────────────');
console.log(`  Slug:     ${slug}`);
console.log(`  Title:    ${title}`);
console.log(`  Category: ${category}`);
console.log(`  Date:     ${dateStr || today}`);
console.log(`  Excerpt:  ${excerpt}`);
console.log('────────────────────────────────────────────────\n');

// ── 1. Copy HTML to /blog ─────────────────────────────────────────────────────
const destPath = path.join(BLOG_DIR, `${slug}.html`);

if (destPath === srcPath) {
  console.log('✓ Post already in /blog — skipping copy');
} else if (DRY_RUN) {
  console.log(`[dry-run] Would copy → ${destPath}`);
} else {
  fs.copyFileSync(srcPath, destPath);
  console.log(`✓ Copied post → blog/${slug}.html`);
}

// ── 2. Update blog/index.html ─────────────────────────────────────────────────
const newCard = `
    <a href="/blog/${slug}" class="article-card">
      <span class="card-tag">${category}</span>
      <h2 class="card-title">${title}</h2>
      <p class="card-excerpt">${excerpt}</p>
      <div class="card-meta">
        <span class="card-date">${dateStr || today}</span>
        <span class="card-arrow">&#8594;</span>
      </div>
    </a>`;

if (!fs.existsSync(INDEX_FILE)) {
  console.warn('⚠ blog/index.html not found — skipping index update');
} else {
  const indexHtml = fs.readFileSync(INDEX_FILE, 'utf8');

  if (indexHtml.includes(`href="/blog/${slug}"`)) {
    console.log('⚠ Card already exists in index — skipping');
  } else {
    // Find the closing </section> that sits just before <footer>
    // That's the cards section — inject the new card right before it closes
    const footerIdx = indexHtml.indexOf('<footer>');
    const sectionCloseIdx = indexHtml.lastIndexOf('</section>', footerIdx);

    if (sectionCloseIdx === -1) {
      console.warn('⚠ Could not find cards section in index.html — skipping index update');
    } else {
      const updated =
        indexHtml.slice(0, sectionCloseIdx) +
        newCard + '\n\n  ' +
        indexHtml.slice(sectionCloseIdx);

      if (DRY_RUN) {
        console.log('[dry-run] Would inject card into blog/index.html before </section>');
      } else {
        fs.writeFileSync(INDEX_FILE, updated, 'utf8');
        console.log('✓ Injected card into blog/index.html');
      }
    }
  }
}

// ── 3. Update sitemap.xml ─────────────────────────────────────────────────────
const newUrl = `
  <url>
    <loc>${SITE_ORIGIN}/blog/${slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;

if (!fs.existsSync(SITEMAP)) {
  console.warn('⚠ sitemap.xml not found — skipping sitemap update');
} else {
  const sitemap = fs.readFileSync(SITEMAP, 'utf8');

  if (sitemap.includes(`/blog/${slug}`)) {
    console.log('⚠ URL already in sitemap — skipping');
  } else {
    const updated = sitemap.replace('</urlset>', newUrl + '\n</urlset>');
    if (DRY_RUN) {
      console.log('[dry-run] Would add entry to sitemap.xml');
    } else {
      fs.writeFileSync(SITEMAP, updated, 'utf8');
      console.log('✓ Added entry to sitemap.xml');
    }
  }
}

// ── 4. Git commit & push ──────────────────────────────────────────────────────
if (DRY_RUN) {
  console.log('\n[dry-run] Would run:');
  console.log(`  git add blog/${slug}.html blog/index.html sitemap.xml`);
  console.log(`  git commit -m "blog: publish ${slug}"`);
  console.log('  git push');
  console.log('\nDry run complete — nothing was changed.\n');
} else {
  console.log('\nCommitting and pushing...');
  try {
    execSync(`git -C "${REPO_ROOT}" add "blog/${slug}.html" "blog/index.html" "sitemap.xml"`, { stdio: 'inherit' });
    execSync(`git -C "${REPO_ROOT}" commit -m "blog: publish ${slug}"`, { stdio: 'inherit' });
    execSync(`git -C "${REPO_ROOT}" push`, { stdio: 'inherit' });
    console.log(`\n✓ Done. Live at: ${SITE_ORIGIN}/blog/${slug}\n`);
  } catch (e) {
    console.error('\n✗ Git step failed. Files were updated locally — commit manually if needed.');
    process.exit(1);
  }
}
