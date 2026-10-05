#!/usr/bin/env node
/**
 * make-ink-masks.js — renders the two alpha masks behind the blog image ink reveal.
 *
 *   npm run ink                         write both masks into images/textures/
 *   npm run ink -- --preview <dir>      also write contact sheets to <dir> for eyeballing
 *
 * Outputs (only alpha matters; both are used as CSS mask-image layers by the
 * candor-ink block in scripts/sync-shared.js):
 *   images/textures/ink-reveal.webp  40 frames of ink bleeding open, 400×225 each,
 *                                    in an 8 × 5 grid (row-major). Frame 0 is fully
 *                                    transparent, frame 39 fully opaque.
 *   images/textures/ink-edge.webp    static brushed, ragged edge: opaque inside,
 *                                    dry-brush streaks eating the outer few percent.
 *
 * Everything is computed here from seeded value noise, so re-running gives the
 * same bytes. Never hand-edit the outputs; change the constants and re-run.
 * Needs the dev dependency `sharp` (npm install).
 */

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT  = path.join(ROOT, 'images', 'textures');
const args = process.argv.slice(2);
const pi   = args.indexOf('--preview');
const PREVIEW = pi !== -1 ? path.resolve(args[pi + 1] || '.') : null;

let sharp;
try { sharp = require('sharp'); }
catch (e) { console.error('✗ make-ink-masks needs `sharp`. Run:  npm install'); process.exit(1); }

// ── Noise ─────────────────────────────────────────────────────────────────────

function rng(seed) {                                  // mulberry32
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hash(x, y, s) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1274126177) | 0;
  h = Math.imul(h ^ h >>> 13, 1274126177);
  return ((h ^ h >>> 16) >>> 0) / 4294967296;
}
function noise(x, y, s) {                             // smooth value noise, 0..1
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, s, oct = 4) {                      // 0..1
  let sum = 0, amp = 0.5, norm = 0;
  for (let o = 0; o < oct; o++) { sum += amp * noise(x, y, s + o * 17); norm += amp; x *= 2.03; y *= 2.03; amp *= 0.5; }
  return sum / norm;
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ── Reveal sprite ────────────────────────────────────────────────────────────

const FW = 400, FH = 225, COLS = 8, ROWS = 5, FRAMES = COLS * ROWS;
const ASPECT = FW / FH;                               // x runs 0..ASPECT, y 0..1

// Ink drops: the first lands near the middle (like the pen), the rest fall in
// later around it and merge. Each has its own lobed outline (angular noise LUT).
const R = rng(1758);
const DROPS = [{ x: ASPECT * 0.5, y: 0.5, start: 0, grow: 1.25 }];
for (let i = 0; i < 6; i++) {
  DROPS.push({ x: 0.15 + R() * (ASPECT - 0.3), y: 0.12 + R() * 0.76, start: 0.05 + R() * 0.4, grow: 0.4 + R() * 0.35 });
}
const LUT = 720;
for (const [i, d] of DROPS.entries()) {
  d.lobes = new Float32Array(LUT);
  for (let k = 0; k < LUT; k++) {
    const a = k / LUT * Math.PI * 2;
    d.lobes[k] = fbm(Math.cos(a) * 1.7 + i * 9.1, Math.sin(a) * 1.7 + i * 4.7, 300 + i, 4) - 0.5;
  }
}
// Pools briefly, then spreads steadily: the frame fills only at the very end
const grow = t => Math.pow(t, 1.15);
// Wash layers: WASHES-1 translucent tide rings of TONE opacity each, then a solid
// core BAND (frame heights) further in.
const WASHES = 5, TONE = 0.19, BAND = 0.22;

function revealFrame(f) {
  const t = f / (FRAMES - 1);
  const px = new Uint8Array(FW * FH);
  const radius = DROPS.map(d => {
    const lt = (t - d.start) / (1 - d.start);
    return lt <= 0 ? -1 : d.grow * grow(lt) - 0.08;
  });
  const soft = 1.4 / FH;                              // ~1.4 px anti-aliasing
  const spatterOn = smooth(0.03, 0.12, t) * (1 - smooth(0.8, 0.95, t));
  for (let j = 0; j < FH; j++) {
    for (let i = 0; i < FW; i++) {
      let x = i / FH, y = j / FH;
      // Domain warp: wobbles every outline the same way, like ink in paper fibre
      const wx = fbm(x * 3, y * 3, 11, 3) - 0.5, wy = fbm(x * 3 + 5.2, y * 3 + 1.3, 12, 3) - 0.5;
      x += wx * 0.09; y += wy * 0.09;
      const grain = fbm(x * 18, y * 18, 21, 4) - 0.5;
      let field = -Infinity;
      for (let k = 0; k < DROPS.length; k++) {
        if (radius[k] < -0.5) continue;
        const d = DROPS[k], dx = x - d.x, dy = y - d.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const a = (Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2);
        const lobe = d.lobes[Math.min(LUT - 1, Math.floor(a * LUT))];
        // Lobes stretch the outline into bleeding fingers; grain roughens the rim
        const v = radius[k] - dist * (1 - 0.45 * lobe) + grain * 0.07;
        if (v > field) field = v;
      }
      field += smooth(0.88, 1, t) * 0.6;              // close the last gaps so the final frame is solid
      // Layered washes: faint tide lines outside, solid core inside. Each layer
      // has its own crinkled outline so the rings never run parallel.
      let alpha = 0;
      if (field > -0.06) {
        for (let k = 0; k < WASHES; k++) {
          const crinkle = (fbm(x * 40, y * 40, 80 + k, 3) - 0.5) * 0.05 + (fbm(x * 9, y * 9, 90 + k, 3) - 0.5) * 0.09;
          const on = smooth(-soft, soft, field - BAND * k / (WASHES - 1) + crinkle);
          if (k === WASHES - 1) { alpha = Math.max(alpha, on); break; }  // the core is solid
          const mottle = 0.7 + 0.6 * fbm(x * 5, y * 5, 100 + k, 3);       // uneven density, like wet ink
          alpha += on * TONE * mottle;
        }
        alpha = Math.min(1, alpha);
      }
      // Spatter: faint specks that land just ahead of the spreading rim
      if (spatterOn > 0 && field > -0.09 && field < -0.008) {
        const sp = 0.5 * smooth(0.74, 0.77, fbm(x * 38, y * 38, 41, 2)) * spatterOn * smooth(-0.09, -0.03, field);
        if (sp > alpha) alpha = sp;
      }
      // 16 tones: keeps the stepped look of a wash and the file ~110 KB instead of ~280
      px[j * FW + i] = Math.round(Math.round(alpha * 15) / 15 * 255);
    }
  }
  return px;
}

// ── Brushed edge ─────────────────────────────────────────────────────────────

const EW = 1600, EH = 800;                          // 2:1; distances are in height units

function edgeMask() {
  const px = new Uint8Array(EW * EH);
  // One ragged band per side. along = position along that edge, across = distance in from it.
  function side(along, across, s) {
    const inset = 0.014 + 0.04 * fbm(along * 3, s, 50 + s, 4);           // wandering outline
    const streak = (fbm(along * 2.5, across * 60, 60 + s, 3) - 0.5) * 0.045; // bristle streaks run along the edge
    const v = across - inset + streak;
    let a = smooth(-0.002, 0.004, v);
    // A translucent wash bleeds a little further out than the solid stroke
    const wash = smooth(-0.002, 0.004, v + 0.014 + (fbm(along * 9, across * 30, 80 + s, 3) - 0.5) * 0.02);
    a = Math.max(a, 0.38 * wash);
    // Dry brush: a few bristles skip, leaving gaps just inside the outline
    const gap = smooth(0.58, 0.66, fbm(along * 4, across * 110, 70 + s, 2)) * (1 - smooth(0.0, 0.045, v));
    return a * (1 - gap);
  }
  for (let j = 0; j < EH; j++) {
    const v = j / (EH - 1);
    for (let i = 0; i < EW; i++) {
      const u = i / (EW - 1);
      const a = side(u * 2, v, 1) * side(u * 2, 1 - v, 2) * side(v, u * 2, 3) * side(v, (1 - u) * 2, 4);
      px[j * EW + i] = Math.round(a * 255);
    }
  }
  return px;
}

// ── Write ────────────────────────────────────────────────────────────────────

// Masks only use alpha: keep RGB black so lossless WebP compresses it away.
function toGreyAlpha(alpha) {
  const buf = Buffer.alloc(alpha.length * 2);
  for (let k = 0; k < alpha.length; k++) buf[k * 2 + 1] = alpha[k];
  return buf;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const SW = FW * COLS, SH = FH * ROWS;
  const sheet = new Uint8Array(SW * SH);
  for (let f = 0; f < FRAMES; f++) {
    const px = revealFrame(f);
    if (f === 0 && px.some(v => v !== 0)) throw new Error('frame 0 must be fully transparent');
    if (f === FRAMES - 1 && px.some(v => v !== 255)) throw new Error(`frame ${f} must be fully opaque`);
    const ox = (f % COLS) * FW, oy = Math.floor(f / COLS) * FH;
    for (let j = 0; j < FH; j++) sheet.set(px.subarray(j * FW, (j + 1) * FW), (oy + j) * SW + ox);
    process.stdout.write(`\r  rendering frame ${f + 1}/${FRAMES}`);
  }
  process.stdout.write('\n');

  const edge = edgeMask();
  const targets = [
    ['ink-reveal.webp', sheet, SW, SH],
    ['ink-edge.webp',   edge,  EW, EH],
  ];
  for (const [name, alpha, w, h] of targets) {
    const file = path.join(OUT, name);
    await sharp(toGreyAlpha(alpha), { raw: { width: w, height: h, channels: 2 } })
      .webp({ lossless: true, effort: 6 })
      .toFile(file);
    console.log(`✓ ${path.relative(ROOT, file)}  ${w}×${h}  ${Math.round(fs.statSync(file).size / 1024)} KB`);
  }

  if (PREVIEW) {
    fs.mkdirSync(PREVIEW, { recursive: true });
    // Ink drawn black on paper, so the shapes are easy to judge by eye
    const ink = a => Buffer.from(a.map(v => 255 - v));
    await sharp(ink(sheet), { raw: { width: SW, height: SH, channels: 1 } }).png().toFile(path.join(PREVIEW, 'ink-reveal-sheet.png'));
    await sharp(ink(edge),  { raw: { width: EW, height: EH, channels: 1 } }).png().toFile(path.join(PREVIEW, 'ink-edge.png'));
    console.log(`✓ previews in ${PREVIEW}`);
  }
}

main().catch(e => { console.error('✗ ' + e.message); process.exit(1); });
