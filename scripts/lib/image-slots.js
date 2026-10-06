/**
 * image-slots.js — the single list of every image the site knows how to use.
 *
 * Drop a generated or photographed file into images/_inbox/ named after the
 * slot (e.g. images/_inbox/hero-art.png) and run `npm run images`. The script
 * resizes/crops it to the slot's exact size and format and writes it to `dest`,
 * where the HTML already references it. Nothing else needs editing.
 *
 * Blog heroes use the pattern  blog-<slug>.<ext>  →  blog/images/<slug>.webp
 * and are picked up by `npm run rebuild` / `npm run publish`.
 */

const SLOTS = [
  // ── Illustrations (ink-and-wash contour style) ─────────────────────────────
  { name: 'hero-art',    dest: 'images/heroes/hero-art.webp',   width: 1400, height: 1400, format: 'webp', quality: 80, kind: 'illustration',
    where: 'Home page hero, right half, masked into the paper background. Decorative only.' },
  { name: 'lost-trail',  dest: 'images/heroes/lost-trail.webp', width: 1600, height: 1000, format: 'webp', quality: 80, kind: 'illustration',
    where: '404 page, right half, masked into the background.' },
  { name: 'lake-wide',   dest: 'images/heroes/lake-wide.webp',  width: 2000, height: 1126, format: 'webp', quality: 82, kind: 'illustration',
    where: 'Blog index hero (landscape screens): the misty lake painting. Waterline at 70 % height; the canoe box and waterline are hard-coded in blog/index.html (still-lake script) — re-measure them if the art changes.' },
  { name: 'lake-tall',   dest: 'images/heroes/lake-tall.webp',  width: 1126, height: 2000, format: 'webp', quality: 82, kind: 'illustration',
    where: 'Blog index hero (portrait screens): the same lake, recomposed tall. Waterline at 63.2 % height.' },
  { name: 'og-bg',       dest: 'images/heroes/og-bg.webp',      width: 1200, height: 630,  format: 'webp', quality: 82, kind: 'illustration',
    where: 'Background of every generated share image (scripts/make-og.js draws the title and wordmark on top).' },

  // ── Photography (film-like, muted, Pacific Northwest) ──────────────────────
  { name: 'break-1',     dest: 'images/heroes/break-1.jpg',     width: 1920, height: 1080, format: 'jpeg', quality: 76, kind: 'photo',
    where: 'Full-width landscape break between "Why now" and "Who I work with".' },
  { name: 'break-2',     dest: 'images/heroes/break-2.jpg',     width: 1920, height: 1080, format: 'jpeg', quality: 76, kind: 'photo',
    where: 'Full-width landscape break before the About section.' },
  { name: 'cta-bg',      dest: 'images/heroes/cta-bg.jpg',      width: 1920, height: 1080, format: 'jpeg', quality: 76, kind: 'photo',
    where: 'Background of the final "Start with the free score" call to action (dark overlay on top).' },
  { name: 'who-cannabis', dest: 'images/industry/who-cannabis.jpg', width: 1600, height: 900, format: 'jpeg', quality: 76, kind: 'photo',
    where: 'Industry card: Cannabis brands.' },
  { name: 'who-outdoor',  dest: 'images/industry/who-outdoor.jpg',  width: 1600, height: 900, format: 'jpeg', quality: 76, kind: 'photo',
    where: 'Industry card: Outdoor & apparel.' },
  { name: 'who-food',     dest: 'images/industry/who-food.jpg',     width: 1600, height: 900, format: 'jpeg', quality: 76, kind: 'photo',
    where: 'Industry card: Food & beverage.' },
  { name: 'who-beauty',   dest: 'images/industry/who-beauty.jpg',   width: 1600, height: 900, format: 'jpeg', quality: 76, kind: 'photo',
    where: 'Industry card: Clean beauty.' },
  { name: 'who-coffee',   dest: 'images/industry/who-coffee.jpg',   width: 1600, height: 900, format: 'jpeg', quality: 76, kind: 'photo',
    where: 'Industry card: Coffee & hospitality.' },
  { name: 'who-studio',   dest: 'images/industry/who-studio.jpg',   width: 1600, height: 900, format: 'jpeg', quality: 76, kind: 'photo',
    where: 'Industry card: Studios & agencies.' },

  // ── Real photographs only ──────────────────────────────────────────────────
  { name: 'about-portrait', dest: 'images/about-portrait.jpg', width: 1200, height: 1200, format: 'jpeg', quality: 80, kind: 'portrait',
    where: 'About section. Must be a real photo of Artem — never a generated face.' },
];

const BLOG_HERO = { prefix: 'blog-', destDir: 'blog/images', width: 1600, height: 900, format: 'webp', quality: 80 };

function findSlot(stem) {
  const s = String(stem).toLowerCase();
  const slot = SLOTS.find(x => x.name === s);
  if (slot) return slot;
  if (s.startsWith(BLOG_HERO.prefix) && s.length > BLOG_HERO.prefix.length) {
    const slug = s.slice(BLOG_HERO.prefix.length);
    return { ...BLOG_HERO, name: s, slug, dest: `${BLOG_HERO.destDir}/${slug}.${BLOG_HERO.format}`, kind: 'blog-hero',
             where: `Hero image for blog/${slug}.html (injected automatically on rebuild/publish).` };
  }
  return null;
}

module.exports = { SLOTS, BLOG_HERO, findSlot };
