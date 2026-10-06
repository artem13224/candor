---
name: blog-publish
description: End-to-end workflow for Candor blog posts on candorcertified.com. Use this skill for any request to draft, scaffold, write, validate, fix, rebuild the listing for, or publish a Candor blog post or resource article — including "write a post about X", "new article on Y", "publish the draft", "is this post ready", "add it to the blog", "why isn't the new post on the index", or anything touching blog/*.html, blog/index.html, sitemap.xml blog entries, or the scripts in scripts/. It covers the scaffold → write → validate → dry-run → publish pipeline, the allowed tags, the required elements, and the image rules. Never git-push a post without the user's explicit approval.
---

# Candor blog publish workflow

Static site, no build step. Every post is a standalone HTML file in `blog/`. One library owns
all blog logic: `scripts/lib/blog.js`. The CLIs below are thin wrappers over it. Read
`CLAUDE.md` (sections "Commands" and "Blog system") before starting; it is the source of truth
for business facts, pricing, and voice. If the `candor-blog-writer` skill is available, use it
for the article copy itself (voice, SEO structure); this skill owns the file mechanics.

## The flow

```
1. scaffold   node scripts/new-post.js "Title" --tag "Process" [--date YYYY-MM-DD] [--lede "..."] [--description "..."] [--read 6] [--og-image URL]
2. write      edit blog/<slug>.html — only inside <article class="article-body"> plus the CTA copy and the two "More from the blog" cards
3. validate   node scripts/validate-post.js blog/<slug>.html        (or: npm run validate  — all posts)
4. rehearse   node scripts/publish.js blog/<slug>.html --dry-run
5. publish    node scripts/publish.js blog/<slug>.html              ← ONLY after the user has approved publishing
```

`publish.js` does, in order: copy into `blog/` (if needed) → `node scripts/sync-shared.js <post>`
(site-wide consent banner, footer links, a11y block) → validate (stops with the problem list
unless `--force`) → rebuild `blog/index.html` cards and the blog block of `sitemap.xml` →
`git add` / `git commit -m "blog: publish <slug>"` / `git push`. Use `--no-git` to write files
without committing (e.g. when the user wants to review in a branch first).

Useful extras:
- `npm run rebuild` — regenerate index + sitemap from whatever is in `blog/` (safe any time).
- `npm run watch` — same, continuously, while editing.
- `node scripts/new-post.js ... --dry-run` — show the slug and resolved values, write nothing.

## Step details

### 1. Scaffold
- Title: the SEO title (Title Case, no trailing period). It becomes `<title>`, `og:title`,
  JSON-LD `headline`, the breadcrumb and the `<h1>`. You may rewrite the `<h1>` afterwards in
  sentence case with a trailing period, as existing posts do — keep `<title>` unchanged.
- Pass a short, keyword-first `--slug` (e.g. `b-corp-news-fall-2026`, not the whole title).
  Without it the slug is the full title in kebab-case, which makes long, clumsy URLs.
- `--tag` must be one of the allowed tags (below). `--date` defaults to today. `--read` is the
  stated reading time; estimate ~200 words/min once the article is written and update the
  `N min read` span if it changed.
- `--description` is the meta description (≤ 160 chars, used as the card excerpt and
  `og:description`). `--lede` is the visible framing paragraph under the `<h1>`. Both can be
  edited in the file afterwards; if you edit the description, update the `og:description` and
  `twitter:description` tags and the JSON-LD `description` to match.
- Pass `--og-image https://candorcertified.com/blog/images/<file>` if the post has a hero image;
  otherwise it falls back to `/images/heroes/webshare.jpg`.

### 2. Write
- Work only inside `<article class="article-body">…</article>`; the comment block at the top of
  it lists every allowed building block (`p`, `h2`, `h3`, `ul.checklist`, `ol.step-list`,
  `div.callout`, `div.pull-quote`, `div.stat-row`, `hr.section-break`, `figure.article-img`).
  Do not invent new classes or add `<style>`; the skeleton already contains all CSS.
- Delete the instruction comments when done. Tailor the two lines in the CTA section.
- Leave the "More from the blog" section alone: `rebuildRelated()` (run by `npm run rebuild` and
  `publish.js`) fills it on **every** post with the newest post, one post with the same tag, and
  the "All articles" card. So each new post is suggested across the whole blog the day it goes
  out, and its own page suggests older posts. `publish.js` commits the posts whose suggestions changed.
- Internal links use root-relative paths without `.html` (`/blog/b-impact-assessment-explained`).
- Optional FAQ: if the article has a real FAQ section, uncomment the `FAQPage` JSON-LD in `<head>`
  and mirror the visible questions/answers exactly; otherwise remove that comment.
- Keep business facts consistent with `CLAUDE.md` (tiers, prices, timelines, certification
  bodies). Voice rules live in the `candor-blog-writer` skill.

### Images
- Put files in `blog/images/`, compressed (`.webp` preferred, or `.jpg`), 1200–1800 px wide,
  well under 300 KB. Never commit multi-megabyte PNGs.
- Every `<img>` needs `alt` (describe the picture), real `width` and `height`
  (`identify -format "%w %h" blog/images/<file>`), and `loading="lazy" decoding="async"` on every
  image except the first one in the article (the hero loads eagerly).
- Every `<figure>` gets a `<figcaption>` that includes the source and licence
  (e.g. "Photo: Jane Doe / Unsplash licence", "Press image courtesy of …").
- The first image's absolute URL should be the `og:image` / `twitter:image`.

### 3. Validate
`validatePost()` checks: `<title>` ending in " | Candor"; meta description; `article:section`
in the allowed tags and matching `.article-tag`; canonical = `https://candorcertified.com/blog/<slug>`;
JSON-LD `datePublished`; exactly one `<h1>`; `.article-tag`, `.article-lede`, `.article-meta`
with a "Month YYYY" label (or `<time datetime>`); all OG/Twitter tags with `og:url` = canonical;
consent markers (`candor-consent-default:start`, `candor-consent:start`) and GTM `GTM-NKSHZN82`;
every `<img>` has alt + width/height and points at an existing file; no leftover
`{{PLACEHOLDER}}`. HTML comments are ignored. Fix every problem; do not reach for `--force`.

### 4–5. Publish
- Always run `--dry-run` first and show the user the parsed metadata (title, tag, date,
  excerpt, og:image) and what would change.
- Run the real `publish.js` only when the user has explicitly approved publishing in this
  conversation. It pushes to the deployed branch; Netlify goes live within a minute.
- After publishing, report the live URL (`https://candorcertified.com/blog/<slug>`) and add the
  new post to the "Existing blog posts" table in `CLAUDE.md`.

## Reference

Allowed tags (exact strings): `B Corp Basics`, `Process`, `Certifications`
(`ALLOWED_TAGS` in `scripts/lib/blog.js`). Both `<meta name="article:section">` and
`<span class="article-tag">` must use the same one.

Required elements of a post (the template already contains all of them):

```html
<title>Title | Candor</title>
<meta name="description" content="…">
<link rel="canonical" href="https://candorcertified.com/blog/<slug>">
<meta name="article:section" content="Tag">
<meta property="og:type|og:title|og:description|og:url|og:image|og:site_name|article:published_time" …>
<meta property="twitter:card|twitter:title|twitter:description|twitter:image" …>
<script type="application/ld+json"> Article { datePublished, dateModified } + BreadcrumbList </script>

<span class="article-tag">Tag</span>
<h1>One heading</h1>
<p class="article-lede">Framing paragraph</p>
<div class="article-meta"><span>Artem Furman</span><span class="sep">·</span><span>Month YYYY</span><span class="sep">·</span><span>N min read</span></div>
<hr class="article-divider" />
<article class="article-body">…</article>
```

Card logic on `blog/index.html`: newest post by `datePublished` is the featured dark card, the
rest are regular cards newest-first. Never hand-edit `<section class="articles">`; run
`npm run rebuild`. The sitemap's blog `<url>` blocks are regenerated between the
`<!-- Individual Articles -->` and `<!-- Tools -->` markers — keep those comments in place.

Boundaries: do not touch `index.html`, `assessment/`, `privacy-policy/`, `netlify.toml` or
`scripts/sync-shared.js` as part of a blog task. Never run `git push` (via `publish.js` or
directly) without the user's go-ahead.

## Hero images and share cards

- Every post should have a hero. The user generates it in ChatGPT from a prompt you write (the
  approved "misty lake" style, template in `images/README.md` under "Blog hero prompt"). Give
  the prompt in chat (or in the PR body for the weekly routine), never generate faces, text or logos.
- Save the file as `images/_inbox/blog-<slug>.png` (or `.webp`/`.jpg`) and run `npm run images`,
  then `npm run rebuild` / `publish`. That injects the `<figure>`, points `og:image` /
  `twitter:image` at it, and uses it as the featured card's background. Do not hand-write the figure.
- The injected `alt` is the post title: replace it with a one-line description of the picture.
- After publishing, offer `npm run og -- blog/<slug>.html` to render the branded share card (needs `npm install` and `npx playwright install chromium` once).

## The featured card

The newest post by JSON-LD `datePublished` becomes the big dark featured card at the top of
`blog/index.html`, and the previous one drops into the regular grid. Nothing to do by hand:
`rebuildIndex()` handles it. To keep an older post on top, its date would have to be newer, so don't.

## News posts (and the weekly routine)

The blog mixes evergreen guides with news. Every existing topic is listed in CLAUDE.md under
"Existing blog posts"; don't write a second post on one of them. For a news post:

1. Cover roughly the last three months of B Corp news that matters to a small business in BC:
   B Lab standards and rules, notable certifications/recertifications/decertifications (Canadian
   ones especially), and Canadian or EU rules on green claims.
2. Every fact needs a named, dated source linked inline. In the cloud environment WebFetch is
   usually blocked by the egress proxy, so confirm each claim in at least two independent search
   results. Drop anything you can only find once, and list the weakest-sourced claims for the user.
3. Title pattern: "B Corp News <Season> <Year>: <angle>"; tag `B Corp Basics`; slug `b-corp-news-<season>-<year>`.
4. Voice and structure come from the `candor-blog-writer` skill. If it isn't available: no em
   dashes, nothing in threes, no bullet lists, first person, plain and confident, 600–1,000 words,
   3–5 `<h2>`s, one pull quote, one callout, a stat row only with real sourced numbers, and the
   closing line "Start with the free score. Two minutes, and you'll know where you actually stand."
   linking to `/assessment/`.

The weekly routine follows this skill end to end, then: `node scripts/publish.js blog/<slug>.html --no-git`,
commit on a new branch `claude/blog-<slug>` from the default branch, push, and open a **draft** PR
whose body has the summary, the sources, the weakest claims and the hero image prompt. It never
merges and never pushes to the default branch; the user approves on the PR.

## Key-point highlights

Every post marks its 4–6 most important phrases with `<mark>…</mark>` so skimmers get the point fast; a shared script sweeps a sage-green tint behind each one as it scrolls into view (injected by `scripts/sync-shared.js` into any page with `"@type": "Article"` JSON-LD, so `publish.js` adds it automatically).

- Mark concrete takeaways: numbers, costs, timelines, decisions, the one-line "so what" of a section. About 6–25 words each, roughly one per section, never the same idea twice.
- Only inside plain `<p>`/`<li>` text in `.article-body`. Never in headings, the lede, figcaptions, links, callouts, pull-quotes, stat rows or the CTA box (dark backgrounds).
- The `<mark>` must open and close inside the same element; it may contain `<strong>`/`<em>` but must not cross a tag boundary or wrap a link.
