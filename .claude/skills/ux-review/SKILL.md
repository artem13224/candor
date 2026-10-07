---
name: ux-review
description: Evidence-graded UX/UI review checklist for candorcertified.com, distilled from WCAG 2.2, Nielsen Norman Group, Apple's Human Interface Guidelines, Material Design 3, Laws of UX, UX Guidelines and the open HCI textbook. Use when critiquing, auditing or designing any page, component, form, animation or copy on the site — "review this page", "is this accessible", "does this UX work", "check contrast", "audit the assessment", "redesign X" — and before shipping visual or interaction changes.
---

# UX review

How to judge a design on this site, and how much weight each kind of rule deserves.

Distilled in Oct 2026 from full readings of the sources at the bottom:
- WCAG 2.2: every success criterion.
- NN/g: the heuristics article, the heuristic-evaluation method, severity ratings and response-time limits.
- Apple HIG: 18 pages.
- Material 3: 18 pages.
- Laws of UX: all 30 entries.
- UX Guidelines: 25 pages.
- The HCI textbook: preface and table of contents only (the chapters are on academic.oup.com, which this environment's network policy blocks).

## 1. Weigh the evidence before citing it

| Tier | Sources | How to treat it |
|---|---|---|
| **Standard** | WCAG 2.2 (W3C) | Normative and testable, with numbers. A failure is a bug. |
| **Platform convention** | Apple HIG, Material 3 | Strong defaults written for native apps. Translate them to the web; don't copy point sizes blindly. Where the two disagree, say so (see §5). |
| **Heuristic** | NN/g 10, Norman, Shneiderman 8, Tognazzini | Prompts for *finding* problems. Breaking one is not automatically a bug: NN/g's own example is a hamburger menu, which violates "recognition rather than recall" but is often the right trade-off on mobile. |
| **Psychology "law"** | Laws of UX, UX Guidelines | Evidence ranges from a mathematical model (Fitts) to failed replications (Zeigarnik). §4 grades each one. Laws of UX repeats several weak claims uncritically; UX Guidelines is more careful, but still not uniformly. |

**Method limits (NN/g).** Severity ratings from a single evaluator are "too unreliable to be trusted". A heuristic evaluation needs 3–5 independent evaluators, and the mean of three severity ratings is good enough. A review written by Claude is one evaluator, so present its findings as likely problems, not verdicts. Only testing with people confirms a problem: five first-time users find what experts can't see (the curse of knowledge).

**Rate severity on NN/g's 0–4 scale.** Severity combines frequency, impact and persistence.
- 0 = not a problem
- 1 = cosmetic
- 2 = minor
- 3 = major (high priority)
- 4 = catastrophe (fix before release)

## 2. WCAG 2.2: the criteria that matter for this site

Levels are given exactly; the target is AA. "New" marks criteria added in 2.2.

**Perceivable**
- **1.1.1 Non-text content (A):** every image has alt text that serves the same purpose; decoration is hidden from assistive technology (`alt=""`). Material 3 adds: keep alt text to about 125 characters and don't start with "image of".
- **1.3.1 Info and relationships (A):** structure shown visually must also exist in the markup — headings, lists, `<dl>`, landmarks.
- **1.3.5 Identify input purpose (AA):** use `autocomplete` tokens on personal-data fields.
- **1.4.1 Use of colour (A):** colour is never the only signal. Links inside body text need an underline (Material 3 requires one) or 3:1 contrast against the surrounding text.
- **1.4.3 Contrast (AA):** 4.5:1 for text. Large text needs 3:1; "large" means ≥18pt (24px) or ≥14pt bold (18.66px). Logos, disabled controls and pure decoration are exempt.
- **1.4.4 Resize text (AA):** usable at 200%.
- **1.4.10 Reflow (AA):** no two-dimensional scrolling at 320 CSS px wide (1280px at 400% zoom).
- **1.4.11 Non-text contrast (AA):** 3:1 for anything needed to identify a control or its state — input borders, focus rings, meaningful icons and chart marks.
- **1.4.12 Text spacing (AA):** nothing breaks when a user sets line-height 1.5, paragraph spacing 2em, letter-spacing 0.12em and word-spacing 0.16em.
- **1.4.13 Content on hover or focus (AA):** tooltips and popovers can be dismissed (Esc), the pointer can move onto them without them vanishing, and they stay visible until dismissed.
- AAA references: **1.4.6** enhanced contrast is 7:1 (Apple recommends aiming for 7:1 on small custom text). **1.4.8** text blocks ≤80 characters wide, not justified, line spacing ≥1.5.

**Operable**
- **2.1.1 Keyboard (A)** and **2.1.2 No keyboard trap (A):** everything works by keyboard, and focus can always leave a component.
- **2.2.1 Timing adjustable (A):** time limits can be turned off or extended.
- **2.2.2 Pause, stop, hide (A — level A, not AA):** anything that moves, blinks or scrolls automatically, lasts more than 5 seconds and runs alongside other content needs a pause control. A preload animation counts as essential only if interaction is impossible during it.
- **2.3.1 (A):** nothing flashes more than 3 times per second.
- **2.3.3 Animation from interactions (AAA):** motion triggered by interaction can be turned off. This site treats `prefers-reduced-motion` as required.
- **2.4.1 Bypass blocks (A):** skip link. **2.4.3 Focus order (A).** **2.4.4 Link purpose (A):** never "click here". **2.4.6 Headings and labels (AA)** describe their content.
- **2.4.7 Focus visible (AA).** **2.4.11 Focus not obscured (AA, new):** a focused element must not be *entirely* hidden by author content. Check against the sticky nav, the floating bottom pill and the cookie banner. **2.4.13 Focus appearance (AAA, new):** the indicator is at least a 2px perimeter with 3:1 contrast between its focused and unfocused states.
- **2.5.2 Pointer cancellation (A):** trigger actions on pointer *up*, not down.
- **2.5.3 Label in name (A):** the accessible name contains the visible label text, so voice-control users can say what they see.
- **2.5.7 Dragging movements (AA, new):** anything done by dragging also works with a single tap or click.
- **2.5.8 Target size (AA, new):** ≥24×24 CSS px, or spaced so that 24px circles centred on neighbouring targets don't overlap. Links inside running text are exempt. 2.5.5 (AAA) asks for 44×44. Apple's guidance is 44pt; Material's is 48dp touch and 44dp pointer, with 8dp spacing.

**Understandable**
- **3.1.1 Language of page (A).**
- **3.2.1 / 3.2.2 On focus / on input (A):** focusing or changing a control must not change the page context without warning. Auto-advancing a quiz when an option is picked needs advance notice.
- **3.2.3 Consistent navigation (AA)** and **3.2.4 Consistent identification (AA).**
- **3.2.6 Consistent help (A, new):** contact details, contact mechanisms and self-help appear in the same order relative to the page on every page. Here that means "Book a free call" and the footer email.
- **3.3.1 Error identification (A)**, **3.3.2 Labels or instructions (A)**, **3.3.3 Error suggestion (AA):** name the field, describe the problem in text, suggest the fix.
- **3.3.7 Redundant entry (A, new):** never ask for the same information twice in one process.
- **3.3.8 Accessible authentication (AA, new):** no memory or puzzle tests at login; allow pasting and password managers.

**Robust**
- **4.1.2 Name, role, value (A):** custom widgets expose their name, role and state to assistive technology.
- **4.1.3 Status messages (AA):** results, confirmations and errors are announced without moving focus (`aria-live` / `role="status"`).
- 4.1.1 Parsing has been removed from WCAG.

WCAG 3 is still a Working Draft (Sept 2026), and its contrast algorithm is undecided. APCA is a candidate, not the standard; measure with WCAG 2 ratios.

## 3. Heuristic pass

**How to run it (NN/g):**
- Narrow the scope to one task, one section, one user group and one device.
- Timebox it to 1–2 hours.
- Pass 1: use the page as a visitor would, without judging.
- Pass 2: log each problem against a heuristic, with a severity rating and a suggested fix.

**The ten heuristics (NN/g, wording reviewed in 2024):**
1. **Visibility of system status:** feedback within a reasonable time, ideally immediately. No consequential action happens without telling the user.
2. **Match the real world:** use the reader's words, not internal or B Lab jargon. Natural mapping between controls and their effects. Never assume your understanding of a term matches the reader's.
3. **User control and freedom:** a clearly marked emergency exit, plus undo.
4. **Consistency and standards:** internal consistency (within the site) and external consistency (with the web: Jakob's Law).
5. **Error prevention:** prevent costly errors first. Avoid *slips* (inattention) with constraints and good defaults. Avoid *mistakes* (a wrong mental model) by removing memory burdens, supporting undo and warning.
6. **Recognition rather than recall:** labels and options stay visible or easy to bring back. Help appears in context, not in a tutorial people must memorise.
7. **Flexibility and efficiency:** accelerators for experts that stay invisible to novices.
8. **Aesthetic and minimalist design:** every extra unit of information competes with the relevant ones. This does *not* mean flat design. Apple: "Simplicity isn't minimalism."
9. **Error recovery:** plain language and no codes; say exactly what went wrong and offer a solution; use a recognisable error treatment.
10. **Help and documentation:** searchable, task-focused, concrete steps, shown in context.

**Other lists worth adding:**
- **Norman:** affordance vs *signifier*. The signifier is the visible cue; links must look like links. Also mapping, constraints, feedback and the user's conceptual model. When people fail, the fault is usually the design's communication.
- **Shneiderman:** design dialogs to yield **closure** (a clear end state); keep users in control (no forced tours or unrequested changes).
- **Tognazzini:** **protect users' work** ("the single most important rule"); latency reduction; tell users where they are, where they can go and how to get back; defaults that are safe and reversible.

## 4. Psychology "laws": evidence grade and correct use

| Principle | Evidence | Use it like this |
|---|---|---|
| **Fitts's Law** | Strong. Mathematical model (1954). | Big, near targets for primary actions; extend hit areas with padding. Screen edges and corners are "infinite" targets on a desktop operating system, but not inside a browser page or on touch screens. |
| **Hick–Hyman Law** | Strong, but narrow: reaction time to *known, equally likely* choices. | Cut and group options, and set defaults where most people pick the same value. Searching an unfamiliar list is serial (UX Guidelines' "the brain doesn't read linearly" is wrong for that case). It sets no magic menu length. |
| **Jakob's Law / mental models** | Strong as a convention. | Spend novelty on content, not on navigation or controls. Make changes gradually. |
| **Miller's Law** | Widely misapplied. | 7±2 was about working memory, and Cowan's later work puts it nearer 4. Apply the limit only to what users must *carry* between steps, never to on-screen item counts. The real lesson is chunking. Laws of UX itself says not to use 7 to justify limits. |
| **Doherty Threshold (400 ms)** | Weak. A 1982 IBM paper with a commercial motive. | Prefer Nielsen's limits: **0.1 s** feels instant, **1 s** keeps the flow of thought, **10 s** loses attention (show percent-done beyond that). Acknowledge within 100 ms (pressed state, skeleton screen). **Reject** Laws of UX's advice to add deliberate delays or show progress bars "regardless of their accuracy". |
| **Peak-End Rule** | Good (Kahneman 1993; colonoscopy studies). | Fix the single worst moment first, then design the final screen: confirm what happened and offer one next step. Endings include cancellations and declines. |
| **Zeigarnik Effect** | **Failed replication.** A 2025 meta-analysis of 59 studies found a recall ratio of about 0.99, meaning no memory advantage. What does hold is the *Ovsiankina* effect: people tend to resume interrupted tasks. | Show honest progress and resumable state. Never manufacture incompleteness ("1 step left", streaks). |
| **Goal-Gradient Effect** | Moderate (Kivetz coffee-card study). | Show real progress ("Question 3 of 4"). Ignore Laws of UX's "artificial progress" advice; that is a dark pattern. |
| **Choice overload / paradox of choice** | **Conditional.** Average effect about 0 across 50 experiments (Scheibehenne 2010). It appears with complex sets, hard tasks, uncertain preferences and effort-minimising goals (Chernev 2015). The jam study is a single study. | Applies to the 3-tier pricing: recommend one tier and allow side-by-side comparison. Don't cite "6 jams converted 10×" as settled science. |
| **Von Restorff / selective attention** | Good. | One distinctive element per screen, not signalled by colour alone. Distinct styling that *looks like an ad* gets ignored (banner blindness), and animation makes it look more like one. |
| **Serial position** | Good for recall of lists. | Key items go first or last. |
| **Aesthetic-usability effect** | Good (Kurosu & Kashimura 1995). | A polished site *hides* usability problems in testing. Test function, not impressions. |
| **Gestalt (proximity, similarity, common region, connectedness)** | Strong perceptual basis. | Spacing and containers show which things belong together before any label is read. |
| **Tesler's Law** | A principle, not data. | Move complexity onto Candor and the system, not onto the reader. |
| **Postel's Law** | Engineering principle. | Accept phone or email formatting variations and normalise them yourself. |
| **Golden ratio** | Mostly folklore (Markowsky 1992). People prefer it only mildly, and 3:2 or 5:3 do nearly as well. | Use 1.618 for editorial display type at most, not as UI evidence. Alignment beats the ratio. |
| **F-pattern / Gutenberg / Z-pattern** | F-pattern: eye-tracking data, but it's people's *fallback* when a page lacks structure. Z-pattern: a designer's heuristic. Gutenberg: only for pages that are all text. | Front-load headings and links with the words readers are scanning for. Strong hierarchy turns scanning into the "layer-cake" pattern (eyes jump heading to heading), which is what you want. |
| **Processing fluency** | Good: easy-to-read text is judged more true and more competent. A 2015 replication found that making text *harder* to read does not deepen thinking. | Legible type, strong contrast and plain words build credibility. Never degrade legibility on purpose. |
| **Anchoring** | Strong (Tversky & Kahneman 1974). | The first price shown frames the rest. Order tiers deliberately, and every tier must be one people would really buy. |
| **Default effect** | Strong; the nudge that best survives scrutiny. | Pre-select what serves the user. Privacy defaults to the protective option (GDPR Art. 25), which the consent banner already does. |
| **Social proof** | Strong, *if real*. | The FTC's 2024 rule bans fake reviews and testimonials, including AI-generated ones. This matches the site's claims policy: no testimonials until there are real, named clients. Never show a low number. |
| **Dark patterns** | Documented harms and regulator fines (FTC/Amazon $2.5B, CNIL €150M vs Google). | Test: "would people choose this if they fully understood it?" Accept and Decline take equal effort; leaving is as easy as joining; the full price is shown up front. |

## 5. Platform guidance translated to the web

**Apple HIG**
- **Principles (reintroduced June 2026):** Purpose, Agency, Responsibility, Familiarity, Flexibility, Simplicity, Craft, Delight. "Don't mistake delight for decoration."
- **Motion:**
  - Only with a job, and never the only carrier of information.
  - Avoid animating interactions people repeat often.
  - **Let people cancel motion; never make them wait for an animation**, especially a repeated one.
  - When reduced motion is on, also reduce *automatic* animation: swap x/y/z movement for fades and avoid animating depth, blur and bounce.
- **Feedback:** match the level of interruption to how important the message is. Warn only about losses people wouldn't expect; confirm only significant completions.
- **Buttons:**
  - One or two prominent buttons per view.
  - Show the preferred choice by *style*, not *size*.
  - Every custom button needs a pressed state.
  - A destructive action never gets the primary style.
- **Writing:**
  - Labels start with a verb ("Send", not "Let's do it!").
  - One capitalisation rule per element type.
  - Avoid "we" in errors ("Unable to load content").
  - Address the reader as "you"; define jargon; keep humour rare.
  - Error messages sit next to the problem and say how to fix it ("Use at least 8 characters").
- **Loading:** show something immediately. A splash screen lasts only as long as it takes to read.
- **Typography:** avoid light weights at small sizes; use few typefaces; keep the hierarchy when text is enlarged.
- **Colour:** one meaning per colour; check every appearance mode; colour meanings vary by culture.
- **Layout:** important content at the top and leading edge; alignment shows relationships and indentation shows subordination; progressive disclosure; about 12px between bordered controls and 24px between borderless ones.

**Material 3**
- **Motion:** now uses spring physics (expressive or standard scheme; spatial vs effects springs; fast, default and slow speeds). The old easing and duration tokens (short 50–200 ms, medium 250–400 ms, long 450–600 ms; emphasized-decelerate `cubic-bezier(.05,.7,.1,1)`) are "no longer maintained". Effects such as colour and opacity must not overshoot.
- **Type:**
  - Five roles × three sizes.
  - Line height about 1.2 for display and headline text, about 1.5 for body and label text.
  - **40–60 characters per line** (Bringhurst: 45–75; WCAG AAA: ≤80).
  - Tabular figures for numbers that change.
  - **Links must be underlined.**
- **Buttons:**
  - Labels in sentence case, 1–3 words, never truncated or wrapped.
  - One filled (highest-emphasis) button per page.
  - Avoid the outlined style next to chips or large text.
  - Keep DOM order the same across breakpoints.
- **Text fields:**
  - Every field has a label that stays visible.
  - Mark required fields with an asterisk and explain it once.
  - Error text *replaces* the helper text (so the layout doesn't jump) and is paired with an error icon.
  - Higher density only as an opt-in.
- **States:** hover, focus, pressed, dragged and disabled each need **two visual indicators**, not colour alone.
- **Structure:**
  - Landmarks: one main, one banner, one contentinfo; label repeated landmarks.
  - Headings follow the content hierarchy, never skip a level, and there's one H1.
- **Colour roles:** each "on-X" colour is the text colour for X; container colours are never used for text; *outline* marks important boundaries and *outline variant* is decoration only.
- **Breakpoints** (renamed from window size classes, May 2026): compact / medium / expanded / large / extra-large. At each step, decide what to reveal, divide, resize, reposition or swap.

**Where Apple and Material disagree:** Material allows different button *sizes* within a button group to show emphasis; Apple says to use style, not size. On this site, follow Apple. The site's buttons are standalone CTAs, not button groups.

## 6. Known findings on this site (Oct 2026)

These are single-evaluator findings: treat them as likely problems and confirm before large changes.

**Token contrast, measured with WCAG 2 relative luminance**

| Text | on `--bg` #ECEAE2 | on `--paper` #F5F3EE | on `--ink` #0D1610 |
|---|---|---|---|
| `--ink` | 15.30 | 16.62 | — |
| `--body` | 6.50 | 7.06 | 2.36 ✗ |
| `--green` | 5.29 | 5.75 | 2.89 ✗ |
| `--field` | 3.51 (large text only) | 3.81 (large text only) | 4.36 ✗ for small text |
| `--sage` | 2.44 ✗ | 2.66 ✗ | 6.26 |
| `--stone` | 1.46 ✗ | 1.59 ✗ | 10.47 |
| `--muted` #64625A | 5.07 (4.67 on `--light`) | 5.51 | — |

**Fixed (Oct 2026)**
- **Grey meta text (was a 1.4.3 failure, severity 3).** `--stone` text (about 1.6:1) in the blog `.article-meta`, `.card-meta`, figcaptions and `.timeline-label`, and in the `.article-meta` / `.policy-note` of the 404, privacy and terms pages, now uses the new `--muted` token. The post template `scripts/templates/post.html` was updated too.
- **Small `--field` labels on the dark assessment page** (eyebrows, question number, verdict eyebrow at 3.90:1 on the verdict banner, metric labels, mobile-menu link) now use `--sage`: 6.26:1 on ink, 5.59:1 on the banner. The large headline `em` keeps `--field`, since large text needs only 3:1.
- **Homepage loader** (`index.html`, "PAGE LOAD ANIMATION", rebuilt Oct 2026):
  - The Candor mark assembles on the page colour (shape 0.6 s, three rings drawn 0.32–1.14 s, dot at 1.08 s, small wordmark), then the page opens through a circle growing from the dot (0.85 s) while the hero entrance plays. Every beat lands by 1.5 s; it's gone by about 2.4 s. No tagline, so the hero h1 stays the LCP (0.2–0.6 s, was 2.9 s).
  - `html.ld-on` is set by a tiny script in `<head>` (first visit this session, motion allowed), so repeat visits, reduced motion and no-JS never render it; a CSS failsafe hides it at 4 s if its script fails.
  - Skippable with a click, tap or any key (quick fade). Verified in Chromium in normal, repeat-visit, reduced-motion and no-JS modes.
- When adding beats to the loader, keep them before the 1.55 s reveal.
- **Brand Guide** (`Brand Guide/Brand Guide.html`): its four `--stone` type rules now use `--muted`; there is a new "13 / Muted" swatch; and the Stone swatch no longer recommends Stone for input outlines (1.5:1, where form-field borders need 3:1).

**Checked and passing**
- **Consent banner:** Accept and Decline are both one-click buttons of the same size; Esc declines; GPC is honoured; the default is denied. Decline is outlined and Accept filled, a mild asymmetry that is acceptable.
- **Assessment (rebuilt Oct 2026, light theme, no email gate):** native radio/checkbox inputs in fieldsets with the question as the legend (1.3.1, 4.1.2); a text error appears if Continue is pressed without an answer (3.3.1); the optional email field has a visible label, `autocomplete="email"` (1.3.5) and a text error (3.3.3); an `aria-live` step announcer (4.1.3); focus moves to each new question; axe clean on every screen; no reflow at 320px.
- **Blog body links:** underlined, `--forest` (5.75:1 on paper).

Use `--muted` for small secondary text on light backgrounds. `--sage` and `--stone` are fine for decoration (the highlighter stroke, rules and borders that carry no meaning), but not for text on light backgrounds.

## 7. Learning path (from the HCI textbook's authors)

For a career in UX, the textbook (Hornbæk, Kristensson, Oulasvirta) recommends starting with design processes, then learning in this order:
1. Usability as a construct
2. Interviews
3. Surveys
4. Sketching
5. Heuristic evaluation
6. Experimental evaluation
7. Field evaluation
8. Requirements analysis
9. Engineering methods
10. Software-engineering methods

The laws in §4 are vocabulary, not method.

## Sources

| Source | Status in this environment |
|---|---|
| WCAG 2.2 — https://www.w3.org/TR/WCAG22/ · Quick reference — https://www.w3.org/WAI/WCAG22/quickref/ · Understanding — https://www.w3.org/WAI/WCAG22/Understanding/ | Read in full |
| NN/g heuristics — https://www.nngroup.com/articles/ten-usability-heuristics/ · Method — https://www.nngroup.com/articles/how-to-conduct-a-heuristic-evaluation/ · Severity — https://www.nngroup.com/articles/how-to-rate-the-severity-of-usability-problems/ · Response times — https://www.nngroup.com/articles/response-times-3-important-limits/ | Read |
| Apple HIG — https://developer.apple.com/design/human-interface-guidelines/ (page JSON: `https://developer.apple.com/tutorials/data/design/human-interface-guidelines/<page>.json`) | 18 pages read |
| Material 3 — https://m3.material.io/ (a client-rendered app: fetch it with Playwright via `/opt/node-tools/node_modules/playwright` and `proxy: {server: process.env.HTTPS_PROXY}`) | 18 pages read |
| Laws of UX — https://lawsofux.com/ (each entry at `/<slug>/index.md`) | All 30 read |
| UX Guidelines — https://www.ux-guidelines.com/ | 25 of 89 pages read |
| Introduction to HCI — https://introductiontohci.org/ (chapters at academic.oup.com) | Preface and contents only; OUP is blocked |
| Replication evidence: Ghibellini & Meier 2025 (Zeigarnik) — https://www.nature.com/articles/s41599-025-05000-w · Scheibehenne 2010 / Chernev 2015 (choice overload) | Via search |
| Legacy or unverified: usability.gov (moved to https://digital.gov/topics/usability/), material.io/design (Material 2), proux.design (not found) | Not used |
