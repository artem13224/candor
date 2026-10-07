# Visual design audit

Judge the design as a *system*: hierarchy, type, colour, space and components should each follow a small set of rules applied consistently. Sprawl (many sizes, colours, radii, shadows, durations) is the clearest sign there's no system. The collector counts it for you.

## Hierarchy

- **One focal point per view.** Squint at the screenshot: the first, second and third things the eye lands on should be the promise, the proof and the action, in that order. Competing focal points mean nothing leads.
- Establish hierarchy with **size, weight, colour and space** together, not size alone (Apple). Important items go top and leading edge. Alignment signals relationships; indentation signals subordination.
- **Group with proximity and containers** (Gestalt common region and proximity): related things close, unrelated things separated by more space than the gap within a group. Uniform spacing everywhere means no grouping at all.
- **Buttons:** show the preferred choice by *style*, not *size* (Apple; Material allows size inside button groups, so note the conflict if relevant). Destructive actions never get the primary style.
- **Restraint:** emphasis is a budget. If everything is bold, coloured or animated, nothing is (Von Restorff). Distinct styling that *looks like an ad* gets ignored (banner blindness).

## Typography

- **Families:** 1–2 (plus mono if needed). More than 3 obscures hierarchy (Apple).
- **Scale:** a modular scale with clearly different steps. Typical ratios are 1.2–1.25 for dense UI and 1.25–1.333 for marketing; 1.618 is for editorial display text only. Avoid near-duplicate sizes: 14/15/16 in one system means sprawl. Healthy systems have about 6–10 sizes; the collector lists them.
- **Body text:**
  - ≥16px on web; Apple's iOS default is 17pt.
  - Avoid light weights (300 and below) at body sizes.
  - Line-height ~1.5 for body, ~1.1–1.25 for display (Material: 1.2 for large text, 1.5 for body).
- **Line length:**
  - Material: 40–60 characters.
  - Bringhurst: 45–75, 66 ideal.
  - WCAG AAA: ≤80.
  - Below about 35 characters, the eye jumps too often.
  - Set it with `max-width: ~66ch`.
- **Small text:** labels and captions ≥12px; mono or uppercase labels need more letter-spacing *and* contrast. Tiny uppercase tracking with low contrast is a common "premium" look that fails 1.4.3.
- **Not justified** on the web (rivers of space), and no long centred paragraphs.
- **Tabular figures** for prices, tables and counters (Material).
- **Links** in body text are underlined (Material; WCAG 1.4.1 unless 3:1 against surrounding text plus a non-colour cue).

## Colour

- **Roles, not raw values:** a small set of semantic roles (text, muted text, surface, primary, on-primary, border, error, success). Each "on-X" colour is the text colour for surface X (Material). Container colours are never used for text.
- **One meaning per colour** (Apple): if brand green marks links, it can't also be plain decoration or a success state.
- **Contrast:** text 4.5:1 (large 3:1); component boundaries and meaningful icons 3:1. Check every surface a colour sits on (cards, tints, dark sections), not just the page background. Watch for a token that passes on the page but fails on a tinted card.
- **Not colour alone:** pair with an icon, text or shape (states, errors, charts).
- **Dark sections and dark mode:** dim backgrounds and brighter foregrounds; not a pure inversion. Avoid pure white text at full size on pure black (halation); off-white on off-black is softer.
- **Sprawl:** more than ~12 distinct text colours suggests one-off values. The collector counts them.
- **Culture:** colour meanings vary (red, white); check them for the audience's locale.

## Layout and spacing

- **Spacing scale:** one base unit (4 or 8px) and a short scale. The real reason is fewer decisions and whole-pixel scaling, not that screens divide by 8. Look for off-scale gaps in the screenshots.
- **Grid:** content aligns to a grid with consistent margins. A common pattern is 4 columns on mobile, 8 on tablet and 12 on desktop. Material breakpoints: compact / medium / expanded / large / extra-large; one pane on compact and medium, two on expanded and above.
- **Responsive:** at each breakpoint, decide what to reveal, divide, resize, reposition or swap (Material). Content order is the same across sizes (keyboard and screen-reader order). Long text fields and buttons shouldn't stretch full-width on desktop.
- **Density:** generous space signals calm and premium; dense layouts signal tools. Density should be a choice, not an accident. Don't make dense the default on touch (targets fall below 44–48px).
- **Safe areas:** fixed bars, chat widgets and cookie banners must not cover content or focus (2.4.11), especially on mobile where they stack.
- **Golden ratio:** treat it as a taste choice, not evidence. Mostly folklore (Markowsky 1992); people prefer it only mildly, and 3:2 or 5:3 do as well. Alignment beats ratio.

## Components and states

- **Every interactive element has distinct states:**
  - default, hover (pointer only), focus-visible, pressed, disabled, plus loading and selected where relevant.
  - Material: each state needs **two visual indicators**, not colour alone.
  - Apple: every custom button needs a pressed state.
- **Buttons:**
  - Labels start with a verb, 1–3 words, sentence case (Material), never truncated or wrapped.
  - At least 44×44 touch target (Apple) or 48 (Material); 24 minimum for WCAG.
  - About 8px between adjacent targets (Material); Apple suggests ~12pt between bordered controls and ~24pt between borderless ones.
- **Forms:**
  - Visible persistent labels (placeholder is a hint, not a label).
  - Required marked with an asterisk, explained once.
  - Field width matches the expected input.
  - Inline validation on blur; error text *replaces* helper text and is paired with an icon.
  - Fields stacked vertically, in a logical tab order, with input types that summon the right keyboard.
- **Cards:** if the whole card is clickable, it looks clickable (signifier) and has one link target, not nested competing links.
- **Icons:** the label stays until recognition is proven (curse of knowledge); use one icon style (outline *or* filled, consistent stroke).
- **Imagery:**
  - Has a job: shows the product, the people or the outcome.
  - Consistent treatment (crop, colour grade).
  - No text baked into images.
  - Width and height set (no CLS).
  - Modern formats.
  - Lazy-loaded below the fold.

## Consistency sweep (do it across pages)

Compare page templates side by side in the screenshots: header and footer identical, the same component looks the same everywhere, CTA labels and colours are consistent, and the spacing rhythm is consistent. Inconsistency is a "small tax the user pays on every visit" (Shneiderman).
