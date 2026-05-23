// Candor — Round 6: Recreation of the dual-plane topographic illustration ref.
// Upper plane: 3D mountain (filled) with banded elevation contours and labels.
// Lower plane: the same terrain seen from above as a 2D contour map with the
// matching elevation labels. Wireframe perspective box ties the two together.

const ART_W = 760;
const ART_H = 560;

// ─────────────────────────────────────────────────────────────
// THE ILLUSTRATION
// ─────────────────────────────────────────────────────────────

function DualPlaneTopo({ palette = 'ref', invert = false }) {
  // colors
  const isRef = palette === 'ref';
  const FILL = isRef ? '#F4C842' : '#E8B888';   // mountain fill
  const LINE = isRef ? '#2563EB' : '#2D6B42';   // contours + labels + outline
  const BOX  = invert ? 'rgba(245,243,238,0.32)' : 'rgba(13,22,16,0.28)';
  const PLN  = invert ? 'rgba(245,243,238,0.05)' : 'rgba(13,22,16,0.04)';

  // ── plane geometry (oblique) ──
  // upper plane
  const upFL = [110, 300], upFR = [630, 300], upBR = [710, 210], upBL = [190, 210];
  // lower plane
  const loFL = [110, 560], loFR = [630, 560], loBR = [710, 470], loBL = [190, 470];

  const p = (xy) => `${xy[0]},${xy[1]}`;
  const planePts = (a, b, c, d) => `${p(a)} ${p(b)} ${p(c)} ${p(d)}`;

  // ── mountain silhouette ──
  // Closed path: rises from base on upper plane, over a tall left peak,
  // dips to a saddle, over a smaller right peak, back down.
  const mountainPath = `
    M 210 305
    Q 240 280, 270 240
    Q 305 175, 340 130
    Q 370 90, 392 82
    Q 420 96, 430 142
    Q 440 200, 460 230
    Q 482 240, 504 220
    Q 528 198, 555 220
    Q 580 246, 600 286
    Q 605 296, 612 308
    Q 540 318, 440 308
    Q 320 312, 210 305
    Z
  `;

  return (
    <svg viewBox="0 0 800 600" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <defs>
        <clipPath id={`mt-${palette}-${invert ? 'd' : 'l'}`}>
          <path d={mountainPath} />
        </clipPath>
      </defs>

      {/* === SUBTLE PLANE FILLS === */}
      <polygon points={planePts(upFL, upFR, upBR, upBL)} fill={PLN} />
      <polygon points={planePts(loFL, loFR, loBR, loBL)} fill={PLN} />

      {/* === WIREFRAME BOX (dashed) === */}
      {/* upper plane edges */}
      <polyline points={planePts(upFL, upFR, upBR, upBL)} fill="none" stroke={BOX} strokeWidth="1.4" strokeDasharray="7 5"/>
      <line x1={upBL[0]} y1={upBL[1]} x2={upFL[0]} y2={upFL[1]} stroke={BOX} strokeWidth="1.4" strokeDasharray="7 5"/>
      {/* lower plane edges */}
      <polyline points={planePts(loFL, loFR, loBR, loBL)} fill="none" stroke={BOX} strokeWidth="1.4" strokeDasharray="7 5"/>
      <line x1={loBL[0]} y1={loBL[1]} x2={loFL[0]} y2={loFL[1]} stroke={BOX} strokeWidth="1.4" strokeDasharray="7 5"/>
      {/* vertical connectors at each corner */}
      <line x1={upFL[0]} y1={upFL[1]} x2={loFL[0]} y2={loFL[1]} stroke={BOX} strokeWidth="1.4" strokeDasharray="7 5"/>
      <line x1={upFR[0]} y1={upFR[1]} x2={loFR[0]} y2={loFR[1]} stroke={BOX} strokeWidth="1.4" strokeDasharray="7 5"/>
      <line x1={upBR[0]} y1={upBR[1]} x2={loBR[0]} y2={loBR[1]} stroke={BOX} strokeWidth="1.4" strokeDasharray="7 5"/>
      <line x1={upBL[0]} y1={upBL[1]} x2={loBL[0]} y2={loBL[1]} stroke={BOX} strokeWidth="1.4" strokeDasharray="7 5"/>

      {/* === MOUNTAIN (upper plane) === */}
      {/* yellow fill */}
      <path d={mountainPath} fill={FILL}/>

      {/* elevation contour bands — clipped to mountain */}
      <g clipPath={`url(#mt-${palette}-${invert ? 'd' : 'l'})`}
         fill="none" stroke={LINE} strokeWidth="2.4" strokeLinecap="round">
        {/* 40 — near apex */}
        <path d="M 354 122 Q 380 118 420 124"/>
        {/* 30 — wider */}
        <path d="M 332 162 Q 380 158 442 168"/>
        {/* 20 — across, dipping into saddle area */}
        <path d="M 310 208 Q 380 200 468 218 Q 500 220 530 214"/>
        {/* 10 — broad, near base */}
        <path d="M 280 258 Q 380 246 530 262 Q 580 270 596 282"/>
      </g>

      {/* mountain outline */}
      <path d={mountainPath} fill="none" stroke={LINE} strokeWidth="2.6" strokeLinejoin="round"/>

      {/* elevation labels on mountain */}
      <g fill={LINE} fontFamily="Urbanist, sans-serif" fontWeight="600" fontSize="22" letterSpacing="-0.5">
        <text x="424" y="132">40</text>
        <text x="448" y="178">30</text>
        <text x="468" y="226">20</text>
        <text x="486" y="272">10</text>
      </g>

      {/* === LOWER PLANE CONTOUR MAP === */}
      <g fill="none" stroke={LINE} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {/* outermost contour — enveloping both peaks */}
        <path d="
          M 198 510
          C 178 488, 192 466, 224 458
          C 268 452, 308 458, 348 466
          C 392 470, 432 476, 480 478
          C 528 482, 568 482, 596 494
          C 624 504, 632 522, 612 532
          C 588 542, 548 542, 504 538
          C 460 536, 412 540, 362 542
          C 308 542, 252 538, 222 530
          C 198 524, 188 518, 198 510 Z
        "/>
        {/* second contour — tighter envelope */}
        <path d="
          M 222 502
          C 210 488, 224 472, 252 466
          C 298 462, 336 466, 376 472
          C 414 476, 444 478, 478 484
          C 512 488, 540 488, 564 498
          C 584 506, 588 518, 568 524
          C 540 528, 502 526, 462 524
          C 416 522, 372 524, 326 526
          C 284 526, 244 522, 226 514
          C 218 510, 216 506, 222 502 Z
        "/>
        {/* third — splitting between peaks (big peak boundary) */}
        <path d="
          M 250 498
          C 244 484, 262 474, 288 470
          C 318 466, 350 470, 380 476
          C 408 480, 426 482, 432 494
          C 432 506, 408 514, 372 516
          C 332 516, 290 510, 264 504
          C 252 502, 248 502, 250 498 Z
        "/>
        {/* inner big peak */}
        <path d="
          M 286 492
          C 282 482, 302 476, 326 474
          C 350 474, 370 478, 384 486
          C 390 494, 372 500, 344 502
          C 318 502, 294 498, 286 492 Z
        "/>
        {/* tip of big peak */}
        <path d="
          M 326 484
          C 324 480, 340 478, 352 480
          C 360 482, 358 488, 346 490
          C 334 490, 326 488, 326 484 Z
        "/>
        {/* small peak contour (right satellite) */}
        <path d="
          M 488 510
          C 486 500, 506 494, 528 494
          C 552 494, 568 502, 568 514
          C 564 522, 542 524, 522 524
          C 502 524, 488 518, 488 510 Z
        "/>
        {/* small peak tip */}
        <path d="
          M 512 512
          C 510 506, 524 504, 536 506
          C 544 508, 542 516, 534 518
          C 522 518, 514 516, 512 512 Z
        "/>
      </g>

      {/* elevation labels on contour map */}
      <g fill={LINE} fontFamily="Urbanist, sans-serif" fontWeight="600" fontSize="18" letterSpacing="-0.5">
        <text x="335" y="496">40</text>
        <text x="295" y="513">30</text>
        <text x="402" y="525">20</text>
        <text x="450" y="534">10</text>
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// SLATE FOR THE BIG ILLUSTRATION
// ─────────────────────────────────────────────────────────────

function IllusFrame({ palette, invert }) {
  const bg = invert ? '#0D1610' : '#F5F3EE';
  return (
    <div style={{ background: bg, width: '100%', height: '100%', display: 'grid', placeItems: 'center', padding: '12px' }}>
      <DualPlaneTopo palette={palette} invert={invert} />
    </div>
  );
}

function IllusArtboard({ palette = 'ref', invert = false, label = '', subtitle = '' }) {
  return (
    <div style={{ width: '100%', height: '100%', background: '#F5F3EE', display: 'grid', gridTemplateRows: '1fr auto', overflow: 'hidden' }}>
      <IllusFrame palette={palette} invert={invert} />
      <div className="smallrow" style={{ borderTop: '1px solid var(--rule)' }}>
        <div className="small-left">
          <span className="mono">{subtitle}</span>
        </div>
        <span className="pin">{label}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// KEEPERS (still on the board)
// ─────────────────────────────────────────────────────────────

function wobble(t, seed = 0) {
  return Math.sin(t * 2.2 + seed * 1.3) * 0.045
       + Math.sin(t * 3.4 - seed * 0.9) * 0.028
       + Math.sin(t * 4.7 + seed * 0.5) * 0.014;
}

function closedContour(cx, cy, rx, ry, seed, N = 40) {
  const pts = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const w = 1 + wobble(a * 0.95 + seed * 0.4, seed);
    pts.push([cx + Math.cos(a) * rx * w, cy + Math.sin(a) * ry * w]);
  }
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < N; i++) {
    const c = pts[i];
    const n = pts[(i + 1) % N];
    const m = [(c[0] + n[0]) / 2, (c[1] + n[1]) / 2];
    d += ` Q ${c[0].toFixed(2)},${c[1].toFixed(2)} ${m[0].toFixed(2)},${m[1].toFixed(2)}`;
  }
  return d + ' Z';
}

function IslandMark({ size, fg, accent, paper }) {
  const cx = 50, cy = 52;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <path d={closedContour(cx, cy, 38, 30, 0.6)} fill={fg}/>
      <path d={closedContour(cx + 2, cy - 3, 28, 22, 2.4)}
            fill="none" stroke={paper} strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round"/>
      <path d={closedContour(cx + 4, cy - 5, 18, 14, 4.6)}
            fill="none" stroke={paper} strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round"/>
      <path d={closedContour(cx + 6, cy - 7, 9,  7, 6.9)}
            fill="none" stroke={paper} strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={cx + 7} cy={cy - 8} r="3" fill={accent}/>
    </svg>
  );
}

function CairnMark({ size = 80, fg = '#0D1610', accent = '#2D6B42' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <ellipse cx="50" cy="86" rx="34" ry="9" fill={fg}/>
      <ellipse cx="48" cy="66" rx="26" ry="8" fill={fg}/>
      <ellipse cx="52" cy="48" rx="20" ry="7.5" fill={fg}/>
      <ellipse cx="49" cy="32" rx="14" ry="6.5" fill={fg}/>
      <ellipse cx="51" cy="18" rx="8"  ry="5"   fill={accent}/>
    </svg>
  );
}

function KeeperSlate({ Mark, note, name = 'Candor' }) {
  return (
    <div className="lab">
      <div className="stage light">
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Mark size={130} fg="#0D1610" accent="#2D6B42" paper="#F5F3EE" />
          <span className="wm-urb" style={{ fontSize: 64, color: 'var(--ink)' }}>{name}</span>
        </div>
      </div>
      <div className="stage dark">
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Mark size={130} fg="#F5F3EE" accent="#3D8A57" paper="#0D1610" />
          <span className="wm-urb" style={{ fontSize: 64, color: 'var(--paper)' }}>{name}</span>
        </div>
      </div>
      <div className="smallrow">
        <div className="small-left">
          <Mark size={28} fg="#0D1610" accent="#2D6B42" paper="#F5F3EE" />
          <span className="mono">24·px favicon</span>
        </div>
        <span className="pin">{note}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// BOARD
// ─────────────────────────────────────────────────────────────

function LogoBoard() {
  return (
    <DesignCanvas>

      <DCSection
        id="recreation"
        title="Reference recreation"
        subtitle="Dual perspective planes — a 3D mountain on top with its 2D contour projection below"
      >
        <DCArtboard id="ref-faithful" label="A · Faithful palette" width={ART_W} height={ART_H}>
          <IllusArtboard palette="ref" invert={false} label="Reference palette" subtitle="Yellow + blue, as-shown" />
        </DCArtboard>
        <DCArtboard id="ref-brand" label="B · Brand palette" width={ART_W} height={ART_H}>
          <IllusArtboard palette="brand" invert={false} label="Brand palette" subtitle="Amber wash + forest green" />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="recreation-dark"
        title="On dark"
        subtitle="The same composition on an ink ground"
      >
        <DCArtboard id="brand-dark" label="C · Brand on ink" width={ART_W} height={ART_H}>
          <IllusArtboard palette="brand" invert={true} label="Brand palette / dark" subtitle="Forest Black ground" />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="keepers"
        title="Standing keepers"
        subtitle="Still on the board from prior rounds"
      >
        <DCArtboard id="island" label="8 · Island" width={420} height={560}>
          <KeeperSlate Mark={IslandMark} note="Round 5 retouch" />
        </DCArtboard>
        <DCArtboard id="cairn" label="9 · Cairn" width={420} height={560}>
          <KeeperSlate Mark={CairnMark} note="Round 2 keeper" />
        </DCArtboard>
      </DCSection>

      <DCPostIt top={40} left={40} width={320}>
        Round 6 — recreation of the dual-plane topographic reference. Variant A faithful to the original palette; B + C adapt to brand colors (amber wash + forest green). Island and Cairn still on the board.
      </DCPostIt>

    </DesignCanvas>
  );
}

window.LogoBoard = LogoBoard;
