# Usability: heuristics and task walkthrough

Heuristics find *likely* problems. They are rules of thumb, not laws. Breaking one isn't automatically a bug: NN/g's own example is a hamburger menu, which violates "recognition rather than recall" yet is often the right mobile trade-off. Say so when a violation is a reasonable trade-off.

## Method (NN/g heuristic evaluation)

1. **Scope:** one primary task per page type, one user group, mobile *and* desktop. Infer the primary task from the page: the main call to action, the navigation, the hero promise.
2. **Pass 1, use it:** do the task as a first-time visitor. Note where you hesitate, misread or backtrack.
3. **Pass 2, evaluate:** walk the same path against the 10 heuristics below. Log each problem with heuristic number, severity, evidence and fix.
4. **Rate severity (0–4)** on frequency × impact × persistence:
   - 0 = not a problem
   - 1 = cosmetic
   - 2 = minor
   - 3 = major (high priority)
   - 4 = catastrophe (fix before release)
5. **Caveat honestly:** one evaluator's severity ratings are unreliable (NN/g recommends 3–5 evaluators, with the mean of 3 for severity). One line in the report says findings are expert predictions that testing with 5 users would confirm.

## The 10 heuristics (Nielsen; wording reviewed 2024), with what to look for

1. **Visibility of system status.** Feedback within a reasonable time, ideally immediately; no consequential action without telling the user. *Look for:* no pressed or loading state, a silent submit, no "you are here" in navigation (no `aria-current` and no visual active state), no progress in multi-step flows.
2. **Match between system and real world.** The user's language, natural mapping, real-world order. *Look for:* internal jargon, acronyms, clever-but-vague nav labels ("Solutions", "Explore"), prices without units or currency.
3. **User control and freedom.** A clearly marked emergency exit, plus undo. *Look for:* modals without a visible close or Esc, forced tours, no back path in flows, destructive actions with no undo.
4. **Consistency and standards.** Internal consistency (same thing, same look and behaviour) and external consistency (works like other sites: Jakob's Law). *Look for:* several button styles for the same rank of action, links that don't look like links, logo not linking home, inconsistent terms.
5. **Error prevention.** Prevent costly errors first. *Slips* (inattention) are prevented by constraints and defaults; *mistakes* (a wrong mental model) by clarity, confirmation and undo. *Look for:* free-text where a picker would do, no format hints, destructive buttons styled as primary.
6. **Recognition rather than recall.** Options and earlier inputs stay visible. *Look for:* placeholder-only labels that vanish while typing, hidden navigation on desktop, multi-step flows that don't summarise earlier answers.
7. **Flexibility and efficiency.** Accelerators for experts that novices never see. *Look for:* no search on content-heavy sites, no keyboard support, no autofill.
8. **Aesthetic and minimalist design.** Every extra unit of information competes with the relevant ones. This is *not* a call for flat or empty design. Apple: "Simplicity isn't minimalism." *Look for:* competing CTAs, decorative noise around the primary task, walls of text, dense heroes.
9. **Help users recognise, diagnose and recover from errors.** Plain language, no codes, a precise problem and a constructive fix, shown at the field. *Look for:* "Invalid input", red colour alone, errors only at the top, input wiped on error.
10. **Help and documentation.** Searchable, task-focused, in context. *Look for:* no FAQ or contact path near hard decisions (pricing, forms); help in a different place on each page (WCAG 3.2.6).

## Other lists that add value

- **Norman:** affordance vs **signifier**. The signifier is the visible cue: links look clickable, cards that click look clickable. Also *mapping*, *constraints*, *feedback* and the user's *conceptual model*. "When people fail, the fault is usually the design's communication."
- **Shneiderman:** design dialogs to yield **closure** (every flow has a clear end state); keep users in control (no surprise changes, no forced tours); reduce short-term memory load.
- **Tognazzini:**
  - **Protect users' work** ("the single most important rule"): forms survive errors and back navigation, drafts persist.
  - Anticipation.
  - Latency reduction.
  - Visible navigation ("where am I, where can I go, how do I get back?").
  - Safe, reversible defaults.
- **Processing fluency:** clean type, strong contrast and plain words make content feel truer and more credible. Hard-to-read text does *not* deepen thinking (a large 2015 replication found no benefit).

## Information architecture and navigation

- Global navigation is stable on every page. Local navigation shows siblings; utility navigation (search, account, contact) sits apart; breadcrumbs appear where the hierarchy runs deeper than 2 levels.
- **Nav labels:** front-load the word users scan for; one concept per label; don't mix verbs and nouns.
- Group options sensibly. There is no magic menu length (the "7±2" rule is a misreading of Miller). Groups of about 4 work; beyond about 50 items, add search.
- The current page is marked visually *and* with `aria-current`.
- Mobile navigation: primary actions within thumb reach (bottom half); the menu trigger is labelled; the open menu traps focus and closes on Esc and on tap outside.

## Page-level scan (landing and marketing pages)

- **Above the fold:** what is it, who is it for, what do I do next. Answerable in 5 seconds.
- **One primary CTA per view**, with a consistent label sitewide (Apple and Material: one or two prominent buttons per view; Material: one filled button per page).
- **Proof near the claim:** evidence, specifics, real numbers with sources.
- **Scanning:** without structure, readers fall back to the F-pattern. Front-load headings so they produce the "layer-cake" pattern (eyes jump heading to heading). Headings should make sense read alone.
- **The end of the page** (peak-end): close with a clear next step, not a dead end.
