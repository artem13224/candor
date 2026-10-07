#!/usr/bin/env node
/*
 * ux-audit collector — measures what a browser can measure, so the auditor's
 * judgement goes to what it can't.
 *
 *   node collect.js <url> [--out DIR] [--pages /a,/b] [--shots N] [--no-nojs]
 *
 * Writes DIR/report.json (everything), DIR/digest.md (compact flags to read
 * first) and DIR/shots/*.png (viewport-by-viewport scroll captures).
 * Needs Playwright + Chromium. Honours HTTPS_PROXY.
 */
'use strict';
const fs = require('fs');
const path = require('path');

function loadPlaywright() {
  const tries = [process.env.PLAYWRIGHT_PATH, 'playwright', 'playwright-core',
    '/opt/node-tools/node_modules/playwright', '@playwright/test'].filter(Boolean);
  for (const t of tries) { try { return require(t); } catch (_) {} }
  console.error('Playwright not found. Install with: npm i -D playwright && npx playwright install chromium');
  process.exit(2);
}
const { chromium } = loadPlaywright();
function loadAxe() {
  for (const t of [process.env.AXE_PATH, 'axe-core', path.join(__dirname, 'node_modules/axe-core')].filter(Boolean)) {
    try { const m = require(t); if (m && m.source) return m.source; } catch (_) {}
    try { const f = path.join(t, 'axe.min.js'); if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8'); } catch (_) {}
  }
  return null;
}
const AXE = loadAxe();

// ---------- args ----------
const argv = process.argv.slice(2);
if (!argv[0] || argv[0].startsWith('-')) {
  console.error('usage: node collect.js <url> [--out DIR] [--pages /a,/b] [--shots N] [--no-nojs]');
  process.exit(1);
}
const opt = (k, d) => { const i = argv.indexOf(k); return i > -1 ? argv[i + 1] : d; };
const START = argv[0];
const OUT = path.resolve(opt('--out', 'ux-audit-out'));
const SHOTS = +opt('--shots', 6);
const NOJS = !argv.includes('--no-nojs');
const origin = new URL(START).origin;
const PAGES = (opt('--pages', '') || '').split(',').filter(Boolean).map(p => new URL(p, origin).href);
if (!PAGES.length) PAGES.push(START);
fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: 'tablet', width: 768, height: 1024, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: 'desktop', width: 1440, height: 900, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
];
const isLocal = /^(https?:\/\/)?(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(START) || START.startsWith('file:');
const launchOpts = {};
if (process.env.HTTPS_PROXY && !isLocal) launchOpts.proxy = { server: process.env.HTTPS_PROXY };
if (process.env.CHROMIUM_PATH) launchOpts.executablePath = process.env.CHROMIUM_PATH;

const slug = u => (new URL(u).pathname.replace(/\/+$/, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home');
const wait = ms => new Promise(r => setTimeout(r, ms));

// ---------- in-page probes (run in the browser) ----------
const PROBES = () => {
  const W = window, D = document;
  const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const sel = el => { if (!el || !el.tagName) return '?'; let s = el.tagName.toLowerCase();
    if (el.id) return s + '#' + el.id;
    const c = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
    if (c.length) s += '.' + c.join('.');
    const p = el.parentElement; if (p && p !== D.body) { const ps = p.id ? '#' + p.id : (p.getAttribute('class') || '').split(/\s+/)[0]; if (ps) s = (p.id ? ps : p.tagName.toLowerCase() + '.' + ps) + ' > ' + s; }
    return s; };
  const parse = c => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const over = (top, under) => { const a = top[3]; return [0, 1, 2].map(i => top[i] * a + under[i] * (1 - a)).concat(1); };
  const effBg = el => { const layers = []; let imgBehind = false;
    for (let a = el; a; a = a.parentElement) { const s = getComputedStyle(a);
      if (s.backgroundImage && s.backgroundImage !== 'none') imgBehind = true;
      const c = parse(s.backgroundColor); if (c && c[3] > 0) { layers.push(c); if (c[3] >= 1) break; } }
    let bg = [255, 255, 255, 1]; for (let i = layers.length - 1; i >= 0; i--) bg = over(layers[i], bg);
    return { bg, imgBehind }; };
  const cumOpacity = el => { let o = 1; for (let a = el; a; a = a.parentElement) o *= +getComputedStyle(a).opacity; return o; };
  const out = {};

  // --- document basics
  const vp = D.querySelector('meta[name=viewport]');
  out.doc = { title: D.title, lang: D.documentElement.lang || null,
    viewport: vp ? vp.content : null,
    zoomBlocked: !!(vp && /user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/i.test(vp.content)),
    height: D.documentElement.scrollHeight, vh: innerHeight };

  // --- structure
  const hs = [...D.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(vis);
  const skips = []; let prev = 0;
  hs.forEach(h => { const l = +h.tagName[1]; if (prev && l > prev + 1) skips.push(`h${prev}→h${l} "${h.textContent.trim().slice(0, 40)}"`); prev = l; });
  out.structure = { h1: hs.filter(h => h.tagName === 'H1').length, headingCount: hs.length, headingSkips: skips.slice(0, 10),
    outline: hs.slice(0, 40).map(h => h.tagName.toLowerCase() + ' ' + h.textContent.trim().replace(/\s+/g, ' ').slice(0, 60)),
    landmarks: { main: D.querySelectorAll('main,[role=main]').length, nav: D.querySelectorAll('nav,[role=navigation]').length,
      header: D.querySelectorAll('header,[role=banner]').length, footer: D.querySelectorAll('footer,[role=contentinfo]').length },
    skipLink: !![...D.querySelectorAll('a[href^="#"]')].slice(0, 5).find(a => /skip|main content/i.test(a.textContent)),
    dupIds: (() => { const m = {}; D.querySelectorAll('[id]').forEach(e => m[e.id] = (m[e.id] || 0) + 1); return Object.keys(m).filter(k => m[k] > 1).slice(0, 10); })(),
    positiveTabindex: D.querySelectorAll('[tabindex]:not([tabindex="0"]):not([tabindex^="-"])').length };

  // --- accessible names (approximation of the accname algorithm)
  const name = el => { const t = (el.getAttribute('aria-label') || '').trim(); if (t) return t;
    const lb = el.getAttribute('aria-labelledby'); if (lb) return lb.split(/\s+/).map(i => (D.getElementById(i) || {}).textContent || '').join(' ').trim();
    if (el.id) { const l = D.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (l) return l.textContent.trim(); }
    const wrap = el.closest('label'); if (wrap) return wrap.textContent.trim();
    const img = el.querySelector && el.querySelector('img[alt],svg[aria-label],svg title');
    return ((el.innerText || el.value || el.getAttribute('title') || '') + ' ' + (img ? (img.getAttribute('alt') || img.getAttribute('aria-label') || img.textContent) : '')).trim(); };
  const imgs = [...D.images];
  const below = imgs.filter(i => i.getBoundingClientRect().top > innerHeight * 1.2);
  const links = [...D.querySelectorAll('a[href]')].filter(vis);
  const generic = /^(click here|here|read more|more|learn more|link|this|details|continue)$/i;
  const controls = [...D.querySelectorAll('button,[role=button],input:not([type=hidden]),select,textarea')].filter(vis);
  const fields = controls.filter(e => /^(INPUT|SELECT|TEXTAREA)$/.test(e.tagName) && !/^(submit|button|reset|image)$/i.test(e.type));
  out.a11yNames = {
    imgNoAlt: imgs.filter(i => !i.hasAttribute('alt') && vis(i)).map(i => (i.currentSrc || i.src).split('/').pop()).slice(0, 15),
    linksNoName: links.filter(a => !name(a)).map(sel).slice(0, 10),
    linksGeneric: links.filter(a => generic.test(name(a))).map(a => `"${name(a)}" ${sel(a)}`).slice(0, 10),
    controlsNoName: controls.filter(e => !name(e) && !e.placeholder).map(sel).slice(0, 10),
    placeholderOnlyFields: fields.filter(e => !name(e) && e.placeholder).map(e => `${sel(e)} "${e.placeholder}"`).slice(0, 10),
    missingAutocomplete: fields.filter(e => /email|name|tel|phone|address|postal|zip/i.test((e.name || '') + (e.id || '') + (e.type || '')) && !e.getAttribute('autocomplete')).map(sel).slice(0, 10),
    iframesNoTitle: [...D.querySelectorAll('iframe')].filter(f => !f.title && vis(f)).length,
    svgIconButtonsNoName: [...D.querySelectorAll('button,a')].filter(b => vis(b) && b.querySelector('svg') && !name(b)).map(sel).slice(0, 10) };

  // --- contrast (text nodes with their own glyphs)
  const fails = {}; let checked = 0, overImage = 0;
  const walker = D.createTreeWalker(D.body, NodeFilter.SHOW_TEXT, { acceptNode: n => n.nodeValue.trim().length > 1 ? 1 : 2 });
  const seen = new Set();
  for (let n; (n = walker.nextNode()) && checked < 4000;) {
    const el = n.parentElement; if (!el || seen.has(el) || !vis(el)) continue; seen.add(el);
    if (el.closest('[aria-hidden="true"]') && !el.closest('#loader')) continue;
    const s = getComputedStyle(el); let fg = parse(s.color); if (!fg) continue;
    const op = cumOpacity(el); if (op < 0.05) continue;
    const { bg, imgBehind } = effBg(el); fg = over([fg[0], fg[1], fg[2], fg[3] * op], bg);
    const px = parseFloat(s.fontSize), wt = +s.fontWeight || 400;
    const large = px >= 24 || (px >= 18.66 && wt >= 700); const need = large ? 3 : 4.5;
    const r = ratio(fg, bg); checked++;
    if (imgBehind) { overImage++; continue; }
    if (r < need) { const k = `${s.color} on rgb(${bg.slice(0, 3).map(Math.round)}) ${Math.round(px)}px`;
      (fails[k] = fails[k] || { ratio: +r.toFixed(2), need, px: Math.round(px), count: 0, sample: [] }).count++;
      if (fails[k].sample.length < 3) fails[k].sample.push(`${sel(el)} "${n.nodeValue.trim().slice(0, 30)}"`); }
  }
  out.contrast = { textElementsChecked: checked, overImageUnverified: overImage,
    failures: Object.entries(fails).map(([k, v]) => ({ pair: k, ...v })).sort((a, b) => b.count - a.count).slice(0, 25) };

  // --- target size (WCAG 2.5.8: 24x24 CSS px unless inline text link)
  const tgs = [...D.querySelectorAll('a[href],button,[role=button],input:not([type=hidden]),select,summary,[onclick]')].filter(vis);
  const small = [];
  tgs.forEach(e => { const r = e.getBoundingClientRect(); if (r.width >= 24 && r.height >= 24) return; if (r.width <= 2 || r.height <= 2) return;
    const inline = e.tagName === 'A' && /^(P|LI|TD|DD|SPAN|EM|STRONG|BLOCKQUOTE|FIGCAPTION|LABEL)$/.test(e.parentElement.tagName) && e.parentElement.textContent.trim().length > e.textContent.trim().length + 15;
    if (!inline) small.push(`${sel(e)} ${Math.round(r.width)}×${Math.round(r.height)}`); });
  out.targets = { interactive: tgs.length, under24: small.length, samples: small.slice(0, 15),
    under44: tgs.filter(e => { const r = e.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).length };

  // --- typography & colour system
  const paras = [...D.querySelectorAll('p,li')].filter(p => vis(p) && p.textContent.trim().length > 160);
  const cv = D.createElement('canvas').getContext('2d');
  const cpl = paras.map(p => { const s = getComputedStyle(p); cv.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
    const avg = cv.measureText('abcdefghijklmnopqrstuvwxyz ').width / 27; return Math.round(p.clientWidth / avg); }).sort((a, b) => a - b);
  const sizes = {}, fams = {}, colors = {}, weights = {}; const lh = [];
  [...D.querySelectorAll('body *')].slice(0, 6000).forEach(e => { if (!e.childNodes.length || ![...e.childNodes].some(c => c.nodeType === 3 && c.nodeValue.trim())) return;
    if (!vis(e)) return; const s = getComputedStyle(e); sizes[Math.round(parseFloat(s.fontSize))] = 1; fams[s.fontFamily.split(',')[0].replace(/["']/g, '').trim()] = 1;
    colors[s.color] = 1; weights[s.fontWeight] = 1; });
  paras.slice(0, 40).forEach(p => { const s = getComputedStyle(p); const l = parseFloat(s.lineHeight); if (l) lh.push(+(l / parseFloat(s.fontSize)).toFixed(2)); });
  const med = a => a.length ? a[Math.floor(a.length / 2)] : null;
  out.type = { families: Object.keys(fams), sizes: Object.keys(sizes).map(Number).sort((a, b) => a - b), weights: Object.keys(weights).sort(),
    textColors: Object.keys(colors).length, bodyCharsPerLine: { median: med(cpl), max: cpl[cpl.length - 1] || null, n: cpl.length },
    bodyLineHeight: med(lh.sort()), justified: paras.filter(p => getComputedStyle(p).textAlign === 'justify').length,
    smallestTextPx: Math.min(...Object.keys(sizes).map(Number)) };

  // --- images (CLS + weight)
  out.images = { total: imgs.length,
    noDimensions: imgs.filter(i => vis(i) && !i.getAttribute('width') && !i.getAttribute('height') && !getComputedStyle(i).aspectRatio.match(/\d/)).length,
    belowFoldNotLazy: below.filter(i => i.loading !== 'lazy').length,
    oversized: imgs.filter(i => vis(i) && i.naturalWidth > 2.2 * i.getBoundingClientRect().width * devicePixelRatio && i.naturalWidth > 600)
      .map(i => `${(i.currentSrc || i.src).split('/').pop()} ${i.naturalWidth}px→${Math.round(i.getBoundingClientRect().width)}px`).slice(0, 8),
    legacyFormats: imgs.filter(i => /\.(png|jpe?g)(\?|$)/i.test(i.currentSrc || i.src) && i.naturalWidth > 800).length };

  // --- motion system (static view)
  const durs = {}, eases = {}; const nonComposited = new Set(); let transitionEls = 0;
  [...D.querySelectorAll('body *')].slice(0, 6000).forEach(e => { const s = getComputedStyle(e);
    const d = s.transitionDuration.split(',').map(parseFloat).filter(x => x > 0);
    if (d.length) { transitionEls++; d.forEach(x => durs[Math.round(x * 1000)] = (durs[Math.round(x * 1000)] || 0) + 1);
      s.transitionTimingFunction.split(/,(?![^(]*\))/).forEach(t => eases[t.trim()] = (eases[t.trim()] || 0) + 1);
      s.transitionProperty.split(',').map(t => t.trim()).forEach(p => { if (/^(width|height|top|left|right|bottom|margin.*|padding.*|max-height|font-size)$/.test(p)) nonComposited.add(`${p} on ${sel(e)}`); }); } });
  let rmRules = 0, sheetsUnreadable = 0;
  for (const sh of D.styleSheets) { try { for (const r of sh.cssRules) if (r.media && /prefers-reduced-motion/.test(r.media.mediaText)) rmRules++; } catch (_) { sheetsUnreadable++; } }
  const scriptsRM = [...D.scripts].some(s => /prefers-reduced-motion/.test(s.textContent));
  const stickies = [...D.querySelectorAll('body *')].filter(e => getComputedStyle(e).position === 'sticky' && vis(e))
    .map(e => ({ el: sel(e), trackVh: +(e.parentElement.getBoundingClientRect().height / innerHeight).toFixed(1) })).filter(x => x.trackVh > 1.5);
  out.motionStatic = { transitionElements: transitionEls,
    durationsMs: Object.entries(durs).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${k}ms×${v}`),
    easings: Object.entries(eases).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k}×${v}`),
    layoutPropertyTransitions: [...nonComposited].slice(0, 10),
    reducedMotionCssRules: rmRules, reducedMotionInScripts: scriptsRM, crossOriginSheetsUnread: sheetsUnreadable,
    pinnedScrollTracks: stickies.slice(0, 10), scrollBehavior: getComputedStyle(D.documentElement).scrollBehavior,
    customCursor: !!D.querySelector('[style*="cursor:none"],[style*="cursor: none"]') || [...D.styleSheets].some(sh => { try { return [...sh.cssRules].some(r => /cursor:\s*none/.test(r.cssText)); } catch (_) { return false; } }),
    autoplayVideo: [...D.querySelectorAll('video[autoplay]')].map(v => ({ muted: v.muted, loop: v.loop, controls: v.controls })),
    gifs: imgs.filter(i => /\.gif(\?|$)/i.test(i.src)).length };
  // --- text collisions: visible text boxes that overlap other text (not ancestors)
  // content-visibility:auto leaves off-screen sections unlaid-out, which fakes overlaps; lay everything out first
  const cvFix = D.createElement('style'); cvFix.textContent = '*{content-visibility:visible!important}'; D.head.appendChild(cvFix);
  const shown = e => { if (cumOpacity(e) < 0.1) return false;
    for (let a = e; a && a !== D.body; a = a.parentElement) { const s = getComputedStyle(a);
      if (s.position === 'fixed' || s.visibility === 'hidden' || /rect\(/.test(s.clip) || (s.clipPath !== 'none' && /inset\(50%|circle\(0/.test(s.clipPath))) return false;
      const r = a.getBoundingClientRect(); if (s.overflow === 'hidden' && (r.width <= 2 || r.height <= 2)) return false; }
    return true; };
  const leaves = [...D.querySelectorAll('body *')].filter(e => vis(e) && [...e.childNodes].some(c => c.nodeType === 3 && c.nodeValue.trim().length > 1) && shown(e)).slice(0, 2500);
  const boxes = leaves.map(e => { const rg = D.createRange(); rg.selectNodeContents(e); const r = rg.getBoundingClientRect();
    return { e, x: r.left, y: r.top + scrollY, w: r.width, h: r.height }; }).filter(b => b.w > 4 && b.h > 4).sort((a, b) => a.y - b.y);
  const hits = [];
  for (let i = 0; i < boxes.length && hits.length < 12; i++) for (let j = i + 1; j < boxes.length && boxes[j].y < boxes[i].y + boxes[i].h; j++) {
    const a = boxes[i], b = boxes[j]; if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
    const ow = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oh = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (ow > 3 && oh > 3 && ow * oh > 40) hits.push(`"${a.e.textContent.trim().slice(0, 24)}" (${sel(a.e)}) × "${b.e.textContent.trim().slice(0, 24)}" (${sel(b.e)}) ${Math.round(ow)}×${Math.round(oh)}px`); }
  out.collisions = hits; cvFix.remove();
  // --- CSS integrity: unbalanced braces in inline <style> (one stray brace silently drops later rules)
  out.cssIntegrity = [...D.querySelectorAll('style')].map((st, k) => { const t = st.textContent.replace(/\/\*[\s\S]*?\*\//g, '').replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""');
    let d = 0, neg = -1; for (let i = 0; i < t.length; i++) { if (t[i] === '{') d++; else if (t[i] === '}') { d--; if (d < 0 && neg < 0) { neg = i; d = 0; } } }
    if (d === 0 && neg < 0) return null; const at = neg >= 0 ? neg : t.length;
    return `<style> #${k + 1}: ${neg >= 0 ? 'stray "}"' : d + ' unclosed "{"'} near "${t.slice(Math.max(0, at - 60), at + 10).replace(/\s+/g, ' ').trim()}"`; }).filter(Boolean);
  return out;
};

// running animations snapshot
const ANIMS = () => {
  const sel = el => !el ? '?' : el.id ? '#' + el.id : el.tagName.toLowerCase() + ((el.getAttribute && el.getAttribute('class')) ? '.' + el.getAttribute('class').trim().split(/\s+/).slice(0, 2).join('.') : '');
  return document.getAnimations().filter(a => a.playState === 'running').map(a => {
    const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : {}; let props = [];
    try { props = [...new Set(a.effect.getKeyframes().flatMap(k => Object.keys(k).filter(x => !['offset', 'easing', 'composite', 'computedOffset'].includes(x))))]; } catch (_) {}
    return { kind: a.constructor.name.replace('CSS', ''), name: a.animationName || a.transitionProperty || '', target: sel(a.effect && a.effect.target),
      dur: Math.round(+t.duration || 0), iter: t.iterations === Infinity ? 'inf' : t.iterations, easing: t.easing, props };
  });
};

// motion = things that move or blur (vestibular triggers); colour/opacity changes are not motion
const MOTION = /^(transform|translate|scale|rotate|top|left|right|bottom|inset|width|height|margin|padding|offset|filter|backdropFilter|backdrop-filter|strokeDashoffset|stroke-dashoffset|d|all)$/i;
const isMotion = a => a.kind === 'Animation' || a.props.some(p => MOTION.test(p));
const group = arr => { const m = new Map(); arr.forEach(a => { const k = `${a.name || a.props.join(',')} ${a.target}`; const g = m.get(k) || { n: 0, lo: Infinity, hi: 0, iter: a.iter }; g.n++; g.lo = Math.min(g.lo, a.dur); g.hi = Math.max(g.hi, a.dur); m.set(k, g); });
  return [...m].map(([k, g]) => `${k} ${g.lo === g.hi ? g.lo : g.lo + '–' + g.hi}ms${g.iter === 'inf' ? ' infinite' : ''}${g.n > 1 ? ' ×' + g.n : ''}`); };

// what covers the screen centre (splash/overlay detection)
const CENTRE = () => { const e = document.elementFromPoint(innerWidth / 2, innerHeight / 2); if (!e) return null;
  let a = e; while (a && a !== document.body) { const s = getComputedStyle(a); const r = a.getBoundingClientRect();
    if ((s.position === 'fixed' || s.position === 'absolute') && r.width >= innerWidth * 0.9 && r.height >= innerHeight * 0.9) return (a.id ? '#' + a.id : a.tagName.toLowerCase() + '.' + (a.className || '')).slice(0, 60);
    a = a.parentElement; } return null; };

// ---------- runs ----------
async function newCtx(browser, vp, extra = {}) {
  return browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.hasTouch,
    deviceScaleFactor: vp.deviceScaleFactor, ignoreHTTPSErrors: true, ...extra });
}

async function auditPage(browser, url) {
  const id = slug(url); const R = { url, viewports: {} };
  for (const vp of VIEWPORTS) {
    const ctx = await newCtx(browser, vp); const p = await ctx.newPage();
    const consoleErrs = [], failed = [];
    p.on('console', m => { if (m.type() === 'error') consoleErrs.push(m.text().slice(0, 160)); });
    p.on('pageerror', e => consoleErrs.push('pageerror: ' + e.message.slice(0, 160)));
    p.on('requestfailed', r => failed.push(r.url().slice(0, 120)));
    await p.addInitScript(() => { window.__cls = 0; window.__lcp = 0; window.__long = 0;
      try { new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: 'layout-shift', buffered: true }); } catch (_) {}
      try { new PerformanceObserver(l => l.getEntries().forEach(e => { window.__lcp = e.startTime; })).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (_) {}
      try { new PerformanceObserver(l => l.getEntries().forEach(e => { window.__long += e.duration - 50; })).observe({ type: 'longtask', buffered: true }); } catch (_) {} });
    const t0 = Date.now();
    await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    // splash / overlay timeline + running animations over the first 6s
    const timeline = [];
    for (const at of [300, 1200, 2500, 4000, 6000]) {
      await wait(Math.max(0, at - (Date.now() - t0)));
      timeline.push({ at, overlay: await p.evaluate(CENTRE).catch(() => null), anims: await p.evaluate(ANIMS).catch(() => []) });
    }
    await p.waitForLoadState('load', { timeout: 20000 }).catch(() => {});
    const V = { probes: await p.evaluate(PROBES) };
    const lastOverlay = timeline.filter(t => t.overlay).pop();
    V.splash = timeline[0].overlay ? { el: timeline[0].overlay, goneByMs: lastOverlay && lastOverlay.at === 6000 ? '>6000 (still covering)' : (timeline.find(t => !t.overlay) || {}).at || null } : null;
    const at6 = timeline[timeline.length - 1].anims;
    V.motionRuntime = {
      runningAt: timeline.map(t => `${t.at}ms:${t.anims.length}`).join(' '),
      infiniteOrStillRunningAt6s: group(at6.filter(isMotion)).slice(0, 12),
      longDurations: [...new Map(timeline.flatMap(t => t.anims).filter(a => a.dur > 600).map(a => [a.target + a.name, `${a.target} ${a.name} ${a.dur}ms ${a.easing}`])).values()].slice(0, 12),
      layoutAnimating: [...new Set(timeline.flatMap(t => t.anims).filter(a => a.props.some(x => /^(width|height|top|left|right|bottom|margin|padding|maxHeight)/.test(x))).map(a => `${a.target} [${a.props.join(',')}]`))].slice(0, 10),
    };
    // scroll pass: segment screenshots + animations triggered by scroll
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    const steps = Math.min(SHOTS, Math.ceil(H / vp.height)); const scrollAnimList = []; const shots = [];
    for (let i = 0; i < steps; i++) {
      const y = Math.round(i * (H - vp.height) / Math.max(1, steps - 1));
      await p.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), y); await wait(700);
      scrollAnimList.push(...(await p.evaluate(ANIMS).catch(() => [])).filter(isMotion));
      const f = `shots/${id}-${vp.name}-${String(i + 1).padStart(2, '0')}.png`; await p.screenshot({ path: path.join(OUT, f) }); shots.push(f);
    }
    V.motionRuntime.scrollTriggered = group([...new Map(scrollAnimList.map(a => [a.target + a.name + a.dur, a])).values()]).slice(0, 20); V.shots = shots;
    V.perf = await p.evaluate(() => { const n = performance.getEntriesByType('navigation')[0] || {}; const res = performance.getEntriesByType('resource');
      return { ttfb: Math.round(n.responseStart || 0), dcl: Math.round(n.domContentLoadedEventEnd || 0), load: Math.round(n.loadEventEnd || 0),
        lcp: Math.round(window.__lcp), cls: +window.__cls.toFixed(3), longTaskMs: Math.round(window.__long), requests: res.length,
        kb: Math.round(res.reduce((s, r) => s + (r.transferSize || 0), 0) / 1024),
        fonts: res.filter(r => /\.(woff2?|ttf|otf)(\?|$)/.test(r.name) || /fonts\.g/.test(r.name)).length,
        thirdParty: [...new Set(res.map(r => { try { return new URL(r.name).host; } catch (_) { return ''; } }).filter(h => h && h !== location.host))].slice(0, 15) }; });
    V.consoleErrors = consoleErrs.slice(0, 10); V.failedRequests = failed.slice(0, 10);
    await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })); await wait(300);

    if (vp.name === 'desktop' && AXE) {
      V.axe = await p.evaluate(async src => { eval(src); const r = await axe.run(document, { resultTypes: ['violations'] });
        return r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, help: v.help, sample: v.nodes.slice(0, 2).map(x => x.target.join(' ')) })); }, AXE).catch(e => [{ id: 'axe-error', impact: 'n/a', n: 0, help: e.message.slice(0, 80) }]);
    }
    if (vp.name === 'desktop') {
      // back-button scroll restoration: scroll halfway, follow a same-origin link, go back
      V.backRestore = await (async () => { try {
        const half = await p.evaluate(() => { const y = Math.round(document.documentElement.scrollHeight / 2); window.scrollTo({ top: y, behavior: 'instant' }); return window.scrollY; });
        const href = await p.evaluate(() => { const a = [...document.querySelectorAll('a[href]')].find(a => a.origin === location.origin && !a.hash && a.pathname !== location.pathname && !/\.(pdf|zip|jpe?g|png)$/i.test(a.pathname)); return a && a.href; });
        if (!href || half < 200) return null;
        await p.goto(href, { waitUntil: 'domcontentloaded', timeout: 30000 }); await wait(600); await p.goBack({ waitUntil: 'domcontentloaded', timeout: 30000 }); await wait(1200);
        const back = await p.evaluate(() => window.scrollY); await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })); await wait(300);
        return { leftAt: half, cameBackAt: back, restored: Math.abs(back - half) < 120, via: href };
      } catch (e) { return { error: e.message.split('\n')[0] }; } })();
    }
    if (vp.name === 'desktop') {
      // keyboard pass: focus visibility, obscuring, traps
      const keys = []; let last = null, repeat = 0;
      for (let i = 0; i < 60; i++) {
        await p.keyboard.press('Tab'); await wait(60);
        const f = await p.evaluate(() => { const el = document.activeElement; if (!el || el === document.body) return null;
          const st = e => { const s = getComputedStyle(e); return [s.outlineStyle, s.outlineWidth, s.outlineColor, s.boxShadow, s.backgroundColor, s.borderColor, s.textDecorationLine, s.color].join('|'); };
          const a = st(el); el.blur(); const b = st(el); el.focus({ preventScroll: true });
          const r = el.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          const hit = (cx >= 0 && cy >= 0 && cx < innerWidth && cy < innerHeight) ? document.elementFromPoint(cx, cy) : null;
          let obscuredBy = null; if (hit && hit !== el && !el.contains(hit) && !hit.contains(el)) { let x = hit; while (x && x !== document.body) { const p = getComputedStyle(x).position; if (p === 'fixed' || p === 'sticky') { obscuredBy = x.id ? '#' + x.id : x.tagName.toLowerCase() + '.' + String(x.className).split(' ')[0]; break; } x = x.parentElement; } }
          const n = el.tagName.toLowerCase() + (el.id ? '#' + el.id : el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : '');
          if (!el.dataset.uxa) el.dataset.uxa = String(Math.random()).slice(2, 10);
          return { uid: el.dataset.uxa, el: n, label: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 30), indicator: a !== b, offscreen: r.bottom < 0 || r.top > innerHeight, obscuredBy }; });
        if (!f) continue; if (last && f.uid === last) { if (++repeat >= 3) { keys.push({ trap: f.el }); break; } } else repeat = 0; last = f.uid; keys.push(f);
      }
      V.keyboard = { stops: keys.length, firstStops: keys.slice(0, 6).map(k => k.label || k.el),
        noVisibleIndicator: [...new Set(keys.filter(k => k.indicator === false).map(k => k.el))].slice(0, 12),
        obscured: keys.filter(k => k.obscuredBy).map(k => `${k.el} under ${k.obscuredBy}`).slice(0, 8), trap: (keys.find(k => k.trap) || {}).trap || null };
    }
    if (vp.name === 'mobile') {
      // reflow at 320px and text-spacing override (WCAG 1.4.10 / 1.4.12)
      await p.setViewportSize({ width: 320, height: 640 }); await wait(400);
      V.reflow320 = await p.evaluate(() => { const D = document.documentElement; const over = D.scrollWidth - D.clientWidth;
        const wide = over > 1 ? [...document.querySelectorAll('body *')].filter(e => { const s = getComputedStyle(e); return e.getBoundingClientRect().right > D.clientWidth + 2 && s.position !== 'fixed' && s.visibility !== 'hidden' && +s.opacity > 0; }).slice(0, 6).map(e => e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '') + ' ' + Math.round(e.getBoundingClientRect().width) + 'px') : [];
        return { horizontalOverflowPx: over, offenders: wide }; });
      await p.addStyleTag({ content: '*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}' });
      await wait(300);
      V.textSpacing = await p.evaluate(() => [...document.querySelectorAll('body *')].filter(e => { const s = getComputedStyle(e);
        const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2 && !/rect\(/.test(s.clip) && s.clipPath === 'none' && /hidden|clip/.test(s.overflow + s.overflowY + s.overflowX) && e.innerText && e.innerText.trim().length > 3 && (e.scrollHeight > e.clientHeight + 2 || e.scrollWidth > e.clientWidth + 2); })
        .slice(0, 8).map(e => e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '')));
    }
    R.viewports[vp.name] = V; await ctx.close();
  }
  // reduced motion
  {
    const ctx = await newCtx(browser, VIEWPORTS[2], { reducedMotion: 'reduce' }); const p = await ctx.newPage();
    await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const t = []; for (const at of [300, 2500, 6000]) { await wait(at - (t.length ? [300, 2500, 6000][t.length - 1] : 0)); t.push(await p.evaluate(ANIMS).catch(() => [])); }
    const ov = await p.evaluate(CENTRE).catch(() => null);
    const H = await p.evaluate(() => document.documentElement.scrollHeight); const sc = [];
    for (let i = 1; i <= 4; i++) { await p.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), Math.round(i * H / 5)); await wait(500); sc.push(...(await p.evaluate(ANIMS)).filter(isMotion)); }
    R.reducedMotion = { runningAt: `300ms:${t[0].length} 2500ms:${t[1].length} 6000ms:${t[2].length}`, overlayAt6s: ov,
      stillAnimating: group([...new Map(t.flat().filter(a => a.dur > 0 && isMotion(a)).map(a => [a.target + a.name + a.dur, a])).values()]).slice(0, 12),
      scrollAnimsStillOn: group([...new Map(sc.map(a => [a.target + a.name + a.dur, a])).values()]).slice(0, 12) };
    await ctx.close();
  }
  // no JS
  if (NOJS) {
    const ctx = await newCtx(browser, VIEWPORTS[2], { javaScriptEnabled: false }); const p = await ctx.newPage();
    await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await p.screenshot({ path: path.join(OUT, `shots/${id}-nojs.png`) }).catch(() => {});
    R.noJs = await p.evaluate(() => { const c = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
      let cover = null; for (let a = c; a && a !== document.body; a = a.parentElement) { const s = getComputedStyle(a), r = a.getBoundingClientRect(); if ((s.position === 'fixed' || s.position === 'absolute') && r.width >= innerWidth * .9 && r.height >= innerHeight * .9) { cover = a.id ? '#' + a.id : a.tagName.toLowerCase(); break; } }
      return { visibleTextChars: document.body.innerText.trim().length, fullScreenCover: cover, hiddenByOpacity: [...document.querySelectorAll('h1,h2,p')].filter(e => +getComputedStyle(e).opacity < 0.1).length }; }).catch(e => ({ error: e.message }));
    await ctx.close();
  }
  return R;
}

// ---------- digest ----------
function digest(all) {
  const L = [`# ux-audit digest`, `${new Date().toISOString().slice(0, 10)} · ${all.pages.length} page(s) · viewports 375/768/1440 + 320 reflow · reduced-motion · ${NOJS ? 'no-JS · ' : ''}keyboard (desktop)`, ''];
  const flag = (cond, s) => { if (cond) L.push('- ' + s); };
  for (const R of all.pages) {
    const m = R.viewports.mobile, d = R.viewports.desktop, P = d.probes, Pm = m.probes;
    L.push(`## ${R.url}`, `title "${P.doc.title}" · lang ${P.doc.lang || 'MISSING'} · page length ${(P.doc.height / P.doc.vh).toFixed(1)} screens desktop / ${(Pm.doc.height / Pm.doc.vh).toFixed(1)} mobile`);
    L.push('### Flags');
    flag(!P.doc.lang, 'No <html lang> (3.1.1)');
    flag(Pm.doc.zoomBlocked, `Zoom blocked by viewport meta "${Pm.doc.viewport}" (1.4.4)`);
    flag(P.structure.h1 !== 1, `${P.structure.h1} h1 elements`);
    flag(P.structure.headingSkips.length, `Heading level skips: ${P.structure.headingSkips.join('; ')}`);
    flag(!P.structure.landmarks.main, 'No <main> landmark');
    flag(!P.structure.skipLink, 'No skip link found in first links (2.4.1)');
    flag(P.structure.dupIds.length, `Duplicate ids: ${P.structure.dupIds.join(', ')}`);
    flag(P.structure.positiveTabindex, `${P.structure.positiveTabindex} positive tabindex`);
    const N = P.a11yNames;
    flag(N.imgNoAlt.length, `Images without alt: ${N.imgNoAlt.join(', ')} (1.1.1)`);
    flag(N.linksNoName.length, `Links with no accessible name: ${N.linksNoName.join(', ')} (2.4.4/4.1.2)`);
    flag(N.svgIconButtonsNoName.length, `Icon controls with no name: ${N.svgIconButtonsNoName.join(', ')}`);
    flag(N.linksGeneric.length, `Generic link text: ${N.linksGeneric.join(', ')} (2.4.4)`);
    flag(N.controlsNoName.length, `Controls with no name: ${N.controlsNoName.join(', ')} (4.1.2)`);
    flag(N.placeholderOnlyFields.length, `Placeholder used as label: ${N.placeholderOnlyFields.join(', ')} (3.3.2)`);
    flag(N.missingAutocomplete.length, `Personal-data fields without autocomplete: ${N.missingAutocomplete.join(', ')} (1.3.5)`);
    flag(N.iframesNoTitle, `${N.iframesNoTitle} iframe(s) without title`);
    if (d.axe) { const ax = d.axe.filter(v => v.impact === 'critical' || v.impact === 'serious');
      L.push(`- axe-core: ${d.axe.length} rule violations (${ax.length} serious/critical)${d.axe.length ? ': ' + d.axe.slice(0, 8).map(v => `${v.id}[${v.impact}]×${v.n}`).join(', ') : ''}`); }
    else L.push('- axe-core not installed (npm i axe-core, or set AXE_PATH) — rule-based checks skipped');
    for (const [vpn, V] of [['mobile', m], ['tablet', R.viewports.tablet], ['desktop', d]]) flag(V && V.probes.collisions.length, `Text collisions (${vpn}): ${V && V.probes.collisions.slice(0, 5).join(' | ')}`);
    flag(P.cssIntegrity.length, `CSS syntax: ${P.cssIntegrity.join(' | ')} (later rules may be silently dropped)`);
    flag(d.backRestore && d.backRestore.restored === false, `Back button loses scroll position: left at ${d.backRestore && d.backRestore.leftAt}px, returned at ${d.backRestore && d.backRestore.cameBackAt}px`);
    for (const [vpn, V] of [['desktop', d], ['mobile', m]]) for (const f of V.probes.contrast.failures.slice(0, vpn === 'desktop' ? 12 : 6))
      L.push(`- Contrast ${f.ratio}:1 < ${f.need} (${vpn}) ${f.pair} ×${f.count} — ${f.sample.join(' | ')}`);
    flag(d.probes.contrast.overImageUnverified, `${d.probes.contrast.overImageUnverified} text elements over images: contrast unverified, check screenshots`);
    flag(m.probes.targets.under24, `${m.probes.targets.under24} touch targets <24px on mobile (2.5.8): ${m.probes.targets.samples.slice(0, 6).join('; ')}`);
    L.push(`- Targets <44px on mobile: ${m.probes.targets.under44}/${m.probes.targets.interactive}`);
    if (d.keyboard) { const K = d.keyboard;
      flag(K.noVisibleIndicator.length, `No visible focus change on: ${K.noVisibleIndicator.join(', ')} (2.4.7)`);
      flag(K.obscured.length, `Focus obscured: ${K.obscured.join('; ')} (2.4.11)`);
      flag(K.trap, `Possible keyboard trap at ${K.trap} (2.1.2)`);
      L.push(`- Keyboard: ${K.stops} stops; first: ${K.firstStops.join(' → ')}`); }
    flag(m.reflow320 && m.reflow320.horizontalOverflowPx > 1, `Horizontal scroll at 320px (+${m.reflow320 && m.reflow320.horizontalOverflowPx}px): ${m.reflow320 && m.reflow320.offenders.join(', ')} (1.4.10)`);
    flag(m.textSpacing && m.textSpacing.length, `Clipped under text-spacing override: ${(m.textSpacing || []).join(', ')} (1.4.12)`);
    const T = P.type;
    L.push(`- Type: ${T.families.length} families (${T.families.join(', ')}); ${T.sizes.length} sizes [${T.sizes.join(',')}]; smallest ${T.smallestTextPx}px; ${T.textColors} text colours; body ${T.bodyCharsPerLine.median ?? '–'} chars/line (max ${T.bodyCharsPerLine.max ?? '–'}), line-height ${T.bodyLineHeight ?? '–'}${T.justified ? `; ${T.justified} justified blocks` : ''}`);
    flag(Pm.type.smallestTextPx < 12, `Text as small as ${Pm.type.smallestTextPx}px on mobile`);
    const I = P.images;
    flag(I.noDimensions, `${I.noDimensions} images without width/height (CLS risk)`);
    flag(I.belowFoldNotLazy, `${I.belowFoldNotLazy} below-fold images not lazy-loaded`);
    flag(I.oversized.length, `Oversized images: ${I.oversized.join('; ')}`);
    flag(I.legacyFormats, `${I.legacyFormats} large PNG/JPEG (consider AVIF/WebP)`);
    L.push('### Motion');
    const MS = P.motionStatic, MR = d.motionRuntime;
    L.push(`- System: ${MS.transitionElements} elements with transitions; durations ${MS.durationsMs.join(' ') || 'none'}; easings ${MS.easings.join(' ') || 'none'}`);
    L.push(`- Running animations ${MR.runningAt}${d.splash ? `; full-screen overlay ${d.splash.el} gone by ${d.splash.goneByMs}ms` : ''}`);
    flag(MR.infiniteOrStillRunningAt6s.length, `Still running at 6s (2.2.2 if >5s & parallel to content): ${MR.infiniteOrStillRunningAt6s.join(' | ')}`);
    flag(MR.longDurations.length, `Animations >600ms: ${MR.longDurations.join(' | ')}`);
    flag(MR.layoutAnimating.length || MS.layoutPropertyTransitions.length, `Layout-property animation (jank risk; prefer transform/opacity): ${[...MR.layoutAnimating, ...MS.layoutPropertyTransitions].slice(0, 8).join(' | ')}`);
    flag(MR.scrollTriggered.length, `Scroll-triggered: ${MR.scrollTriggered.slice(0, 10).join(' | ')}`);
    flag(MS.pinnedScrollTracks.length, `Pinned scroll tracks: ${MS.pinnedScrollTracks.map(s => `${s.el} ${s.trackVh} screens`).join(', ')}`);
    flag(MS.customCursor, 'Custom cursor (cursor:none) in use');
    flag(MS.autoplayVideo.length, `Autoplay video: ${JSON.stringify(MS.autoplayVideo)}`);
    flag(MS.gifs, `${MS.gifs} GIF(s): can't honour reduced motion`);
    const RM = R.reducedMotion;
    L.push(`- Reduced motion: ${MS.reducedMotionCssRules} CSS rules${MS.reducedMotionInScripts ? ' + JS checks' : ''}${MS.crossOriginSheetsUnread ? ` (${MS.crossOriginSheetsUnread} cross-origin sheets unread)` : ''}; running ${RM.runningAt}`);
    flag(RM.stillAnimating.length, `Still animating with reduce on: ${RM.stillAnimating.join(' | ')}`);
    flag(RM.scrollAnimsStillOn.length, `Scroll motion with reduce on: ${RM.scrollAnimsStillOn.slice(0, 8).join(' | ')}`);
    flag(RM.overlayAt6s, `Overlay still covering at 6s with reduce on: ${RM.overlayAt6s}`);
    if (R.noJs) { flag(R.noJs.fullScreenCover, `NO-JS: full-screen ${R.noJs.fullScreenCover} covers the page`);
      flag(R.noJs.hiddenByOpacity, `NO-JS: ${R.noJs.hiddenByOpacity} headings/paragraphs stuck at opacity 0 (reveal-on-scroll without fallback)`);
      L.push(`- No-JS: ${R.noJs.visibleTextChars} chars of text visible`); }
    L.push('### Performance');
    for (const [vpn, V] of [['mobile', m], ['desktop', d]]) { const f = V.perf;
      L.push(`- ${vpn}: TTFB ${f.ttfb}ms · DCL ${f.dcl}ms · LCP ${f.lcp}ms · CLS ${f.cls} · long tasks ${f.longTaskMs}ms · ${f.requests} req · ${f.kb}KB · ${f.fonts} font files`); }
    L.push(`- Third parties: ${d.perf.thirdParty.join(', ') || 'none'}`);
    flag(d.consoleErrors.length, `Console errors: ${d.consoleErrors.slice(0, 5).join(' | ')}`);
    flag(d.failedRequests.length, `Failed requests: ${d.failedRequests.slice(0, 5).join(' | ')}`);
    L.push(`### Outline`, P.structure.outline.slice(0, 25).map(h => '- ' + h).join('\n'));
    L.push(`### Screenshots`, Object.values(R.viewports).flatMap(v => v.shots).concat(R.noJs ? [`shots/${slug(R.url)}-nojs.png`] : []).join(' '), '');
  }
  L.push('_Automated flags are leads, not verdicts. Confirm in the screenshots before reporting._');
  return L.join('\n');
}

(async () => {
  const browser = await chromium.launch(launchOpts);
  const all = { start: START, at: new Date().toISOString(), pages: [] };
  for (const u of PAGES) { process.stderr.write(`auditing ${u}\n`); try { all.pages.push(await auditPage(browser, u)); } catch (e) { process.stderr.write(`  failed: ${e.message.split('\n')[0]}\n`); } }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(all, null, 1));
  const dg = digest(all); fs.writeFileSync(path.join(OUT, 'digest.md'), dg);
  console.log(`wrote ${path.join(OUT, 'digest.md')} (${dg.length} chars), report.json, ${fs.readdirSync(path.join(OUT, 'shots')).length} screenshots`);
})();
