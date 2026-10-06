# Motion audit

Motion is a design material, not decoration. Judge it the way a motion designer would: does each movement have a **job**, the right **timing**, the right **feel**, and a **fallback**? Credit good motion as loudly as you flag bad motion, and point out where motion is *missing* (state changes that snap, content that pops in with no continuity). An audit that only polices motion is half an audit.

Sources: Apple HIG Motion and Accessibility, Material 3 motion (springs, plus the older easing and duration tokens), WCAG 2.2 (2.2.2, 2.3.1, 2.3.3), NN/g response-time limits, UX Guidelines (Doherty, change blindness).

## 1. Jobs: every animation needs one

| Job | What it does | Example |
|---|---|---|
| **Feedback** | Confirms an input landed | Press state, toggle snap, submit button turning into a spinner and then a tick |
| **Orientation / continuity** | Shows where something came from or went | A card expanding into its detail page; a menu sliding from its trigger |
| **Focus** | Pulls the eye to what changed | A new item easing in; an error shake (short, once) |
| **Status** | Shows the system working | Progress, skeleton screens, streaming text |
| **Narrative / brand** | Sets tone at a defining moment | A hero entrance, a success state, a first-run moment |

If an animation fits none of these, it's decoration. Decoration is allowed in small doses on brand surfaces, but never on frequent interactions, and never if it delays the task. Apple: "Don't add motion for the sake of adding motion." "Don't mistake delight for decoration."

## 2. Timing

- **Response:** acknowledge input within **100 ms** (0.1 s feels instant). Under **1 s** keeps the flow of thought; at **10 s** attention is gone, so show percent-done (Nielsen). Acknowledge first, then do the work: press states, optimistic UI, skeletons.
- **Duration by distance and size** (Material 3's token scale, a good yardstick):
  - Small (selection controls, icons, hover): **50–200 ms**
  - Medium (menus, cards, panels crossing part of the screen): **250–400 ms**
  - Large or expressive (full-screen, hero, shared-element transitions): **450–600 ms**
  - Over 600 ms: ambient or non-interactive only. On anything the user waits for, it reads as lag.
- **Exits are faster than entrances**, roughly 70–80% of the entrance time. Leaving content shouldn't hold the user.
- **Frequent interactions get the least motion.** Apple: avoid adding motion to interactions people repeat; the hundredth time it's friction.
- **Never make people wait for an animation to finish** (Apple, "let people cancel motion"). Inputs during an animation should work or retarget it. Splash screens, loaders and intro sequences must be skippable, and the total should be roughly as long as it takes to read the mark, about 1–2.5 s.
- **Stagger:** 20–60 ms between items, and cap the total at about 300 ms. Long cascades read as slow.

## 3. Feel: easing and springs

- **Linear** is for continuous things only: progress, rotation of a loader, marquees. On a position change it looks mechanical.
- **Ease-out / decelerate** for things entering ("arrives and settles"). **Ease-in / accelerate** for things leaving. **Ease-in-out / standard** for things moving within the screen.
- Material 3 CSS references:
  - standard `cubic-bezier(0.2,0,0,1)`
  - emphasized-decelerate `cubic-bezier(0.05,0.7,0.1,1)`
  - emphasized-accelerate `cubic-bezier(0.3,0,0.8,0.15)`
- **Springs** (Material 3 Expressive now favours them; Apple uses them everywhere): use them for gesture-driven and interruptible motion, because they retarget naturally. Overshoot (bounce) belongs on *spatial* motion only; **colour and opacity never overshoot** (Material's "effects" springs).
- **One motion personality per product:** 2–3 easing curves and a short duration scale, used consistently. The collector's duration and easing histogram shows sprawl. Ten different durations means no system.
- **Motion that follows the finger:** gesture-driven motion tracks input 1:1 and settles with velocity. If a view slides down to reveal, it slides up to dismiss, not sideways (Apple).

## 4. Choreography and continuity

- One focal movement at a time. Simultaneous unrelated animations split attention, and motion in the periphery pulls the eye (banner blindness, distraction).
- Things should move *from* their source: a menu from its button, a modal from its trigger, a detail view from its card (shared-element or container transform). Elements that teleport break the user's mental model.
- Keep spatial logic consistent: if forward is right-to-left, back is left-to-right everywhere.
- **Change blindness:** a state change with no motion cue (a cart count updating, a filter applying, inline validation) is easy to miss. That's a missed motion opportunity; flag it as one.
- **Scroll-driven motion:** reveal-on-scroll should be subtle (short travel, ≤400 ms, once). Pinned or "scrollytelling" sections:
  - Cap the track length (beyond about 2 screens of pinned track per section, users feel stuck).
  - Never hijack scroll speed or direction.
  - Always leave an exit: users must be able to scroll past.
  - Measure with the collector's `pinnedScrollTracks`.
- **Ambient motion** (drifting shapes, gradients, particles, marquees) is a brand flavour. It must be slow, low-contrast, never behind body text, paused off-screen, and off under reduced motion. Infinite motion that runs alongside content for more than 5 s needs a pause control (WCAG 2.2.2, level A). Purely decorative background drift is a judgement call, so flag it as a lead and say which way you lean.

## 5. Performance (motion that stutters is worse than none)

- Animate **transform and opacity** only; they run on the compositor. Animating `width`, `height`, `top`, `left`, `margin` or `box-shadow` forces layout or paint, and drops frames on mid-range phones. The collector lists layout-property animations.
- Hold 60 fps. Long tasks during scroll or entrance show as jank. Check `longTaskMs` and watch the screenshots for half-rendered states.
- Animated `backdrop-filter` and large `filter: blur()` are expensive. Use them sparingly and never on scroll.
- Entrance animations must not delay LCP or cause CLS. Content hidden at opacity 0 until JS runs is invisible without JS and to some crawlers. The collector's no-JS run catches "stuck at opacity 0".

## 6. Accessibility of motion

- **`prefers-reduced-motion: reduce`** (WCAG 2.3.3 AAA, but treat it as required): turn off or replace motion that moves, zooms, parallaxes or blurs. Apple's substitutions:
  - Swap x/y/z movement for **fades**.
  - Tighten springs (no bounce).
  - Stop autoplaying and peripheral motion.
  - Avoid animating depth and blur.

  Keep essential feedback (state changes) as fades or instant swaps. *Reduced* motion doesn't mean *no feedback*. The collector's reduced-motion run lists what still moves.
- **Never the only carrier of information** (Apple): pair motion with text, icon or state change.
- **Flashing:** no more than 3 flashes per second (2.3.1, level A).
- **Auto-moving content over 5 s** alongside other content: pause, stop or hide control (2.2.2, level A). This includes carousels, tickers, autoplay video and looping hero video.
- **Autoplay video:** muted, with visible controls, honouring reduced motion. GIFs can't be paused or reduced; prefer video with a poster frame.
- **Vestibular triggers** (worst first): large-area parallax, zoom and scale of full-screen content, spinning, scroll-jacking, depth (z) movement, blur transitions.
- **Custom cursors and cursor-follow effects:** they must not hide the system cursor's precision, must not lag input, and must be disabled on touch and under reduced motion.

## 7. Motion audit procedure

1. Read the collector's Motion section: system histogram, what's running when, scroll-triggered motion, reduced-motion residue, layout-property animations, splash timing, pinned tracks, no-JS opacity.
2. Watch it. Use the scroll screenshots, and when something matters, record a short sequence with Playwright: `page.screenshot` every 100 ms for 1.5 s during the interaction, or `recordVideo` on a context. Check entrances, menu open and close, modal, hover and press states, form submit and error, page transitions.
3. Interact mid-animation: click during an entrance, press Esc during a modal open, scroll during an intro. Does input wait or work?
4. Score each motion element by job, timing, easing, fallback and performance.
5. Report:
   - **✓ Working:** motion that earns its place (be specific; credit it).
   - **✗ Problems:** severity, element, issue and fix.
   - **＋ Opportunities:** state changes, feedback or continuity that motion would improve, each with suggested duration and easing.

## 8. Red-flag list (fast scan)

- Intro or loader over 2.5 s, or not skippable, or still present without JS or under reduced motion
- Scroll hijacking or speed manipulation; pinned tracks over ~2 screens with sparse content
- Hover-only reveals with no focus or touch equivalent
- Button press with no pressed state; submit with no in-flight state
- Content that pops in, snaps or jumps (no continuity), or layout shift from late-loading content
- Every element fading up on scroll: monotonous, slow, and it hides content from no-JS users
- More than 6 distinct durations, or more than 3 easing curves in the system
- Infinite motion near reading content; parallax behind text
- Motion ignores `prefers-reduced-motion`, or the reduced mode also removes feedback
- Layout-property animation; janky scroll; blur animations
- Bouncy overshoot on colour or opacity, or on serious UI (errors, payments)
