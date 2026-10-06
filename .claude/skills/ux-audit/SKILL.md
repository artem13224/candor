---
name: ux-audit
description: Professional-grade UX/UI audit of any website or web app — accessibility (WCAG 2.2), usability heuristics, visual design system, motion and interaction, content, conversion, trust/dark patterns and perceived performance — measured in a real browser at three screen sizes plus reduced-motion and no-JS runs, then reported as a short severity-ranked table. Use whenever someone wants a site, page, landing page, prototype URL or local build reviewed, critiqued, audited or "checked": "audit my website", "UX review of example.com", "what's wrong with this landing page", "is my site accessible", "design critique", "heuristic evaluation", "why isn't this converting", "check my animations", "review before launch", or a pasted URL with "thoughts?". Prefer it over ad-hoc opinions even for a single page. Not for building new UI from scratch, SEO-only audits, or code review.
---

# UX/UI audit

Do the audit the way a senior design auditor would: **measure everything a browser can measure, look at every screenshot, walk the main task, then report tersely.** Spend effort on checking, not on prose. The reader wants the findings, the evidence and the fix; your process belongs in one line.

## 1. Scope (don't stall on questions)

- **Target:** a URL, a local dev server, or static files (serve them with `python3 -m http.server`). Ask only if there's no target at all.
- **Pages:** the home page plus 2–5 key templates (pricing, a product or article page, the form or checkout, contact). Find them from the main navigation. More pages means more coverage; same template twice means wasted effort.
- **Primary task:** infer it (the main CTA). The walkthrough in step 3 follows it.
- **Project rules:** if the project has its own UX or brand rules (a CLAUDE.md, a design-system doc, a house UX skill), apply them too, and say when the site breaks its *own* rules. Those findings are the most persuasive.

## 2. Measure: run the collector

```bash
node <skill-dir>/scripts/collect.js <url> --pages /,/pricing,/contact --out ux-audit-<host> [--shots 6]
```

- It needs Playwright and Chromium (`npm i -D playwright && npx playwright install chromium` if missing; set `CHROMIUM_PATH` or `PLAYWRIGHT_PATH` for preinstalled copies). It routes through `HTTPS_PROXY` automatically, except for localhost.
- It takes about 45 s per page.
- **What it does:**
  - Renders each page at 375, 768 and 1440 px.
  - Scroll-captures screenshots.
  - Times splash screens and overlays.
  - Inventories running and scroll-triggered animations.
  - Reruns with `prefers-reduced-motion` and with JavaScript off.
  - Tabs through the page (focus visible, obscured or trapped).
  - Checks reflow at 320 px and the text-spacing override.
  - Computes contrast for every text node against its real background.
  - Measures target sizes, headings, landmarks, names, alt text, autocomplete, the type, colour and motion system histograms, images, Core Web Vitals, console errors and third parties.
- **Read `digest.md` first.** It's compact; `report.json` has everything.
- **Then look at every screenshot** in `shots/` (Read them as images), mobile first. Most real problems are visual, and the digest can't see them.
- If Playwright can't run, fall back to fetching the HTML and reviewing statically, and state the reduced coverage in the Coverage line.
- **Automated flags are leads.** Confirm each in a screenshot or with a targeted check before reporting it. Drop false positives: visually hidden skip links, decorative text and logos are exempt from contrast.

## 3. Expert passes

Read the reference file for each pass as you do it; don't load them all up front.

| Pass | Reference | Core question |
|---|---|---|
| Accessibility | `references/wcag.md` | Does it meet WCAG 2.2 AA? Do the manual checks the collector can't: modals, forms, alt quality, hover-only UI |
| Usability | `references/heuristics.md` | Walk the primary task twice (use it, then evaluate) against Nielsen's 10 heuristics |
| Visual | `references/visual.md` | Hierarchy, type, colour, space and components: one coherent system, or sprawl? |
| **Motion** | `references/motion.md` | Does every motion have a job, the right timing and feel, a reduced-motion fallback, smooth performance? Where is motion missing? |
| Content, conversion, trust | `references/content-conversion.md` | Five-second test, forms, CTAs, pricing, proof, dark patterns, perceived speed |
| Claims about psychology | `references/laws.md` | Cite "UX laws" only at the strength their evidence supports |

**Interact, don't just look.** Use short Playwright snippets for what static captures miss:
- open and close the menu and any modals (Esc, focus return);
- submit forms empty and invalid;
- hover and press states on the primary CTA;
- capture motion frames, a `page.screenshot` every ~100 ms through an entrance or transition;
- click during an animation (can input interrupt it?).

**Severity** (NN/g 0–4), from frequency × impact × persistence:
- **4** blocks a task or a user group;
- **3** major, on a primary path;
- **2** minor;
- **1** cosmetic.

Skip 0s.

**Credit what works.** Name 2–4 things the site does well, especially motion and craft. It calibrates the reader and keeps fixes from breaking good parts.

## 4. Report: short, dense, ranked

Use exactly this structure. Tables over prose; no paragraph longer than two lines; table cells ≤15 words; no methodology essay. Collapse repeats ("×14 instances") rather than listing them. Cap the main table at 20 rows. If there are more, say "+N minor in report.json".

```
# UX audit · <site> · <YYYY-MM-DD>
**Verdict:** <≤25 words: overall quality + the one thing that matters most>
**Coverage:** <n> pages · 375/768/1440 + 320 reflow · reduced-motion · no-JS · keyboard · <n> screenshots → `<out-dir>/`

| Area | Grade | Worst issue |
|---|---|---|
| Accessibility | B | … |
| Usability | … | … |
| Visual design | … | … |
| Motion | … | … |
| Content & conversion | … | … |
| Trust & ethics | … | … |
| Performance | … | … |

## Findings
| # | Sev | Area | Issue | Where | Fix | Ref |
|---|---|---|---|---|---|---|
| 1 | 4 | A11y | Loader covers page without JS | home | `<noscript>` hide; skip on reduce | 2.1.1 · no-JS shot |
| … |

## Motion
✓ <what works, ≤10 words each>
✗ <problem → fix, with duration/easing numbers>
＋ <opportunity: where motion would help, with suggested ms + easing>

## Works well
- <2–4 bullets>

## Fix first
1. <highest impact ÷ effort, ≤12 words>
… (5 max)

_Expert prediction by one evaluator; confirm the top issues with 5 real users._
```

**Grades:**
- **A:** no severity ≥3, and at most 2 severity-2 issues.
- **B:** no severity 4, and at most 1 severity 3.
- **C:** 2–3 severity 3.
- **D:** 4 or more severity 3, or any severity 4.
- **F:** several severity 4.

**Ref column:** a WCAG SC number, a heuristic (H1–H10), a guideline source (Apple, M3) or a measurement, plus the evidence (screenshot name or selector). Every finding needs evidence. If you can't point to it, it's not a finding.

**Fixes are specific:** name the value ("#64625A, 5.1:1", "250 ms ease-out", "44×44 hit area"), not "improve contrast" or "make it smoother".

Write the report in chat. Also save it as `<out-dir>/audit.md` so the evidence folder is self-contained.
