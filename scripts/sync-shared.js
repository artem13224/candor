#!/usr/bin/env node
/**
 * sync-shared.js — keeps site-wide snippets identical across every HTML page.
 *
 * What it manages (each block is wrapped in marker comments so re-running is safe):
 *   1. Consent Mode v2 defaults in <head>  (must run before GTM / gtag load)
 *   2. Cookie-consent banner before </body>
 *   3. Footer legal links: Privacy Policy · Terms · Cookie settings
 *   4. Footer business line: © YEAR Candor · Vancouver, BC, Canada
 *   6. Paper-grain texture overlay (images/textures/grain.png)
 *   7. Blog key-point highlighter (<mark> in .article-body) — Article pages only
 *   8. Blog image ink reveal (figure images, masks from make-ink-masks.js) — Article pages only
 *   5. Shared accessibility styles (focus-visible, .sr-only) + a skip link
 *      pointing at id="main-content" (added to <main>, the article header, or
 *      the first <section> if the page has none)
 *
 * Usage:
 *   node scripts/sync-shared.js            # all pages
 *   node scripts/sync-shared.js blog/x.html # one page (publish.js calls this)
 *   node scripts/sync-shared.js --check    # exit 1 if any page is out of date
 */

const fs   = require('fs');
const path = require('path');

const ROOT  = path.resolve(__dirname, '..');
const args  = process.argv.slice(2);
const CHECK = args.includes('--check');
const only  = args.filter(a => !a.startsWith('--'));

// ── Snippets ─────────────────────────────────────────────────────────────────

const HEAD_START = '<!-- candor-consent-default:start -->';
const HEAD_END   = '<!-- candor-consent-default:end -->';
const HEAD_SNIPPET = `${HEAD_START}
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){ dataLayer.push(arguments); }
gtag('consent', 'default', {
  ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
  analytics_storage: 'denied', functionality_storage: 'granted', security_storage: 'granted'
});
try { if (localStorage.getItem('candor-consent') === 'granted') { gtag('consent', 'update', { analytics_storage: 'granted' }); } } catch (e) {}
</script>
${HEAD_END}`;

const A11Y_START = '<!-- candor-a11y:start -->';
const A11Y_END   = '<!-- candor-a11y:end -->';
const A11Y_SNIPPET = `${A11Y_START}
<style>
  /* Footer on phones: a stacked, two-column layout instead of wrapped inline links.
     'footer .x' outranks each page's own '.x' rules, so this wins without !important. */
  /* Nav on phones: the wordmark and the call-to-action must never touch. */
  @media (max-width:720px){
    #site-nav .nav-inner{grid-template-columns:auto minmax(0,1fr) auto;column-gap:12px}
    #site-nav .nav-cta{padding:8px 11px;font-size:10px;letter-spacing:.08em;white-space:nowrap}
    #site-nav .nav-cta .nav-ar{display:none}
    #site-nav .nav-wordmark{font-size:12px;letter-spacing:.18em}
  }
  @media (max-width:360px){#site-nav .nav-wordmark{display:none}}
  @media (max-width:720px){
    footer{padding-top:32px!important;padding-bottom:40px!important}
    body:has(#mob-nav) footer{padding-bottom:124px!important}
    footer .foot-row{flex-direction:column;align-items:flex-start;gap:16px}
    footer .foot-row+.foot-row{margin-top:22px;padding-top:22px}
    footer .foot-nav{display:grid;grid-template-columns:1fr 1fr;gap:14px 24px;width:100%}
    footer .foot-links{display:grid;grid-template-columns:1fr 1fr;gap:14px 24px;width:100%}
    footer .foot-links a:first-child{grid-column:1 / -1}
    footer .foot-copy{margin-top:2px}
    footer .foot-disclaimer{max-width:none}
  }
  :where(a,button,input,select,textarea,summary,[tabindex]):focus-visible{outline:2px solid #3D8A57;outline-offset:3px}
  .skip-link{position:absolute;left:16px;top:-80px;z-index:1000;padding:10px 16px;background:#0D1610;color:#F5F3EE;font:600 12px/1 'Urbanist',system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;border-radius:2px;text-decoration:none;transition:top .2s}
  .skip-link:focus{top:12px;outline-color:#F5F3EE}
  .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
</style>
${A11Y_END}`;
const SKIP_LINK = '<a class="skip-link" href="#main-content">Skip to content</a>';

// Paper grain: a 4 KB tile laid over the page with soft-light blending. Static
// (no animation) so it costs one composited layer and nothing per frame. Off on
// phones, where the blend layer is the one thing that could hurt scrolling.
const GRAIN_START = '<!-- candor-grain:start -->';
const GRAIN_END   = '<!-- candor-grain:end -->';
const GRAIN_SNIPPET = `${GRAIN_START}
<style>
  .candor-grain{position:fixed;inset:0;z-index:500;pointer-events:none;background:url(/images/textures/grain.png) repeat;background-size:160px 160px;opacity:.07;mix-blend-mode:soft-light}
  @media (max-width:720px),print{.candor-grain{display:none}}
</style>
<div class="candor-grain" aria-hidden="true"></div>
${GRAIN_END}`;

// Key-point highlighter for blog posts: any <mark> inside .article-body gets a
// sage-green sweep behind the text as it scrolls into view. Once lit it stays
// lit. No JS → marks show highlighted; reduced motion → no sweep. Only injected
// into pages whose JSON-LD declares "@type": "Article" (posts + template).
const HL_START = '<!-- candor-highlight:start -->';
const HL_END   = '<!-- candor-highlight:end -->';
const HL_SNIPPET = `${HL_START}
<style>
  /* Fallback (no JS): a CSS marker stroke with slanted chisel tips and ink
     pooling at both ends, one stroke per line. */
  .article-body mark{
    color:inherit;background-color:transparent;padding:0 .2em;margin:0 -.12em;
    background-image:linear-gradient(100deg,rgba(90,166,114,0) .8%,rgba(90,166,114,.58) 2.2%,rgba(90,166,114,.38) 6%,rgba(90,166,114,.34) 90%,rgba(90,166,114,.52) 96%,rgba(90,166,114,0) 98.6%);
    background-repeat:no-repeat;background-size:100% 78%;background-position:0 60%;
    -webkit-box-decoration-break:clone;box-decoration-break:clone;
  }
  /* With JS: hand-drawn strokes behind each line, scrubbed by scroll and
     posterised to 12 fps (Vox-style stop motion), boiling while they draw. */
  .hl-js .article-body mark{background:none}
  .hl-host{position:relative;isolation:isolate}
  .hl-stroke{position:absolute;z-index:-1;pointer-events:none;display:block;clip-path:inset(-20% 100% -20% 0)}
  .hl-stroke svg{position:absolute;inset:0;width:100%;height:100%;display:block;overflow:visible}
  .hl-stroke .v{display:none}
  .hl-stroke[data-f="0"] .v0,.hl-stroke[data-f="1"] .v1,.hl-stroke[data-f="2"] .v2{display:inline}
</style>
<script>
(function () {
  var marks = Array.prototype.slice.call(document.querySelectorAll('.article-body mark'));
  if (!marks.length || !document.createRange) return;
  document.documentElement.classList.add('hl-js');
  var INK = '90,166,114', FPS = 12, STEP = 1000 / FPS;
  var REDUCE = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Three hand-drawn chisel-marker bodies: wobbly edges, slanted tips.
  // Cycling them frame to frame while drawing gives the stop-motion "boil".
  var BODIES = [
    'M5,5.5 C48,3.6 101,5.2 152,4.1 C203,3.2 252,5.1 296,3.8 L299.5,9 C300,12.5 299.6,16.4 297,20.6 C246,21.8 196,19.9 147,21.1 C99,22.2 51,20.4 2.5,21.6 L.5,15 C.2,11.6 1.6,8.2 5,5.5 Z',
    'M3.5,6.4 C55,4.8 112,6.1 165,4.6 C214,3.4 258,5.4 297.5,4.9 C299.6,9.6 300,14.8 298.6,19.4 C251,20.9 199,19.2 151,20.5 C97,21.9 48,19.6 1.8,20.9 C.4,16.1 .6,10.9 3.5,6.4 Z',
    'M6,4.7 C46,5.6 95,3.9 149,5 C204,6.1 251,3.9 295.5,5.1 C298.9,8.8 300,13.1 298.4,21.3 C254,20.2 203,21.7 151,20.4 C102,19.3 54,21.4 1.2,20.2 C.3,14.8 2.1,9.4 6,4.7 Z'
  ];
  var STREAKS = [
    ['M7,9.5 C90,8.4 190,10.3 293,8.9', 'M5,16.8 C110,17.6 200,15.9 294,16.9'],
    ['M6,10.2 C95,9.1 185,11 292,9.6', 'M6,16.1 C105,16.9 205,15.2 293,16.3'],
    ['M8,9 C88,9.9 192,8.6 291,9.8', 'M4,17.3 C115,16.5 198,17.8 295,16.6']
  ];
  function variant(i, seed) {
    var k = (i + seed) % 3, st = STREAKS[k];
    return '<g class="v v' + i + '">' +
      '<path d="' + BODIES[k] + '" fill="rgba(' + INK + ',.40)"/>' +
      '<path d="' + st[0] + '" stroke="rgba(' + INK + ',.16)" stroke-width="1.6" fill="none" vector-effect="non-scaling-stroke"/>' +
      '<path d="' + st[1] + '" stroke="rgba(' + INK + ',.14)" stroke-width="1.3" fill="none" vector-effect="non-scaling-stroke"/>' +
      '<path d="M1.2,20.4 L4.6,5.6 L9,5.2 L6.2,20.6 Z" fill="rgba(' + INK + ',.18)"/>' +
      '<path d="M291.4,4.6 L296.8,4.2 L298.6,20.4 L293,20.8 Z" fill="rgba(' + INK + ',.20)"/>' +
      '</g>';
  }
  function svg(seed) {
    return '<svg viewBox="0 0 300 25" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
      variant(0, seed) + variant(1, seed) + variant(2, seed) + '</svg>';
  }
  function lines(mark) {
    var r = document.createRange(); r.selectNodeContents(mark);
    var out = [];
    Array.prototype.forEach.call(r.getClientRects(), function (q) {
      if (q.width < 2 || q.height < 2) return;
      for (var i = 0; i < out.length; i++) {
        var L = out[i];
        if (Math.abs(L.top - q.top) < q.height * 0.5) {
          L.left = Math.min(L.left, q.left); L.right = Math.max(L.right, q.right);
          L.top = Math.min(L.top, q.top); L.bottom = Math.max(L.bottom, q.bottom); return;
        }
      }
      out.push({ left: q.left, right: q.right, top: q.top, bottom: q.bottom });
    });
    return out.sort(function (a, b) { return a.top - b.top; });
  }
  // Build (or rebuild after resize/font load) the strokes for one mark.
  function build(mark) {
    (mark._hl || []).forEach(function (el) { el.remove(); });
    mark._hl = []; mark._w = []; mark._total = 0;
    var host = mark.closest('p,li') || mark.parentElement;
    host.classList.add('hl-host');
    var hr = host.getBoundingClientRect();
    lines(mark).forEach(function (L, i) {
      var h = L.bottom - L.top, w = L.right - L.left, seed = (mark._seed + i) % 3;
      var el = document.createElement('span');
      el.className = 'hl-stroke';
      el.setAttribute('aria-hidden', 'true');
      el.setAttribute('data-f', '0');
      el.innerHTML = svg(seed);
      el.style.left = (L.left - hr.left - 5) + 'px';
      el.style.top = (L.top - hr.top - h * 0.05) + 'px';
      el.style.width = (w + 10) + 'px';
      el.style.height = (h * 1.14) + 'px';
      el.style.transform = 'rotate(' + (seed - 1) * 0.35 + 'deg)';
      host.appendChild(el);
      mark._hl.push(el); mark._w.push(w); mark._total += w;
    });
    mark._shown = -1;
    paint(mark, mark._p || 0, false);
  }
  // Reveal p (0..1) of the mark's total ink, line by line in reading order.
  function paint(mark, p, boil) {
    if (p === mark._shown && !boil) return;
    var acc = 0, drawing = p > 0 && p < 1;
    for (var i = 0; i < mark._hl.length; i++) {
      var w = mark._w[i], local = mark._total ? Math.min(1, Math.max(0, (p * mark._total - acc) / w)) : 0;
      acc += w;
      var el = mark._hl[i];
      el.style.clipPath = 'inset(-20% ' + ((1 - local) * 100).toFixed(2) + '% -20% 0)';
      if (drawing && boil && local > 0 && local < 1.0001) el.setAttribute('data-f', String((+el.getAttribute('data-f') + 1) % 3));
    }
    mark._shown = p;
  }
  // Scroll position → progress: starts as the mark's top crosses 88% of the
  // screen height, fully drawn by 52%. Scrolling back reverses it exactly.
  function target(mark) {
    var vh = window.innerHeight, top = mark.getBoundingClientRect().top;
    return Math.min(1, Math.max(0, (vh * 0.88 - top) / (vh * 0.36)));
  }
  marks.forEach(function (m, i) { m._seed = i; m._p = 0; });
  marks.forEach(build);

  if (REDUCE) { marks.forEach(function (m) { m._p = 1; paint(m, 1, false); }); return; }

  var near = new Set(), raf = 0, lastTick = 0;
  function tick(now) {
    raf = 0;
    if (!near.size) return;
    if (now - lastTick >= STEP - 4) {                 // posterise time: 12 updates a second
      lastTick = now;
      near.forEach(function (m) {
        var p = target(m);
        var moved = Math.abs(p - m._p) > 0.001;
        m._p = p;
        paint(m, p, moved);
      });
    }
    raf = requestAnimationFrame(tick);
  }
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) near.add(e.target); else { near.delete(e.target); var p = target(e.target); e.target._p = p; paint(e.target, p, false); } });
    if (near.size && !raf) raf = requestAnimationFrame(tick);
  }, { rootMargin: '10% 0px 10% 0px' }) : null;
  if (io) marks.forEach(function (m) { io.observe(m); });
  else marks.forEach(function (m) { m._p = 1; paint(m, 1, false); });

  var t; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { marks.forEach(build); }, 150); }, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { marks.forEach(build); });
})();
</script>
${HL_END}`;
const isArticle = html => /"@type"\s*:\s*"Article"/.test(html);

// Ink reveal for blog images: each photo bleeds in through an ink-blot mask as
// it scrolls into view (once), then keeps a brushed, ragged edge. Both masks
// are rendered by scripts/make-ink-masks.js. Fail-safe: masks only switch on
// (html.ink-on) after both files have decoded, so no JS or a missing mask
// means plain photos. Reduced motion → brushed edge, no animation.
const INK_START = '<!-- candor-ink:start -->';
const INK_END   = '<!-- candor-ink:end -->';
const INK_SNIPPET = `${INK_START}
<style>
  .ink-wait :is(.article-img,.article-body figure) img{opacity:0}
  .ink-on :is(.article-img,.article-body figure) img{
    -webkit-mask-image:url(/images/textures/ink-edge.webp),url(/images/textures/ink-reveal.webp);
    mask-image:url(/images/textures/ink-edge.webp),url(/images/textures/ink-reveal.webp);
    -webkit-mask-size:100% 100%,800% 500%;mask-size:100% 100%,800% 500%;
    -webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;
    -webkit-mask-position:0 0,var(--ink-x,0%) var(--ink-y,0%);mask-position:0 0,var(--ink-x,0%) var(--ink-y,0%);
    -webkit-mask-composite:source-in;mask-composite:intersect;
    border-color:transparent;
  }
  .ink-on :is(.article-img,.article-body figure) img.ink-done{
    -webkit-mask-image:url(/images/textures/ink-edge.webp);mask-image:url(/images/textures/ink-edge.webp);
    -webkit-mask-size:100% 100%;mask-size:100% 100%;-webkit-mask-position:0 0;mask-position:0 0;
  }
  @media print{
    .ink-wait :is(.article-img,.article-body figure) img{opacity:1}
    .ink-on :is(.article-img,.article-body figure) img{-webkit-mask:none;mask:none}
  }
</style>
<script>
(function () {
  var imgs = Array.prototype.slice.call(document.querySelectorAll('.article-img img, .article-body figure img'));
  if (!imgs.length || !window.Promise) return;
  var root = document.documentElement, EDGE = '/images/textures/ink-edge.webp', REVEAL = '/images/textures/ink-reveal.webp';
  var COLS = 8, ROWS = 5, FRAMES = COLS * ROWS, STEP = 50;   // posterised: one frame every 50 ms (~20 fps)
  var START = 5;   // frame 0 is the hidden pre-state and 1–4 are blank, so play from the first visible ink
  var REDUCE = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('ink-wait');
  var released = false;
  function release() { released = true; root.classList.remove('ink-wait'); }
  var bail = setTimeout(release, 4000);                // masks too slow or missing: plain photos
  function load(src) {
    return new Promise(function (res, rej) {
      var i = new Image();
      i.onload = function () { (i.decode ? i.decode() : Promise.resolve()).then(res, res); };
      i.onerror = rej; i.src = src;
    });
  }
  function frame(img, f) {
    img.style.setProperty('--ink-x', (f % COLS) / (COLS - 1) * 100 + '%');
    img.style.setProperty('--ink-y', Math.floor(f / COLS) / (ROWS - 1) * 100 + '%');
  }
  function done(img) { img.classList.add('ink-done'); img.style.removeProperty('--ink-x'); img.style.removeProperty('--ink-y'); }
  function ready(img) {                                // never let the ink reveal a blank box
    if (img.complete) return img.decode ? img.decode().catch(function () {}) : Promise.resolve();
    return new Promise(function (res) { img.addEventListener('load', res, { once: true }); img.addEventListener('error', res, { once: true }); });
  }
  function play(img) {
    ready(img).then(function () {
      if (!img.naturalWidth) { done(img); return; }
      var t0 = 0, shown = -1;
      (function step(now) {
        if (!t0) t0 = now;
        var f = Math.min(FRAMES - 1, START + Math.floor((now - t0) / STEP));
        if (f !== shown) { shown = f; frame(img, f); }
        if (f < FRAMES - 1) requestAnimationFrame(step); else done(img);
      })(performance.now());
    });
  }
  Promise.all([load(EDGE), load(REVEAL)]).then(function () {
    if (released) return;                              // timed out: leave the photos plain
    clearTimeout(bail);
    if (REDUCE || !('IntersectionObserver' in window)) imgs.forEach(done);
    root.classList.add('ink-on'); root.classList.remove('ink-wait');
    if (REDUCE || !('IntersectionObserver' in window)) return;
    // One screen ahead: fetch and decode lazy photos early, so the ink never waits on the network
    var warm = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var img = e.target; warm.unobserve(img);
        if (img.loading === 'lazy') img.loading = 'eager';
        if (img.decode) img.decode().catch(function () {});
      });
    }, { rootMargin: '0px 0px 100% 0px' });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); play(e.target); } });
    }, { rootMargin: '0px 0px -5% 0px' });
    imgs.forEach(function (img) { warm.observe(img); io.observe(img); });
  }, release);
})();
</script>
${INK_END}`;

const BODY_START = '<!-- candor-consent:start -->';
const BODY_END   = '<!-- candor-consent:end -->';
const BODY_SNIPPET = `${BODY_START}
<div id="cc-banner" class="cc-banner" role="dialog" aria-modal="false" aria-labelledby="cc-title" aria-describedby="cc-desc" hidden>
  <p id="cc-title" class="cc-title">Cookies &amp; analytics</p>
  <p id="cc-desc" class="cc-desc">Candor uses Google Analytics to see which pages are useful. Analytics cookies stay off until you accept, and the site works the same either way. <a href="/privacy-policy/#cookies">How we use data</a></p>
  <div class="cc-actions">
    <button type="button" class="cc-btn cc-accept" data-cc="granted">Accept analytics</button>
    <button type="button" class="cc-btn cc-decline" data-cc="denied">Decline</button>
  </div>
</div>
<style>
  .cc-banner{position:fixed;left:16px;right:16px;bottom:16px;z-index:900;max-width:400px;margin-left:0;padding:18px 20px 16px;background:#F5F3EE;color:#0D1610;border:1px solid #C8C3B5;border-radius:4px;box-shadow:0 18px 50px -20px rgba(13,22,16,.45);font-family:'Open Sans',system-ui,sans-serif;font-size:13.5px;line-height:1.55;opacity:0;transform:translateY(12px);transition:opacity .35s ease,transform .45s cubic-bezier(.16,1,.3,1)}
  .cc-banner.cc-in{opacity:1;transform:none}
  .cc-banner[hidden]{display:none}
  .cc-title{margin:0 0 6px;font-family:'Urbanist',system-ui,sans-serif;font-weight:700;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#2D6B42}
  .cc-desc{margin:0 0 14px;color:#4A5548}
  .cc-desc a{color:#0D1610;text-decoration:underline;text-underline-offset:2px}
  .cc-actions{display:flex;gap:8px;flex-wrap:wrap}
  .cc-btn{font-family:'Urbanist',system-ui,sans-serif;font-weight:600;font-size:11px;letter-spacing:.12em;text-transform:uppercase;padding:10px 16px;border-radius:2px;border:1px solid #0D1610;cursor:pointer;transition:background .25s,color .25s}
  .cc-accept{background:#0D1610;color:#F5F3EE}
  .cc-accept:hover{background:#2D6B42;border-color:#2D6B42}
  .cc-decline{background:transparent;color:#0D1610}
  .cc-decline:hover{background:#E4E1D6}
  .cc-btn:focus-visible,.cc-desc a:focus-visible{outline:2px solid #2D6B42;outline-offset:2px}
  @media (prefers-reduced-motion: reduce){.cc-banner{transition:none;transform:none}}
  @media (min-width:640px){.cc-banner{left:24px;bottom:24px;right:auto}}
</style>
<script>
(function () {
  var KEY = 'candor-consent';
  var banner = document.getElementById('cc-banner');
  if (!banner) return;
  function read()  { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function write(v){ try { localStorage.setItem(KEY, v); } catch (e) {} }
  function apply(v){
    if (typeof gtag === 'function') gtag('consent', 'update', { analytics_storage: v });
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: 'candor_consent', consent_state: v });
  }
  function show(){ banner.hidden = false; requestAnimationFrame(function(){ banner.classList.add('cc-in'); }); banner.querySelector('.cc-accept').focus({ preventScroll: true }); }
  function hide(){ banner.classList.remove('cc-in'); setTimeout(function(){ banner.hidden = true; }, 300); }
  banner.addEventListener('click', function (e) {
    var b = e.target.closest('[data-cc]'); if (!b) return;
    var v = b.getAttribute('data-cc'); write(v); apply(v); hide();
  });
  banner.addEventListener('keydown', function (e) { if (e.key === 'Escape') { write('denied'); apply('denied'); hide(); } });
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-consent-open]'); if (!a) return;
    e.preventDefault(); show();
  });
  window.candorConsent = { open: show, state: read };
  var saved = read();
  if (saved === 'granted' || saved === 'denied') return;          // head snippet already applied it
  if (navigator.globalPrivacyControl === true) { write('denied'); return; } // honour GPC silently
  setTimeout(show, 900);
})();
</script>
${BODY_END}`;

const FOOT_LINKS_RE = /(<div class="foot-links">)([\s\S]*?)(<\/div>)/;
const LEGAL_LINKS = `<a href="/privacy-policy/">Privacy Policy</a>
      <a href="/terms/">Terms</a>
      <a href="/privacy-policy/#cookies" data-consent-open>Cookie settings</a>`;

const YEAR = new Date().getFullYear();
const FOOT_COPY_RE = /<div class="foot-copy">[^<]*<\/div>/;
const FOOT_COPY = `<div class="foot-copy">© ${YEAR} Candor · Vancouver, BC, Canada</div>`;

// ── Page discovery ────────────────────────────────────────────────────────────

function listPages() {
  const out = [];
  const skip = new Set(['node_modules', '.git', 'Brand Guide', 'scripts', '.claude']);
  (function walk(dir) {
    for (const f of fs.readdirSync(dir)) {
      if (skip.has(f)) continue;
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (f.endsWith('.html') && !/^google[0-9a-f]+\.html$/.test(f)) out.push(p);
    }
  })(ROOT);
  return out;
}

// ── Transform ────────────────────────────────────────────────────────────────

function replaceBetween(html, start, end, snippet) {
  const a = html.indexOf(start), b = html.indexOf(end);
  if (a !== -1 && b !== -1) return html.slice(0, a) + snippet + html.slice(b + end.length);
  return null;
}

// Add/refresh a block on Article pages (just before the grain block); strip it elsewhere.
function articleBlock(html, article, start, end, snippet) {
  const replaced = replaceBetween(html, start, end, snippet);
  if (article) return replaced || html.replace(GRAIN_START, `${snippet}\n${GRAIN_START}`);
  if (!replaced) return html;
  const a = html.indexOf(start), b = html.indexOf(end) + end.length;
  return html.slice(0, a) + html.slice(b).replace(/^\n/, '');
}

function transform(html) {
  let out = html;

  // 1. Head consent defaults — immediately after <head>
  const replacedHead = replaceBetween(out, HEAD_START, HEAD_END, HEAD_SNIPPET);
  if (replacedHead) out = replacedHead;
  else out = out.replace(/<head([^>]*)>/i, m => `${m}\n${HEAD_SNIPPET}`);

  // 1b. Shared accessibility styles — right after the consent defaults
  const replacedA11y = replaceBetween(out, A11Y_START, A11Y_END, A11Y_SNIPPET);
  if (replacedA11y) out = replacedA11y;
  else out = out.replace(HEAD_END, `${HEAD_END}\n${A11Y_SNIPPET}`);

  // 1c. Skip link + main-content target
  if (!out.includes('class="skip-link"')) {
    out = out.replace(/<body([^>]*)>/i, m => `${m}\n${SKIP_LINK}`);
  }
  if (!out.includes('id="main-content"')) {
    const targets = [/<main(?![^>]*\bid=)/i, /<header class="article-header"/i, /<section(?![^>]*\bid="screen)/i];
    let placed = false;
    for (const re of targets) {
      if (re.test(out)) { out = out.replace(re, m => `${m} id="main-content" tabindex="-1"`); placed = true; break; }
    }
    // Pages whose first section already carries an id (e.g. the assessment screens):
    // drop an invisible, focusable anchor in front of it instead.
    if (!placed) out = out.replace(/<section\b/i, '<div id="main-content" tabindex="-1"></div>\n<section');
  }

  // 1d. Paper grain overlay — right before the consent banner
  const replacedGrain = replaceBetween(out, GRAIN_START, GRAIN_END, GRAIN_SNIPPET);
  if (replacedGrain) out = replacedGrain;
  else out = out.replace(/<\/body>/i, `${GRAIN_SNIPPET}\n</body>`);

  // 1e. Blog-only blocks (highlighter, then ink reveal) — posts only, before the grain/banner blocks
  const article = isArticle(out);
  out = articleBlock(out, article, HL_START, HL_END, HL_SNIPPET);
  out = articleBlock(out, article, INK_START, INK_END, INK_SNIPPET);

  // 2. Banner — before </body>
  const replacedBody = replaceBetween(out, BODY_START, BODY_END, BODY_SNIPPET);
  if (replacedBody) out = replacedBody;
  else out = out.replace(/<\/body>/i, `${BODY_SNIPPET}\n</body>`);

  // 3. Footer legal links
  out = out.replace(FOOT_LINKS_RE, (m, open, inner, close) => {
    const cleaned = inner
      .replace(/\s*<a href="\/privacy-policy\/">Privacy Policy<\/a>/, '')
      .replace(/\s*<a href="\/terms\/">Terms<\/a>/, '')
      .replace(/\s*<a href="\/privacy-policy\/#cookies" data-consent-open>Cookie settings<\/a>/, '')
      .replace(/\s+$/, '');
    return `${open}${cleaned}\n      ${LEGAL_LINKS}\n    ${close}`;
  });

  // 4. Footer business line
  out = out.replace(FOOT_COPY_RE, FOOT_COPY);

  return out;
}

// ── Run ───────────────────────────────────────────────────────────────────────

const pages = only.length ? only.map(p => path.resolve(p)) : listPages();
let changed = 0;

for (const file of pages) {
  const html = fs.readFileSync(file, 'utf8');
  const next = transform(html);
  if (next === html) continue;
  changed++;
  const rel = path.relative(ROOT, file);
  if (CHECK) { console.log(`✗ out of date: ${rel}`); continue; }
  fs.writeFileSync(file, next, 'utf8');
  console.log(`✓ synced ${rel}`);
}

if (CHECK && changed) process.exit(1);
if (!changed) console.log('All pages already in sync.');
