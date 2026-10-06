#!/usr/bin/env node
/**
 * sync-shared.js — keeps site-wide snippets identical across every HTML page.
 *
 * What it manages (each block is wrapped in marker comments so re-running is safe):
 *   1. Consent Mode v2 defaults in <head>  (must run before GTM / gtag load)
 *   2. Cookie-consent banner before </body>
 *   3. The site footer (brand + pitch + CTAs, link columns, legal row with
 *      Privacy Policy · Terms · Cookie settings, © YEAR, disclaimer)
 *   6. Paper-grain texture overlay (images/textures/grain.png)
 *   7. Blog key-point highlighter (<mark> in .article-body) — Article pages only
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
  /* Nav at tablet widths: the links tighten, then step aside, so the call-to-action never wraps or spills off screen. */
  #site-nav .nav-cta{white-space:nowrap}
  @media (max-width:1100px){#site-nav .nav-links{padding-left:16px}#site-nav .nav-link{padding:6px 8px;letter-spacing:.1em}}
  @media (max-width:940px){#site-nav .nav-links{display:none}#site-nav .nav-cta-wrap{grid-column:3;justify-self:end}}
  /* Nav on phones: the wordmark and the call-to-action must never touch. */
  @media (max-width:720px){
    #site-nav .nav-inner{grid-template-columns:auto minmax(0,1fr) auto;column-gap:12px}
    #site-nav .nav-cta{padding:8px 11px;font-size:10px;letter-spacing:.08em;white-space:nowrap}
    #site-nav .nav-cta .nav-ar{display:none}
    #site-nav .nav-wordmark{font-size:12px;letter-spacing:.18em}
  }
  @media (max-width:360px){#site-nav .nav-wordmark{display:none}}
  :where(a,button,input,select,textarea,summary,[tabindex]):focus-visible{outline:2px solid #3D8A57;outline-offset:3px}
  .skip-link{position:absolute;left:16px;top:-80px;z-index:1000;padding:10px 16px;background:#0D1610;color:#F5F3EE;font:600 12px/1 'Urbanist',system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;border-radius:2px;text-decoration:none;transition:top .2s}
  .skip-link:focus{top:12px;outline-color:#F5F3EE}
  .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
  /* custom dot cursor: text fields keep the real I-beam, and a light ring keeps the dot visible on dark sections */
  @media (pointer:fine){input:not([type=checkbox]):not([type=radio]),textarea{cursor:text!important}#cur{box-shadow:0 0 0 1.5px rgba(245,243,238,.85)}}
  /* the logo link gets a 44px-tall hit area without moving the nav */
  .nav-logo{padding-block:11px;margin-block:-11px}
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
  @media (max-width:639px){.cc-banner{left:12px;right:12px;bottom:12px;padding:12px 14px;font-size:13px;line-height:1.45}.cc-title{display:inline;margin:0 6px 0 0;font-size:10px}.cc-desc{display:inline}.cc-actions{margin-top:10px;flex-wrap:nowrap}.cc-btn{flex:1;padding:12px 8px}}
  @media (min-width:640px){.cc-banner{left:24px;bottom:24px;right:auto}}
  /* while the banner is open, keyboard focus scrolls clear of it instead of landing underneath */
  html.cc-open{scroll-padding-bottom:var(--cc-h,0px)}
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
  /* --cc-h lets fixed page UI (e.g. the mobile nav pill) sit above the banner while it is open */
  /* the banner never takes focus on its own: Accept and Decline stay equal, and keyboard users start at the skip link */
  var root = document.documentElement;
  function show(){ banner.hidden = false; root.classList.add('cc-open'); requestAnimationFrame(function(){ banner.classList.add('cc-in'); root.style.setProperty('--cc-h', (banner.offsetHeight + 16) + 'px'); }); }
  function hide(){ banner.classList.remove('cc-in'); root.classList.remove('cc-open'); root.style.removeProperty('--cc-h'); setTimeout(function(){ banner.hidden = true; }, 300); }
  banner.addEventListener('click', function (e) {
    var b = e.target.closest('[data-cc]'); if (!b) return;
    var v = b.getAttribute('data-cc'); write(v); apply(v); hide();
  });
  banner.addEventListener('keydown', function (e) { if (e.key === 'Escape') { write('denied'); apply('denied'); hide(); } });
  // keyboard focus that lands under the open banner is scrolled clear of it (scroll-padding alone skips elements already on screen)
  document.addEventListener('focusin', function (e) {
    if (banner.hidden || banner.contains(e.target) || e.target === document.body) return;
    var a = e.target.getBoundingClientRect(), b = banner.getBoundingClientRect();
    if (a.bottom > b.top - 8 && a.top < b.bottom && a.right > b.left && a.left < b.right) window.scrollBy({ top: a.bottom - b.top + 16, behavior: 'instant' });
  });
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

// The site footer, identical on every page. Replaces the page's <footer> on the first run, then the marker block.
const FOOT_START = '<!-- candor-footer:start -->';
const FOOT_END   = '<!-- candor-footer:end -->';
const YEAR = new Date().getFullYear();
const CALENDLY = 'https://calendly.com/artemfurman/30min';
const FOOTER_SNIPPET = `${FOOT_START}
<style>
  footer.cf{position:relative;overflow:hidden;background:#0B0F0C;color:rgba(245,243,238,.72);border-top:1px solid rgba(245,243,238,.06);
    padding:clamp(56px,7vw,96px) clamp(20px,5vw,80px) 30px;font-family:'Open Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
  .cf-in{position:relative;z-index:1;max-width:1200px;margin:0 auto}
  .cf-top{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,2fr);gap:clamp(40px,7vw,110px)}
  .cf-brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:#F5F3EE;margin-bottom:26px}
  .cf-logo{width:26px;height:26px;flex-shrink:0}
  .cf-word{font:800 13px/1 'Urbanist',system-ui,sans-serif;letter-spacing:.24em;text-transform:uppercase}
  .cf-pitch{margin:0 0 28px;max-width:21ch;font:300 clamp(22px,2.2vw,30px)/1.25 'Urbanist',system-ui,sans-serif;letter-spacing:-.015em;color:#F5F3EE}
  .cf-pitch em{font-style:italic;color:#7CC08F}
  .cf-sub{margin:-12px 0 28px;font-size:14px;line-height:1.6;color:rgba(245,243,238,.55);max-width:36ch}
  .cf-ctas{display:flex;flex-wrap:wrap;gap:10px}
  .cf-btn{display:inline-flex;align-items:center;gap:8px;padding:13px 20px;border-radius:2px;font:600 11px/1 'Urbanist',system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;text-decoration:none;transition:background .25s,color .25s,border-color .25s}
  .cf-btn-p{background:#F5F3EE;color:#0E110D}
  .cf-btn-p:hover{background:#5AA672;color:#0E110D}
  .cf-btn-s{border:1px solid rgba(245,243,238,.22);color:rgba(245,243,238,.85)}
  .cf-btn-s:hover{border-color:rgba(245,243,238,.6);color:#F5F3EE}
  .cf-cols{display:flex;justify-content:flex-end;align-items:flex-start;gap:clamp(56px,8vw,120px)}
  .cf-h{margin:4px 0 16px;font:600 11px/1 'Urbanist',system-ui,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#5AA672}
  .cf-col ul{list-style:none;margin:0;padding:0}
  .cf-col li{margin:0}
  .cf-col a{display:inline-block;padding:6px 0;font-size:14.5px;line-height:1.4;color:rgba(245,243,238,.72);text-decoration:none;transition:color .2s}
  .cf-col a:hover{color:#F5F3EE;text-decoration:underline;text-underline-offset:4px;text-decoration-color:rgba(124,192,143,.7)}
  .cf-bot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px 24px;margin-top:clamp(48px,6vw,80px);padding-top:22px;border-top:1px solid rgba(245,243,238,.08);font-size:12.5px;color:rgba(245,243,238,.5)}
  .cf-legal{display:flex;flex-wrap:wrap;gap:6px 22px}
  .cf-legal a{display:inline-block;padding:4px 0;color:rgba(245,243,238,.6);text-decoration:none}
  .cf-legal a:hover{color:#F5F3EE;text-decoration:underline;text-underline-offset:3px}
  .cf-disc{margin:16px 0 0;max-width:none;font-size:11.5px;line-height:1.65;color:rgba(245,243,238,.55)}
  /* the faint wordmark is drawn from a pseudo-element: pure decoration, so it is not text to contrast checkers or AT */
  .cf-mark::before{content:attr(data-word)}
  .cf-mark{position:relative;z-index:0;display:block;margin:clamp(28px,4vw,48px) auto -.18em;max-width:1200px;font:800 clamp(64px,17vw,220px)/.8 'Urbanist',system-ui,sans-serif;letter-spacing:-.05em;color:rgba(245,243,238,.035);user-select:none;pointer-events:none;white-space:nowrap}
  @media (max-width:820px){
    .cf-top{grid-template-columns:1fr;gap:44px}
    .cf-cols{display:grid;grid-template-columns:1fr 1fr;gap:30px 20px;justify-content:start}
  }
  @media (max-width:520px){
    footer.cf{padding-top:56px}
    .cf-ctas{flex-direction:column}
    .cf-btn{justify-content:center;padding:15px 20px}
    .cf-bot{flex-direction:column;align-items:flex-start}
  }
  body:has(#mob-nav) footer.cf{padding-bottom:120px}
  .cf-dlg{position:fixed;inset:0;margin:auto;height:fit-content;width:min(480px,calc(100vw - 32px));max-height:calc(100dvh - 32px);padding:0;border:0;border-radius:6px;background:#F5F3EE;color:#0E110D;box-shadow:0 30px 80px -20px rgba(0,0,0,.45)}
  .cf-dlg,.cf-dlg *{cursor:auto!important}
  .cf-dlg input,.cf-dlg textarea{cursor:text!important}
  .cf-dlg button,.cf-dlg a,.cf-dlg label{cursor:pointer!important}
  html:has(.cf-dlg[open]) #cur,html:has(.cf-dlg[open]) #cur2{display:none!important}
  html:has(.cf-dlg[open]) body{cursor:auto!important}
  .cf-dlg::backdrop{background:rgba(11,15,12,.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}
  .cf-dlg form,.cf-done{padding:30px clamp(20px,5vw,34px) 28px}
  .cf-dlg h2{margin:0 0 6px;font:800 26px/1.1 'Urbanist',system-ui,sans-serif;letter-spacing:-.02em}
  .cf-dlg h2 em{font-style:italic;font-weight:300;color:#2D6B42}
  .cf-dlg p{margin:0 0 20px;font:400 14px/1.6 'Open Sans',system-ui,sans-serif;color:#4A5548}
  .cf-dlg label{display:block;margin:0 0 6px;font:600 11px/1 'Urbanist',system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#4A5548}
  .cf-dlg input,.cf-dlg textarea{box-sizing:border-box;width:100%;margin:0 0 16px;padding:12px 14px;border:1px solid #C8C3B5;border-radius:3px;background:#fff;font:400 15px/1.4 'Open Sans',system-ui,sans-serif;color:#0E110D}
  .cf-dlg textarea{min-height:120px;resize:vertical}
  .cf-dlg input:focus,.cf-dlg textarea:focus{outline:2px solid #3D8A57;outline-offset:1px;border-color:#3D8A57}
  .cf-hp{position:absolute;left:-9999px}
  .cf-send{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}
  .cf-dlg .cf-btn-p{background:#0E110D;color:#F5F3EE;border:0;cursor:pointer}
  .cf-dlg .cf-btn-p:hover{background:#2D6B42;color:#F5F3EE}
  .cf-dlg .cf-btn-p[disabled]{opacity:.6;cursor:progress}
  .cf-small{font:400 12px/1.5 'Open Sans',system-ui,sans-serif;color:#5E6E5E}
  .cf-small a{color:#2D6B42}
  .cf-x{position:absolute;top:10px;right:10px;width:36px;height:36px;border:0;border-radius:50%;background:transparent;font:400 22px/1 system-ui,sans-serif;color:#4A5548;cursor:pointer}
  .cf-x:hover{background:#E4E1D6}
  .cf-err{display:none;margin:0 0 14px;font:400 13px/1.5 'Open Sans',system-ui,sans-serif;color:#8A3B2E}
  .cf-dlg.is-err .cf-err{display:block}
  .cf-err a{color:inherit;text-decoration:underline;text-underline-offset:2px}
  .cf-done{display:none}
  .cf-dlg.is-done form{display:none}
  .cf-dlg.is-done .cf-done{display:block}
</style>
<footer class="cf">
  <div class="cf-in">
    <div class="cf-top">
      <div>
        <a class="cf-brand" href="/" aria-label="Candor home"><svg class="cf-logo" viewBox="30 90 340 235" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M361.78,207.28c5.13,58.78-55.13,92.95-104.46,106.03-52.16,13.84-109.97,9.36-158.44-14.89-28.13-14.14-52.66-40.01-54.67-72.76-1.93-27.64,9.72-54.51,24.88-77.04,14.39-21.2,34.99-38.54,59.16-47.38,42.18-15.78,88.35-7.24,130.64,3.83,53.37,14.34,100.53,40.86,102.89,102.05v.17h0Z" fill="rgba(245,243,238,.06)"/><path d="M321.02,197.81c11.14,65.3-91.48,105.45-143.3,96.47-41.63-6.39-67.99-44.63-77.8-82.84-12.27-41.61,20.46-81.5,59.84-92.24,28.29-8.96,59.78-4.52,86.28,7.76,29.65,14.63,68.91,30.87,74.98,70.85Z" fill="none" stroke="rgba(245,243,238,.5)" stroke-width="8.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M278.88,203c-.9,12-9.27,25.3-19.12,34.4-15.51,14.36-36.52,23.05-57.76,24.2-22.86,1.15-44.01-8.83-54-29.92-5.74-12.41-10.57-27.81-8.28-41.48,2.66-16.33,16.88-27.62,31.28-34.12,16.85-7.68,35.85-11.88,54.44-9.48,20.71,2.64,40.9,15.33,48.84,35,2.78,6.87,5.5,9.4,4.6,21.4h0Z" fill="none" stroke="rgba(245,243,238,.5)" stroke-width="8.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M252.28,194.62c-.78,8.99-6.66,16.34-14.5,21.5-11.97,7.77-28.52,8.76-41.54,2.93-11.21-4.79-20.29-17.1-16.39-29.46,3.42-10.5,13.59-15.89,23.96-19.28,12.09-3.77,26.07-5.19,36.83,1.94,7.24,4.8,12.41,13.4,11.66,22.18v.18h-.02Z" fill="none" stroke="rgba(245,243,238,.5)" stroke-width="8.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="216.48" cy="194.16" r="4.55" fill="#5AA672"/></svg><span class="cf-word">Candor</span></a>
        <p class="cf-pitch">B Corp certification for small businesses, <em>without the guesswork.</em></p>
        <p class="cf-sub">Flat fees and one consultant, working online from Vancouver, BC.</p>
        <div class="cf-ctas">
          <a class="cf-btn cf-btn-p" href="${CALENDLY}" target="_blank" rel="noopener noreferrer">Book a free call <span aria-hidden="true">→</span></a>
          <a class="cf-btn cf-btn-s" href="/assessment/">Free readiness score</a>
        </div>
      </div>
      <nav class="cf-cols" aria-label="Footer">
        <div class="cf-col">
          <h2 class="cf-h">Navigate</h2>
          <ul>
            <li><a href="/#who">Who it's for</a></li>
            <li><a href="/#process">How it works</a></li>
            <li><a href="/#services">Services &amp; pricing</a></li>
            <li><a href="/#about">About</a></li>
            <li><a href="/#faq">FAQ</a></li>
          </ul>
        </div>
        <div class="cf-col">
          <h2 class="cf-h">Resources</h2>
          <ul>
            <li><a href="/blog/">Field notes</a></li>
            <li><a href="/assessment/">Readiness score</a></li>
            <li><a href="mailto:candorcertified@gmail.com" data-contact-open>Contact</a></li>
          </ul>
        </div>
      </nav>
    </div>
    <div class="cf-bot">
      <div>© ${YEAR} Candor · Vancouver, BC</div>
      <div class="cf-legal">
        <a href="/privacy-policy/">Privacy Policy</a>
        <a href="/terms/">Terms</a>
        <a href="/privacy-policy/#cookies" data-consent-open>Cookie settings</a>
        <a href="https://linkedin.com/company/candorcertified" target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>
      </div>
    </div>
    <p class="cf-disc">Candor provides independent B Corp and sustainability certification advisory services and is not affiliated with, endorsed by, or a part of B Lab, The Change Climate Project (The Climate Label), or 1% for the Planet.</p>
  </div>
  <span class="cf-mark" aria-hidden="true" data-word="Candor"></span>
</footer>
<dialog class="cf-dlg" id="cf-contact" aria-labelledby="cf-contact-title">
  <button class="cf-x" type="button" aria-label="Close" data-contact-close>×</button>
  <form name="contact" method="POST" action="/" data-netlify="true" netlify-honeypot="bot-field">
    <input type="hidden" name="form-name" value="contact">
    <p class="cf-hp" aria-hidden="true"><label>Leave this empty <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>
    <h2 id="cf-contact-title">Send a <em>note.</em></h2>
    <p>A question about certification, your business, or anything on the site. I read every message and reply by email.</p>
    <label for="cf-name">Name</label>
    <input id="cf-name" name="name" autocomplete="name" required>
    <label for="cf-email">Email</label>
    <input id="cf-email" name="email" type="email" autocomplete="email" required>
    <label for="cf-msg">Message</label>
    <textarea id="cf-msg" name="message" required></textarea>
    <p class="cf-err" role="alert">That didn't send. Please email <a href="mailto:candorcertified@gmail.com">candorcertified@gmail.com</a> instead.</p>
    <div class="cf-send">
      <button class="cf-btn cf-btn-p" type="submit">Send message <span aria-hidden="true">→</span></button>
      <span class="cf-small">Used only to reply to you. <a href="/privacy-policy/">Privacy</a></span>
    </div>
  </form>
  <div class="cf-done" role="status">
    <h2>Thanks, <em>got it.</em></h2>
    <p>Your message is on its way. I'll reply by email.</p>
    <button class="cf-btn cf-btn-p" type="button" data-contact-close>Close</button>
  </div>
</dialog>
<script>
(function () {
  // on the assessment itself, the footer's "Free readiness score" button would only link back to this page
  if (location.pathname === '/assessment/' || location.pathname === '/assessment') { var self = document.querySelector('.cf-btn-s[href="/assessment/"]'); if (self) self.remove(); }
  var dlg = document.getElementById('cf-contact');
  if (!dlg || typeof dlg.showModal !== 'function') return;          // very old browsers keep the mailto link
  var form = dlg.querySelector('form'), btn = form.querySelector('[type=submit]');
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-contact-open]')) { e.preventDefault(); dlg.classList.remove('is-done', 'is-err'); dlg.showModal(); }
    else if (e.target.closest('[data-contact-close]') || e.target === dlg) dlg.close();
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault(); btn.disabled = true; dlg.classList.remove('is-err');
    fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(new FormData(form)).toString() })
      .then(function (r) { if (!r.ok) throw r; form.reset(); dlg.classList.add('is-done'); })
      .catch(function () { dlg.classList.add('is-err'); })
      .then(function () { btn.disabled = false; });
  });
})();
</script>
${FOOT_END}`;

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

  // 1e. Blog-only block (highlighter) — posts only, before the grain/banner blocks
  const article = isArticle(out);
  out = articleBlock(out, article, HL_START, HL_END, HL_SNIPPET);

  // 2. Banner — before </body>
  const replacedBody = replaceBetween(out, BODY_START, BODY_END, BODY_SNIPPET);
  if (replacedBody) out = replacedBody;
  else out = out.replace(/<\/body>/i, `${BODY_SNIPPET}\n</body>`);

  // 3. Footer (brand, links, legal row incl. Cookie settings, © year): the marker block, or the page's first <footer>
  const replacedFoot = replaceBetween(out, FOOT_START, FOOT_END, FOOTER_SNIPPET);
  if (replacedFoot) out = replacedFoot;
  else out = out.replace(/[ \t]*<footer\b[\s\S]*?<\/footer>/i, FOOTER_SNIPPET);

  // 4. <main> landmark: everything from the skip-link target up to the footer (pages that lack one)
  if (!/<main\b/i.test(out) && out.includes(FOOT_START)) {
    const anchor = /<div id="main-content" tabindex="-1"><\/div>\n?/;
    if (anchor.test(out)) out = out.replace(anchor, '<main id="main-content" tabindex="-1">\n');
    else out = out.replace(/<([a-z]+)\b([^>]*?) id="main-content" tabindex="-1"([^>]*)>/i, '<main id="main-content" tabindex="-1">\n<$1$2$3>');
    out = out.replace(FOOT_START, '</main>\n' + FOOT_START);
  }

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
