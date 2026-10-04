'use strict';
/**
 * scripts/lib/blog.js — single source of truth for the Candor blog pipeline.
 *
 * Used by: publish.js, blog-watcher.js, validate-post.js, new-post.js.
 *
 *   extractPost(filePath)  → { slug, href, title, excerpt, tag, date, dateModified,
 *                              dateLabel, ogImage, readMinutes, canonical, h1 }
 *   validatePost(filePath) → [ 'human readable problem', ... ]   (empty = valid)
 *   listPosts()            → extractPost() for every blog/*.html except index.html,
 *                            newest first
 *   rebuildIndex(opts)     → regenerates <section class="articles"> in blog/index.html
 *   rebuildSitemap(opts)   → regenerates the blog <url> blocks in sitemap.xml between
 *                            <!-- Individual Articles --> and <!-- Tools -->
 *
 * Metadata is read from <head> first (title, meta description, meta article:section,
 * JSON-LD datePublished / dateModified) and falls back to the visible article header
 * (<h1>, .article-tag, .article-lede, <time datetime>) when head data is missing.
 */

const fs   = require('fs');
const path = require('path');

const REPO_ROOT    = path.resolve(__dirname, '..', '..');
const BLOG_DIR     = path.join(REPO_ROOT, 'blog');
const INDEX_FILE   = path.join(BLOG_DIR, 'index.html');
const SITEMAP_FILE = path.join(REPO_ROOT, 'sitemap.xml');
const SITE_ORIGIN  = 'https://candorcertified.com';
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/images/heroes/webshare.jpg`;

const ALLOWED_TAGS = ['B Corp Basics', 'Process', 'Certifications'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_LONG  = ['January','February','March','April','May','June','July','August',
                      'September','October','November','December'];

const SITEMAP_START = '<!-- Individual Articles -->';
const SITEMAP_END   = '<!-- Tools -->';

// ── Small helpers ─────────────────────────────────────────────────────────────

/** HTML with <!-- comments --> removed — commented-out examples must not count as content. */
function stripComments(s) {
  return String(s || '').replace(/<!--[\s\S]*?-->/g, '');
}

function stripTags(s) {
  return String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function decodeEntities(s) {
  return String(s || '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&(?![a-zA-Z#0-9]+;)/g, '&amp;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Value of <meta name|property="key" content="..."> regardless of attribute order/quotes. */
function metaContent(html, key) {
  const re = new RegExp(
    `<meta\\s+[^>]*?(?:name|property)=["']${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`, 'i');
  const tag = html.match(re);
  if (!tag) return null;
  const c = tag[0].match(/content=(?:"([^"]*)"|'([^']*)')/i);
  return c ? decodeEntities(c[1] !== undefined ? c[1] : c[2]).trim() : null;
}

function canonicalHref(html) {
  const tag = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*>/i);
  if (!tag) return null;
  const h = tag[0].match(/href=(?:"([^"]+)"|'([^']+)')/i);
  return h ? (h[1] !== undefined ? h[1] : h[2]).trim() : null;
}

/** Collect every JSON-LD block; tolerate ones that fail to parse. */
function jsonLdBlocks(html) {
  const out = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try { out.push(JSON.parse(m[1])); } catch (e) { /* ignore malformed */ }
  }
  return out;
}

function jsonLdDate(html, key) {
  for (const block of jsonLdBlocks(html)) {
    const nodes = Array.isArray(block) ? block : (block['@graph'] || [block]);
    for (const n of nodes) {
      if (n && typeof n[key] === 'string' && /^\d{4}-\d{2}-\d{2}/.test(n[key])) return n[key].slice(0, 10);
    }
  }
  // Last-ditch: regex (covers blocks that failed JSON.parse)
  const m = html.match(new RegExp(`"${key}"\\s*:\\s*"(\\d{4}-\\d{2}-\\d{2})`));
  return m ? m[1] : null;
}

function toDateLabel(iso) {
  if (!iso) return 'Coming soon';
  const [y, m] = iso.split('-');
  return `${MONTHS_SHORT[parseInt(m, 10) - 1]} ${y}`;
}

function toLongDateLabel(iso) {
  const [y, m] = iso.split('-');
  return `${MONTHS_LONG[parseInt(m, 10) - 1]} ${y}`;
}

function slugify(title, max = 60) {
  let s = String(title).toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ').replace(/%/g, ' percent ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (s.length > max) {
    s = s.slice(0, max);
    const cut = s.lastIndexOf('-');
    if (cut > 20) s = s.slice(0, cut);
  }
  return s.replace(/^-+|-+$/g, '');
}

function absoluteUrl(src, slug) {
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith('//')) return 'https:' + src;
  if (src.startsWith('/')) return SITE_ORIGIN + src;
  // relative to /blog/<slug>  → /blog/<src>
  return `${SITE_ORIGIN}/blog/${src.replace(/^\.\//, '')}`;
}

/** All <img ...> tags that appear after <body> (i.e. inside the page, not in head). */
function bodyImgTags(html) {
  const bodyIdx = html.search(/<body[^>]*>/i);
  const body = bodyIdx === -1 ? html : html.slice(bodyIdx);
  return body.match(/<img\b[^>]*>/gi) || [];
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'));
  return m ? (m[1] !== undefined ? m[1] : m[2]) : null;
}

// ── Hero images (blog/images/<slug>.webp|jpg|png) ────────────────────────────

const HERO_EXTS = ['webp', 'jpg', 'jpeg', 'png'];

/** The post's hero file if one exists under blog/images named after the slug. */
function heroImageFor(slug) {
  for (const ext of HERO_EXTS) {
    const file = path.join(BLOG_DIR, 'images', `${slug}.${ext}`);
    if (fs.existsSync(file)) return { file, url: `/blog/images/${slug}.${ext}` };
  }
  return null;
}

/** Pixel size of a PNG / JPEG / WebP without any dependency. */
function imageSize(file) {
  const b = fs.readFileSync(file);
  if (b[0] === 0x89 && b[1] === 0x50) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b[0] === 0xFF && b[1] === 0xD8) {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xFF) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  if (b.toString('ascii', 0, 4) === 'RIFF') {
    const t = b.toString('ascii', 12, 16);
    if (t === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
    if (t === 'VP8L') { const x = b.readUInt32LE(21); return { w: (x & 0x3fff) + 1, h: ((x >> 14) & 0x3fff) + 1 }; }
    if (t === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  }
  return { w: 1600, h: 900 };
}

const HERO_CSS = `<style>
  /* hero figure (added automatically) — mirrors the newer posts' .article-img rules */
  .article-img { max-width: 720px; margin: 0 auto; padding: 0 24px; }
  .article-img img { width: 100%; height: auto; display: block; border-radius: 6px; margin-top: 32px; }
  .article-img figcaption { font-family: 'Space Mono', monospace; font-size: 0.625rem; letter-spacing: 0.08em; color: #C8C3B5; margin-top: 10px; text-align: center; }
</style>`;

/**
 * If blog/images/<slug>.<ext> exists and the post has no hero figure yet, insert
 * one right after the article divider and point og:image / twitter:image at it.
 * Idempotent: a post that already has a <figure class="article-img"> is left alone.
 */
function applyHeroImage(filePath, opts = {}) {
  const slug = path.basename(filePath, '.html');
  const hero = heroImageFor(slug);
  if (!hero) return { changed: false, reason: 'no hero file' };
  let html = fs.readFileSync(filePath, 'utf8');
  if (/<figure class="article-img">/i.test(stripComments(html))) return { changed: false, reason: 'post already has a hero figure' };
  const marker = '<hr class="article-divider" />';
  const at = html.indexOf(marker);
  if (at === -1) return { changed: false, reason: 'no <hr class="article-divider" /> to anchor on' };
  const { w, h } = imageSize(hero.file);
  const title = (extractPost(filePath).title || slug).replace(/"/g, '&quot;');
  const figure = `\n\n<!-- ARTICLE IMAGE (picked up automatically from ${hero.url}) -->\n<figure class="article-img">\n  <img src="${hero.url}" alt="${title}" width="${w}" height="${h}" />\n  <figcaption>Illustration: Candor</figcaption>\n</figure>`;
  html = html.slice(0, at + marker.length) + figure + html.slice(at + marker.length);
  if (!/\.article-img\s*\{/.test(html)) html = html.replace('</head>', `${HERO_CSS}\n</head>`);
  const abs = `${SITE_ORIGIN}${hero.url}`;
  html = html.replace(/(<meta\s+property="og:image"\s+content=")[^"]*(")/i, `$1${abs}$2`);
  html = html.replace(/(<meta\s+name="twitter:image"\s+content=")[^"]*(")/i, `$1${abs}$2`);
  if (!opts.dryRun) fs.writeFileSync(filePath, html, 'utf8');
  return { changed: true, url: hero.url, width: w, height: h };
}

/** Run applyHeroImage over every post. */
function applyHeroImages(opts = {}) {
  const out = [];
  for (const f of postFiles()) {
    const file = path.isAbsolute(f) ? f : path.join(BLOG_DIR, f);
    const r = applyHeroImage(file, opts);
    if (r.changed) out.push({ file: path.basename(file), ...r });
  }
  return out;
}

// ── Extraction ────────────────────────────────────────────────────────────────

function extractPost(filePath) {
  const abs  = path.resolve(filePath);
  const html = stripComments(fs.readFileSync(abs, 'utf8'));
  const slug = path.basename(abs, '.html');

  const titleTag = html.match(/<title>([^<]*)<\/title>/i);
  const h1Tag    = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1       = h1Tag ? decodeEntities(stripTags(h1Tag[1])) : null;

  let title = titleTag ? decodeEntities(titleTag[1]).replace(/\s*\|\s*Candor\s*$/i, '').trim() : '';
  if (!title && h1) title = h1.replace(/\.$/, '');
  if (!title) title = slug;

  const ledeTag = html.match(/<p\s+class=["']article-lede["'][^>]*>([\s\S]*?)<\/p>/i);
  const lede    = ledeTag ? decodeEntities(stripTags(ledeTag[1])) : null;
  const excerpt = metaContent(html, 'description') || lede || '';

  const tagSpan = html.match(/<span\s+class=["']article-tag["'][^>]*>([\s\S]*?)<\/span>/i);
  const tag     = metaContent(html, 'article:section')
               || (tagSpan ? decodeEntities(stripTags(tagSpan[1])) : '');

  const timeTag = html.match(/<time[^>]*datetime=["'](\d{4}-\d{2}-\d{2})/i);
  const date    = jsonLdDate(html, 'datePublished')
               || (timeTag ? timeTag[1] : null)
               || metaContent(html, 'article:published_time')?.slice(0, 10)
               || null;
  const dateModified = jsonLdDate(html, 'dateModified') || date;

  const imgs    = bodyImgTags(html);
  const firstSrc = imgs.length ? attr(imgs[0], 'src') : null;
  const ogImage = metaContent(html, 'og:image') || absoluteUrl(firstSrc, slug) || DEFAULT_OG_IMAGE;

  const readM = html.match(/(\d+)\s*min read/i);
  let readMinutes = readM ? parseInt(readM[1], 10) : null;
  if (!readMinutes) {
    const article = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    const words = stripTags(article ? article[1] : '').split(/\s+/).filter(Boolean).length;
    readMinutes = Math.max(1, Math.round(words / 200));
  }

  return {
    slug,
    href: `/blog/${slug}`,
    title,
    excerpt,
    tag,
    date,
    dateModified,
    dateLabel: toDateLabel(date),
    ogImage,
    heroUrl: (heroImageFor(slug) || {}).url || null,
    readMinutes,
    canonical: canonicalHref(html),
    h1,
    file: abs,
  };
}

// ── Validation ────────────────────────────────────────────────────────────────

function validatePost(filePath) {
  const abs  = path.resolve(filePath);
  const problems = [];
  if (!fs.existsSync(abs)) return [`file not found: ${abs}`];
  const raw  = fs.readFileSync(abs, 'utf8');
  const html = stripComments(raw);          // commented-out examples don't count
  const slug = path.basename(abs, '.html');
  const expectedCanonical = `${SITE_ORIGIN}/blog/${slug}`;

  // <head> essentials
  const titleTag = html.match(/<title>([^<]*)<\/title>/i);
  if (!titleTag || !titleTag[1].trim())                 problems.push('missing <title>');
  else if (!/\|\s*Candor\s*$/.test(titleTag[1].trim())) problems.push('<title> must end in " | Candor"');

  const description = metaContent(html, 'description');
  if (!description)                                      problems.push('missing <meta name="description">');

  const section = metaContent(html, 'article:section');
  if (!section)                                          problems.push('missing <meta name="article:section">');
  else if (!ALLOWED_TAGS.includes(section))              problems.push(`article:section "${section}" is not an allowed tag (${ALLOWED_TAGS.join(', ')})`);

  const canonical = canonicalHref(html);
  if (!canonical)                                        problems.push('missing <link rel="canonical">');
  else if (canonical !== expectedCanonical)              problems.push(`canonical is ${canonical}, expected ${expectedCanonical}`);

  const datePublished = jsonLdDate(html, 'datePublished');
  if (!datePublished)                                    problems.push('missing "datePublished" in JSON-LD');

  // Visible article header
  const h1s = html.match(/<h1[\s>]/gi) || [];
  if (h1s.length === 0)                                  problems.push('missing <h1>');
  else if (h1s.length !== 1)                             problems.push(`expected exactly 1 <h1>, found ${h1s.length}`);

  const tagSpan = html.match(/<span\s+class=["']article-tag["'][^>]*>([\s\S]*?)<\/span>/i);
  if (!tagSpan)                                          problems.push('missing <span class="article-tag">');
  else {
    const t = decodeEntities(stripTags(tagSpan[1]));
    if (!ALLOWED_TAGS.includes(t))                       problems.push(`article-tag "${t}" is not an allowed tag (${ALLOWED_TAGS.join(', ')})`);
    else if (section && t !== section)                   problems.push(`article-tag "${t}" does not match article:section "${section}"`);
  }

  if (!/<p\s+class=["']article-lede["']/i.test(html))    problems.push('missing <p class="article-lede">');

  const hasTime = /<time[^>]*datetime=["']\d{4}-\d{2}-\d{2}/i.test(html);
  // Up to the closing </header> so nested <div>s inside .article-meta don't cut the match short
  const metaBlock = html.match(/<div\s+class=["']article-meta["'][^>]*>([\s\S]*?)<\/header>/i);
  const hasDateLabel = metaBlock && /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+\d{4}/.test(stripTags(metaBlock[1]));
  if (!metaBlock)                                        problems.push('missing <div class="article-meta">');
  else if (!hasTime && !hasDateLabel)                    problems.push('article-meta has neither a <time datetime> nor a "Month YYYY" date label');
  if (!datePublished && !hasTime)                        problems.push('no publish date found (need JSON-LD datePublished or <time datetime>)');

  // Open Graph / Twitter
  for (const key of ['og:type', 'og:title', 'og:description', 'og:url', 'og:image', 'og:site_name',
                     'article:published_time', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) {
    if (!metaContent(html, key)) problems.push(`missing <meta property="${key}">`);
  }
  const ogUrl = metaContent(html, 'og:url');
  if (ogUrl && canonical && ogUrl !== canonical)         problems.push(`og:url (${ogUrl}) does not match canonical (${canonical})`);

  // Site-wide blocks injected by sync-shared.js + GTM
  if (!raw.includes('candor-consent:start'))             problems.push('missing consent banner marker candor-consent:start (run: node scripts/sync-shared.js <post>)');
  if (!raw.includes('candor-consent-default:start'))     problems.push('missing consent default marker candor-consent-default:start (run: node scripts/sync-shared.js <post>)');
  if (!raw.includes('GTM-NKSHZN82'))                     problems.push('missing Google Tag Manager snippet (GTM-NKSHZN82)');

  // Images
  bodyImgTags(html).forEach((img, i) => {
    const src = attr(img, 'src') || `(img #${i + 1})`;
    const alt = attr(img, 'alt');
    if (alt === null || !alt.trim())                     problems.push(`<img src="${src}"> has no alt text`);
    if (!attr(img, 'width') || !attr(img, 'height'))     problems.push(`<img src="${src}"> is missing width/height attributes`);
    if (src.startsWith('/') || src.startsWith('images/') || src.startsWith('./')) {
      const local = src.startsWith('/') ? path.join(REPO_ROOT, src) : path.join(BLOG_DIR, src.replace(/^\.\//, ''));
      if (!fs.existsSync(local))                          problems.push(`<img src="${src}"> points to a file that does not exist (${path.relative(REPO_ROOT, local)})`);
    }
  });

  // Leftover scaffold placeholders
  const leftover = html.match(/\{\{[A-Z_]+\}\}/g);
  if (leftover)                                          problems.push(`unfilled template placeholders: ${[...new Set(leftover)].join(', ')}`);

  return problems;
}

// ── Listing ───────────────────────────────────────────────────────────────────

function postFiles() {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs.readdirSync(BLOG_DIR)
    .filter(f => f.endsWith('.html') && f !== 'index.html')
    .map(f => path.join(BLOG_DIR, f))
    .sort();
}

function listPosts() {
  return postFiles()
    .map(extractPost)
    .sort((a, b) => {
      const da = a.date || '0000-00-00', db = b.date || '0000-00-00';
      if (da !== db) return da < db ? 1 : -1;
      return a.slug.localeCompare(b.slug);
    });
}

// ── Index (blog/index.html) ───────────────────────────────────────────────────

function buildFeatured(p) {
  const imgCls  = p.heroUrl ? ' has-img' : '';
  const imgStyle = p.heroUrl ? ` style="--card-img:url('${p.heroUrl}')"` : '';
  return `    <a href="${p.href}" class="article-card featured${imgCls}"${imgStyle} data-tag="${escapeHtml(p.tag)}" data-date="${p.date || ''}">
      <div class="featured-left">
        <span class="card-tag">${escapeHtml(p.tag)}</span>
        <h2 class="card-title">${escapeHtml(p.title)}</h2>
      </div>
      <div class="featured-right">
        <p class="card-excerpt">${escapeHtml(p.excerpt)}</p>
        <div class="card-meta">
          <span class="card-date">${p.dateLabel}</span>
          <span class="card-arrow">&#8594;</span>
        </div>
      </div>
    </a>`;
}

function buildCard(p) {
  return `    <a href="${p.href}" class="article-card" data-tag="${escapeHtml(p.tag)}" data-date="${p.date || ''}">
      <span class="card-tag">${escapeHtml(p.tag)}</span>
      <h2 class="card-title">${escapeHtml(p.title)}</h2>
      <p class="card-excerpt">${escapeHtml(p.excerpt)}</p>
      <div class="card-meta">
        <span class="card-date">${p.dateLabel}</span>
        <span class="card-arrow">&#8594;</span>
      </div>
    </a>`;
}

function renderArticlesSection(posts) {
  if (!posts.length) return `  <section class="articles">\n\n  </section>`;
  const [top, ...rest] = posts;
  const inner = [buildFeatured(top), ...rest.map(buildCard)].join('\n\n');
  return `  <section class="articles">\n\n${inner}\n\n  </section>`;
}

/**
 * Regenerate the cards in blog/index.html.
 * @param {{dryRun?: boolean}} opts
 * @returns {{changed: boolean, featured: string|null, count: number, file: string}}
 */
function rebuildIndex(opts = {}) {
  const posts = listPosts();
  const current = fs.readFileSync(INDEX_FILE, 'utf8');
  const re = /[ \t]*<section class="articles">[\s\S]*?<\/section>/;
  if (!re.test(current)) throw new Error('blog/index.html: could not find <section class="articles"> … </section>');
  const next = current.replace(re, renderArticlesSection(posts));
  const changed = next !== current;
  if (changed && !opts.dryRun) fs.writeFileSync(INDEX_FILE, next, 'utf8');
  return { changed, featured: posts[0] ? posts[0].slug : null, count: posts.length, file: INDEX_FILE };
}

// ── Sitemap ───────────────────────────────────────────────────────────────────

function sitemapUrlBlock(p) {
  return `  <url>
    <loc>${SITE_ORIGIN}${p.href}</loc>
    <lastmod>${p.dateModified || p.date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
}

/**
 * Regenerate the blog <url> blocks between the "Individual Articles" and "Tools"
 * comment markers in sitemap.xml. Everything else is left untouched.
 */
function rebuildSitemap(opts = {}) {
  const posts = listPosts().filter(p => p.date);
  const current = fs.readFileSync(SITEMAP_FILE, 'utf8');
  const a = current.indexOf(SITEMAP_START);
  const b = current.indexOf(SITEMAP_END);
  if (a === -1 || b === -1 || b < a) {
    throw new Error(`sitemap.xml: expected markers "${SITEMAP_START}" followed by "${SITEMAP_END}"`);
  }
  const head = current.slice(0, a + SITEMAP_START.length);
  const tail = current.slice(b);
  const blocks = posts.map(sitemapUrlBlock).join('\n');
  const next = `${head}\n${blocks}\n\n  ${tail}`;
  const changed = next !== current;
  if (changed && !opts.dryRun) fs.writeFileSync(SITEMAP_FILE, next, 'utf8');
  return { changed, count: posts.length, file: SITEMAP_FILE };
}

module.exports = {
  REPO_ROOT, BLOG_DIR, INDEX_FILE, SITEMAP_FILE, SITE_ORIGIN, DEFAULT_OG_IMAGE,
  ALLOWED_TAGS, MONTHS_SHORT, MONTHS_LONG,
  extractPost, validatePost, listPosts, postFiles,
  rebuildIndex, rebuildSitemap, renderArticlesSection,
  heroImageFor, imageSize, applyHeroImage, applyHeroImages,
  slugify, toDateLabel, toLongDateLabel, escapeHtml, metaContent, canonicalHref, jsonLdDate,
  bodyImgTags, attr, absoluteUrl, stripComments,
};
