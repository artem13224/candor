#!/usr/bin/env node
/**
 * sync-shared.js — keeps site-wide snippets identical across every HTML page.
 *
 * What it manages (each block is wrapped in marker comments so re-running is safe):
 *   1. Consent Mode v2 defaults in <head>  (must run before GTM / gtag load)
 *   2. Cookie-consent banner before </body>
 *   3. Footer legal links: Privacy Policy · Terms · Cookie settings
 *   4. Footer business line: © YEAR Candor · Vancouver, BC, Canada
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
  :where(a,button,input,select,textarea,summary,[tabindex]):focus-visible{outline:2px solid #3D8A57;outline-offset:3px}
  .skip-link{position:absolute;left:16px;top:-80px;z-index:1000;padding:10px 16px;background:#0D1610;color:#F5F3EE;font:600 12px/1 'Urbanist',system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;border-radius:2px;text-decoration:none;transition:top .2s}
  .skip-link:focus{top:12px;outline-color:#F5F3EE}
  .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
</style>
${A11Y_END}`;
const SKIP_LINK = '<a class="skip-link" href="#main-content">Skip to content</a>';

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
