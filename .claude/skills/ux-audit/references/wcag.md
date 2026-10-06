# Accessibility: WCAG 2.2 checks

WCAG 2.2 is the standard (W3C Recommendation). It's normative and testable. **The target is AA.** "(new)" marks criteria added in 2.2. WCAG 3 is still a Working Draft with no final contrast algorithm, so measure with WCAG 2 ratios. APCA is a candidate, not the standard.

Under "How to check": **C** means the collector measures it (verify in screenshots), and **M** means a manual check.

## Perceivable

| SC | Level | Requirement | How to check |
|---|---|---|---|
| 1.1.1 Non-text content | A | Images have alt that serves the same purpose; decoration is `alt=""` or hidden from assistive tech; icon buttons have names | C missing alt · M alt *quality* (no "image of", no filenames, ≤~125 chars, conveys purpose) |
| 1.2.x Media | A/AA | Captions for video with audio; audio description or transcript | M |
| 1.3.1 Info and relationships | A | Structure is in the markup: headings, lists, tables, labels, landmarks | C outline, landmarks · M fake headings (styled `div`s), layout tables |
| 1.3.2 Meaningful sequence | A | DOM order matches visual order | M compare tab order to the visual layout |
| 1.3.4 Orientation | AA | Not locked to portrait or landscape | M |
| 1.3.5 Identify input purpose | AA | `autocomplete` tokens on personal-data fields | C |
| 1.4.1 Use of colour | A | Colour is never the only signal. Links in body text need an underline, or 3:1 against surrounding text plus a non-colour cue on hover and focus | M |
| 1.4.3 Contrast (minimum) | AA | Text 4.5:1. Large text (≥24px, or ≥18.66px bold) 3:1. Logos, disabled and decorative text exempt | C (text over images is *unverified*, so check screenshots) |
| 1.4.4 Resize text | AA | Usable at 200% zoom; zoom not blocked (`user-scalable=no`, `maximum-scale=1`) | C zoom-block · M |
| 1.4.5 Images of text | AA | Real text, not pictures of text | M |
| 1.4.10 Reflow | AA | No two-dimensional scrolling at 320 CSS px wide | C |
| 1.4.11 Non-text contrast | AA | 3:1 for component boundaries (inputs, toggles), focus indicators, icons and chart marks that carry meaning | M (sample input borders and icons) |
| 1.4.12 Text spacing | AA | No clipping or loss with line-height 1.5, paragraph spacing 2em, letter-spacing 0.12em, word-spacing 0.16em | C |
| 1.4.13 Content on hover or focus | AA | Tooltips and popovers are dismissible (Esc), hoverable, and persistent | M |

## Operable

| SC | Level | Requirement | How to check |
|---|---|---|---|
| 2.1.1 Keyboard | A | Everything works by keyboard | C tab pass · M menus, modals, carousels, custom widgets |
| 2.1.2 No keyboard trap | A | Focus can always leave | C |
| 2.1.4 Character key shortcuts | A | Single-key shortcuts can be turned off or remapped | M |
| 2.2.1 Timing adjustable | A | Time limits can be turned off or extended | M |
| 2.2.2 Pause, stop, hide | **A** | Auto-moving or blinking content lasting over 5 s alongside other content needs a pause control | C running-at-6s · M |
| 2.3.1 Three flashes | A | No more than 3 flashes per second | M |
| 2.3.3 Animation from interactions | AAA | Interaction-triggered motion can be disabled. Treat `prefers-reduced-motion` as the de facto requirement | C reduced-motion run |
| 2.4.1 Bypass blocks | A | Skip link or landmarks | C |
| 2.4.2 Page titled | A | Descriptive, unique `<title>` | C |
| 2.4.3 Focus order | A | Logical order; modals move focus in and return it on close | C order · M modals |
| 2.4.4 Link purpose | A | Link text makes sense in context; no "click here" | C generic text |
| 2.4.6 Headings and labels | AA | Headings and labels describe their content | M |
| 2.4.7 Focus visible | AA | Visible focus indicator | C |
| 2.4.11 Focus not obscured (new) | AA | Focused element not *entirely* hidden by sticky headers, cookie banners or chat widgets | C |
| 2.4.13 Focus appearance (new) | AAA | Indicator at least as large as a 2px perimeter, with 3:1 between focused and unfocused states | M (good practice) |
| 2.5.1 Pointer gestures | A | Multi-point or path gestures have single-pointer alternatives | M |
| 2.5.2 Pointer cancellation | A | Act on pointer up, not down | M |
| 2.5.3 Label in name | A | The accessible name contains the visible label text (for voice control) | M (`aria-label` overriding visible text) |
| 2.5.7 Dragging movements (new) | AA | Dragging has a click or tap alternative | M sliders, sortable lists, carousels |
| 2.5.8 Target size (new) | AA | ≥24×24 CSS px, or spacing so 24px circles centred on targets don't overlap. Links inside running text exempt | C · best practice 44 (Apple) / 48 (Material) on touch |

## Understandable

| SC | Level | Requirement | How to check |
|---|---|---|---|
| 3.1.1 Language of page | A | `<html lang>` | C |
| 3.2.1 / 3.2.2 On focus / on input | A | No context change on focus, or on input without warning (auto-submitting selects, auto-advancing quizzes) | M |
| 3.2.3 Consistent navigation | AA | Repeated nav in the same order on every page | M across pages |
| 3.2.4 Consistent identification | AA | Same function, same name and icon | M |
| 3.2.6 Consistent help (new) | A | Contact, chat and help links in the same relative order on every page | M |
| 3.3.1 Error identification | A | The field in error is identified and the error described in text | M submit an empty or invalid form |
| 3.3.2 Labels or instructions | A | Visible labels; placeholder alone is not enough | C placeholder-only |
| 3.3.3 Error suggestion | AA | Tell people how to fix it | M |
| 3.3.4 Error prevention (legal, financial, data) | AA | Reversible, checked, or confirmed | M checkout, account deletion |
| 3.3.7 Redundant entry (new) | A | Don't make people re-enter information within one process | M |
| 3.3.8 Accessible authentication (new) | AA | No memory or puzzle tests at login; paste and password managers allowed; object or personal-content CAPTCHAs only | M |

## Robust

| SC | Level | Requirement | How to check |
|---|---|---|---|
| 4.1.2 Name, role, value | A | Custom widgets expose name, role and state (`aria-expanded`, `aria-pressed`, `aria-current`) | C unnamed controls · M custom widgets |
| 4.1.3 Status messages | AA | Results, errors and "added to cart" announced without moving focus (`role=status` / `aria-live`) | M |

4.1.1 Parsing has been removed in WCAG 2.2; don't report it.

## Manual interaction checks (Playwright one-liners)

- **Menus and modals:** open → press Tab (focus stays inside the modal) → press Esc (it closes) → check `document.activeElement` is the trigger again.
- **Forms:** submit empty → errors in text next to the fields, focus moves to the first error or a summary, errors announced.
- **Hover-only UI:** hover-revealed actions need focus and tap equivalents.
- **Zoom:** set the viewport to 640 px at deviceScaleFactor 2, or use `page.evaluate(() => document.body.style.zoom = 2)`, to approximate 200%.
- **Screen-reader smoke test:** `await page.locator('body').ariaSnapshot()` gives the accessibility tree as YAML. Look for unnamed buttons, missing headings and duplicate landmarks.

## Severity guide for accessibility findings

- **4:** blocks a task for a disability group (keyboard trap, unlabeled form, CAPTCHA with no alternative, content hidden without JS or under reduced motion).
- **3:** fails AA on a primary path (contrast on body text or CTAs, no focus indicator, small targets on primary navigation).
- **2:** fails AA on secondary content, or AAA on a primary path.
- **1:** best-practice gaps.
