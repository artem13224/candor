---
name: ux-review
description: Evidence-graded UX/UI review checklist for candorcertified.com, distilled from WCAG 2.2, Nielsen Norman Group's heuristics, Apple's Human Interface Guidelines, Material Design 3 and the Laws of UX. Use when critiquing, auditing or designing any page, component, form, animation or copy on the site — "review this page", "is this accessible", "does this UX work", "check contrast", "audit the assessment", "redesign X" — and before shipping visual or interaction changes.
---

# UX review

How to judge a design on this site, and how much weight each kind of rule deserves. Distilled in Oct 2026 from the sources listed at the bottom. Apple's HIG was read in full; the rest came from search excerpts, because this environment's network policy blocks those hosts.

## 1. Weigh the evidence before citing it

Not every "rule" carries the same weight. Say which tier a finding comes from.

| Tier | Sources | How to treat it |
|---|---|---|
| **Standard** | WCAG 2.2 (W3C) | Testable pass/fail with numbers. A failure is a bug. |
| **Platform convention** | Apple HIG, Material 3 | Strong defaults written for native apps. Translate them to the web; don't copy point sizes blindly. |
| **Heuristic** | NN/g 10 heuristics, Shneiderman's 8 golden rules, Tognazzini's first principles | Judgment prompts for finding problems. They don't prove a fix works. |
| **Psychology "law"** | Laws of UX entries | Wide range of evidence quality, from a solid model to pop-science. Check the caveats in §4 before relying on one. |

Usability testing with real people beats every tier. Heuristics find likely problems; only watching people use the site confirms them.

## 2. WCAG 2.2 checks with numbers (level AA unless noted)

- **1.4.3 Text contrast:** 4.5:1 for body text; 3:1 for large text (≥24px, or ≥18.66px bold). Small mono labels count as body text.
- **1.4.11 Non-text contrast:** 3:1 for input borders, icons that carry meaning, and focus indicators.
- **1.4.1 Use of colour:** never use colour as the only signal. Pair it with text, shape or an icon.
- **1.4.4 Resize text:** usable at 200% zoom. **1.4.10 Reflow:** no two-dimensional scrolling at 320 CSS px wide.
- **1.4.12 Text spacing:** nothing breaks with line-height 1.5, paragraph spacing 2×, letter-spacing 0.12em, word-spacing 0.16em.
- **2.2.2 Pause, stop, hide:** anything that moves automatically for more than 5 seconds needs a way to pause it.
- **2.3.3 Animation from interactions (AAA):** honour `prefers-reduced-motion` for motion triggered by scrolling or interaction. This site treats it as required.
- **2.4.7 Focus visible.** **2.4.11 Focus not obscured (new in 2.2):** a focused element must not be hidden behind sticky or floating UI. Check against the floating bottom pill and the nav.
- **2.5.8 Target size (new in 2.2):** at least 24×24 CSS px, or 24px spacing between targets. Aim for 44×44 (Apple) / 48×48 (Material) on primary touch targets.
- **2.5.7 Dragging movements (new):** anything done by dragging needs a single-tap alternative.
- **3.2.6 Consistent help (new, level A):** contact options appear in the same place on every page. Keep "Book a free call" and the footer email consistent.
- **3.3.1–3.3.3 Errors:** identify the field, say what is wrong and suggest the fix. **3.3.2:** every input has a visible label; placeholder text is not a label.
- **3.3.7 Redundant entry (new):** never ask for the same information twice in one flow.
- **1.1.1** Every image has alt text (empty `alt=""` for decoration). **2.4.4** Link text makes sense on its own; never "click here".

WCAG 3 is still a Working Draft (Sept 2026). APCA is a candidate contrast method, not the standard; measure with WCAG 2 ratios.

## 3. Heuristic pass (NN/g 10, merged with Shneiderman and Tognazzini)

Ask each question of the screen under review:

1. **Visibility of system status:** after any action (submitting the quiz, sending the email gate, loading) does the page show what happened, close to where it happened?
2. **Match the real world:** is the copy in the reader's words, not B Lab or consultant jargon? If a technical term is needed, is it defined on first use?
3. **User control and freedom:** is there a clear way out (back, skip, close) and can mistakes be undone? Can people interrupt a motion sequence instead of waiting for it?
4. **Consistency and standards:** does a colour or style mean only one thing? Is the brand green used for both links and non-clickable text? Do links behave like links everywhere else on the web (Jakob's Law)?
5. **Error prevention:** does the design stop predictable mistakes, through sensible defaults, validation as people type, and disabling Continue until required fields are filled?
6. **Recognition rather than recall:** can people see their options and earlier answers instead of having to remember them?
7. **Flexibility and efficiency:** do keyboard users get skip links, logical tab order and Enter to submit?
8. **Aesthetic and minimalist design:** does every element earn its place? Apple's version: "simplicity isn't minimalism". Keep what is important nearby rather than stripping everything out.
9. **Error recovery:** are error messages placed next to the problem, blame-free and specific? ("Use at least 8 characters", not "Invalid input".)
10. **Help:** are contact and help options easy to find, and in the same place on every page?

Shneiderman adds **closure**: each sequence of actions should have a clear end state ("Done", a results screen). Tognazzini adds **protect people's work** and **latency reduction**.

## 4. Laws of UX: how much each one is worth

- **Fitts's Law (solid, a mathematical model):** the time to reach a target depends on its distance and size. Make primary CTAs large and close to where the pointer or thumb already is. Edges and corners are easy targets on desktop, not on touch screens.
- **Hick–Hyman Law (solid, but narrow):** decision time grows with the logarithm of the number of choices *when people already know the options*. Scanning a list of unfamiliar items takes longer in proportion to its length. Lesson: cut and group choices; it does not set a magic menu length.
- **Jakob's Law (strong convention):** people expect your site to work like the sites they already use. Spend novelty on content, not on navigation or controls.
- **Miller's Law (widely misapplied):** Miller's 7±2 was about working memory, and Cowan's later research puts it closer to about 4 chunks. It does **not** limit menu length, because menus are scanned, not memorised. The valid lesson is chunking: group information and don't make people hold things in their head.
- **Doherty Threshold (weak):** the "<400 ms" figure comes from a 1982 IBM paper with commercial motives. Use it as a rough aim (respond quickly, show progress when you can't), not as a threshold from human biology.
- **Tesler's Law:** some complexity can't be removed, only moved. Move it onto the system or onto Candor, not onto the reader.
- **Peak-End Rule:** people judge an experience mostly by its most intense moment and its ending. The assessment results screen and the booking confirmation matter more than the steps in between.
- **Von Restorff Effect:** the one item that looks different gets noticed. Reserve that for the single most important action on a screen, and don't rely on colour alone (§2, 1.4.1).
- **Serial Position Effect:** people remember the first and last items in a list best. Put the key nav items and the key points of a list at either end.
- **Goal-Gradient Effect:** people speed up as they get close to a goal. Show quiz progress ("3 of 4").
- **Zeigarnik Effect:** people remember unfinished tasks. Use it to bring them back to an unfinished assessment, never to guilt them.
- **Aesthetic-Usability Effect:** people perceive attractive designs as easier to use, which also hides real usability problems during testing.
- **Gestalt principles (proximity, similarity, common region):** spacing and grouping signal which things belong together before any label is read.
- **Postel's Law:** accept input in whatever form people give it (spaces in a phone number, capital letters in an email address) and normalise it yourself.

## 5. Platform guidance translated to the web (Apple HIG and Material 3)

- **Apple's eight design principles (reintroduced June 2026):** Purpose, Agency, Responsibility, Familiarity, Flexibility, Simplicity, Craft, Delight. Note "Don't mistake delight for decoration": delight should never get in the way of the task.
- **Motion:** add it only when it has a job. Avoid animating frequent interactions. **Let people interrupt motion; never make them wait for an animation**, especially one they'll see more than once. Never make motion the only way information is conveyed. Reduced-motion substitutes: replace x/y/z movement with fades, and avoid animating depth, blur or bouncy springs.
- **Feedback:** match the level of interruption to how important the message is. Only warn before losses people wouldn't expect, and confirm only significant completions.
- **Buttons:** one or two prominent buttons per view. Distinguish the preferred choice by *style*, not *size*. Every custom button needs a pressed state. Never give a destructive action the primary style.
- **Writing:** labels start with a verb ("Book a call", not "Let's do it!"). Pick one capitalisation rule per element type. Avoid "we" in error messages. Address the reader as "you". Define jargon. Use humour sparingly.
- **Forms:** don't ask for information you already have; offer choices instead of free typing; validate email addresses when the field loses focus; keep a visible label as well as placeholder text; size each field to the expected answer.
- **Loading:** show something immediately. Use determinate progress when the duration is known, indeterminate otherwise. A splash screen should last only as long as it takes to read.
- **Colour:** one meaning per colour; check contrast in every appearance mode; colours carry different meanings in different cultures.
- **Typography:** avoid light font weights at small sizes; use few typefaces; keep the hierarchy intact when text is enlarged. For small custom text, Apple recommends aiming for 7:1 contrast.
- **Layout:** most important content at the top and on the leading side; alignment shows relationships and indentation shows subordination; reveal detail progressively; space controls about 12px apart (24px if they have no visible border).
- **Material 3:** five type roles (display, headline, title, body, label) × three sizes; colour *roles* rather than raw hex values (each "on-X" colour is the text colour for X); motion durations of 50–200 ms for small changes, 250–400 ms for medium and 450–600 ms for large, expressive transitions.

## 6. Known findings on this site (Oct 2026)

Contrast of the Candor tokens, measured with WCAG 2 relative luminance:

| Text | on `--bg` #ECEAE2 | on `--paper` #F5F3EE | on `--ink` #0D1610 |
|---|---|---|---|
| `--ink` | 15.30 | 16.62 | — |
| `--body` | 6.50 | 7.06 | 2.36 ✗ |
| `--green` | 5.29 | 5.75 | 2.89 ✗ |
| `--field` | 3.51 (large text only) | 3.81 (large text only) | 4.36 ✗ for small text |
| `--sage` | 2.44 ✗ | 2.66 ✗ | 6.26 |
| `--stone` | 1.46 ✗ | 1.59 ✗ | 10.47 |

- **Open failure:** `--stone` is used as text colour on `--paper` in every blog post's `.article-meta` (author, date and read time), `.article-img figcaption` (the required source and licence credit) and `.card-meta`, and in `404.html`. That is about 1.6:1 against a 4.5:1 requirement, on 10–11px text. Use `--body` or a new muted token that passes 4.5:1. Also fix `scripts/templates/post.html` so new posts don't inherit the problem.
- **Borderline:** `--field` eyebrow labels on the dark assessment page (`--ink` background) measure 4.36:1 at 10px, just under 4.5:1.
- `--sage` and `--stone` are safe for decoration (the highlighter stroke, rules and borders that carry no meaning), not for text on light backgrounds.

## Sources

- Laws of UX — https://lawsofux.com/
- NN/g 10 usability heuristics — https://www.nngroup.com/articles/ten-usability-heuristics/
- WCAG 2.2 — https://www.w3.org/TR/WCAG22/ · Quick reference — https://www.w3.org/WAI/WCAG22/quickref/ · What's new — https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/
- Apple HIG — https://developer.apple.com/design/human-interface-guidelines/ (page content is readable as JSON at `https://developer.apple.com/tutorials/data/design/human-interface-guidelines/<page>.json`)
- Material Design 3 — https://m3.material.io/ (material.io/design is the older Material 2 site)
- Introduction to Human–Computer Interaction (Hornbæk, Kristensson, Oulasvirta; Oxford University Press, open access) — https://introductiontohci.org/
- UX Guidelines — https://www.ux-guidelines.com/ (index; follow its links back to the original research)
- Not verified: proux.design could not be found by search. usability.gov is a legacy US government site whose content has moved to digital.gov.
