# Content, conversion and trust

## Copy and microcopy

- **Voice:** one voice, with tone adjusted to the situation (Apple): calm on errors and payments, warm on success.
- **Plain language:** define jargon on first use, avoid idioms and in-jokes (they don't translate and they exclude). Writing simply makes the writer seem *more* credible (processing fluency).
- **Address the reader as "you".** Avoid "we" in errors ("Unable to load content", not "We're having trouble…").
- **Buttons and links** say what happens: "Get my quote", "Download the guide". Never "Submit", "Click here" or "Learn more" ×12. Keep labels consistent through a flow (Get started → Continue → Done).
- **Front-load** headings and links with the word the reader is scanning for (F-pattern and layer-cake scanning). Avoid identical openings down a list ("Our …, Our …"), because readers skip repeated prefixes.
- **Errors:** at the field; say what's wrong and how to fix it ("Use at least 8 characters", not "Invalid password"); no blame; no "Oops!".
- **Empty states:** explain and offer the next action.
- **Curse of knowledge:** the team can't see its own jargon. Flag every term a first-time visitor wouldn't know.

## Forms (conversion's biggest lever)

- Ask only what you need; every extra field costs completions. Get data from the system where possible (location, autofill). Never ask for the same thing twice (WCAG 3.3.7).
- Offer choices instead of free text where the set is small (Apple), but not dropdowns for 3 options (use radios).
- **Labels:** visible and persistent; `autocomplete` and `inputmode` set; correct `type` (email, tel); hints for format.
- **Validation:** inline on blur, not while typing; don't clear input on error; summary plus focus on the first error on submit.
- **Long forms:** steps with a visible count ("Step 2 of 4") and a summary before submit; preserve input on back navigation (Tognazzini: protect users' work).
- **Confirmation:** say what happened, what happens next and when (peak-end: the last screen is remembered most).

## Conversion structure (landing pages)

- **Five-second test:** what, for whom, why believe it, what next. Fail any one and conversion leaks.
- **Hick-Hyman:** decision time grows with the number of *known, equally likely* options. Cut and group options, and set defaults. It does *not* set a magic number.
- **Choice overload is conditional, not universal.** The average effect across experiments is about 0 (Scheibehenne 2010). It appears with complex sets, hard decisions, uncertain preferences and effort-minimising goals (Chernev 2015). For pricing tiers:
  - Recommend one.
  - Allow side-by-side comparison of up to ~4.
  - Explain the differences in terms the buyer cares about.
- **Anchoring** (strong evidence): the first number seen frames the rest. Order tiers deliberately. Every tier must be one people would really buy, and struck-through prices must be real (EU: the lowest price in the prior 30 days).
- **Defaults** (strong): pre-select what serves the *user*. Privacy defaults are protective (GDPR Art. 25).
- **Social proof** (strong *if real*): specific, attributable, relevant to the visitor (same role, industry, region). Never show low numbers. Fake or AI-generated reviews and testimonials are banned (FTC rule, 2024). Flag unsourced statistics and anonymous quotes.
- **Goal gradient:** honest progress indicators speed completion. "Artificial progress" is a dark pattern.
- **Peak-end:** fix the worst moment first (a surprise fee, an error, a crash), then design the ending (confirmation, next step). Endings include cancellation and unsubscribe.
- **Aesthetic-usability effect:** polish makes people *rate* a site as usable and forgive flaws. It also hides problems in testing, so audit function, not vibes.

## Trust and ethics (dark patterns)

The test: **would people make the same choice if they fully understood it?** Flag:
- **Asymmetric consent:** "Accept" is one click and "Reject" is several, or reject is hidden or greyed. (CNIL fined Google €150M and Facebook €60M for this.) Accept and Reject should take equal effort and carry similar prominence.
- **Roach motel:** easy to join, hard to leave (FTC v. Amazon Prime, $2.5B settlement, 2025).
- **Confirmshaming:** "No thanks, I don't like saving money."
- **Drip pricing:** fees revealed late.
- **False urgency or scarcity:** countdowns that reset, fake "only 2 left".
- **Bait and switch; sneak-into-basket; pre-ticked add-ons; disguised ads; nagging.**
- **Manufactured incompleteness:** fake "1 step left", guilt streaks. (The Zeigarnik *memory* effect failed replication in a 2025 meta-analysis; the pull to *resume* tasks does hold. Use it honestly, with resumable state.)
- **Privacy:** analytics before consent, no Global Privacy Control (GPC) honouring where required, unclear data use at the point of collection.

Trust signals worth crediting: real contact details, named people, transparent pricing, sourced claims, clear policies, consistent help placement.

## Perceived performance

- **Nielsen's limits:** 0.1 s feels instant · 1 s keeps flow · 10 s loses attention (show percent-done).
- **Core Web Vitals "good" thresholds:** LCP ≤2.5 s · CLS ≤0.1 · INP ≤200 ms (long tasks are a proxy for INP).
- **Show something immediately** (Apple): skeletons over spinners, optimistic UI for low-risk actions, and stream long content.
- **Don't fake it:** "add a delay to seem valuable" and "progress bars regardless of accuracy" (both from Laws of UX's Doherty page) are manipulation. Don't recommend them.
- The Doherty "400 ms" figure comes from a 1982 IBM sales-motivated paper; cite Nielsen's limits instead.
- **Heavy pages:** flag pages over ~2–3 MB on mobile, images more than 2× their display size, render-blocking third parties, and more than 3–4 font files.
