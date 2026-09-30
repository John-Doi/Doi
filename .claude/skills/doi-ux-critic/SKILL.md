---
name: "DØi UX Critic"
description: "Reviews (does not redesign) frontend changes to the DØi Labs website for hierarchy, consistency, generic-AI-design smells, and brand/design drift against the doi-design-system skill. Use after implementing any Level 2 or Level 3 frontend change, or whenever asked to critique/evaluate the current design."
---

# DØi UX Critic

An evaluator, not a redesigner. Load `doi-design-system` first — this skill scores work against that standard, it doesn't set new standards of its own.

**Do not rewrite a stable, working section merely because another design is possible.** The job is to catch real problems, not to propose alternatives for their own sake.

## Review Dimensions

Score the change (or the current page, if asked for a general review) against:

- Hierarchy — is the most important content/action visually dominant?
- Readability — font sizes, line length, contrast, spacing between text blocks.
- Visual consistency — does it match the established card/accordion/icon-box/micro-label patterns in `doi-design-system`?
- CTA clarity — is `REQUEST MISSION BRIEF` unambiguous and not competing with another action?
- Information density — content justifies its visual weight; no filler.
- Interaction clarity — hover/active/focus states behave predictably.
- Responsive behavior — defer to `doi-responsive-qa` for the actual multi-viewport check, but flag anything obviously going to break.
- Commercial credibility — apply the design system's credibility test.
- Brand consistency — see Design Drift below.
- Unnecessary complexity — see Over-Design below.

## Generic AI Design Detection

Flag any of the following if introduced (these are default outputs of many AI design tools, and are explicitly *not* the DØi aesthetic):

- Excessive gradient text (the site *does* use a subtle hairline-gradient text-fill on headings — that's an existing, deliberate, established effect; don't flag it, but do flag a *new*, different gradient-text treatment layered on top)
- Random glowing objects / meaningless glow effects
- Unnecessary rounded cards (the established card grids are square/sharp-cornered with 1px hairline borders — rounded corners are a drift signal)
- Generic SaaS layout (centered hero + 3-up feature cards + testimonial wall — DØi's actual layout is bordered technical grids, not soft SaaS cards)
- Excessive glassmorphism / blur-everything
- Meaningless animated backgrounds
- Decorative fake statistics
- Arbitrary gradients unrelated to the established orange gradient (`--og-grad`/`--og-grad-h`)
- Excessive pill-shaped UI (existing buttons use `clip-path` angled-corner geometry, not pills — a new pill-shaped button is a drift signal)
- Fake dashboards

## Design Drift Detection

Flag:
- New colors not in the verified token list in `doi-design-system`
- Orange used inconsistently (wrong hex, or a CSS `orange`/`#ffa500` literal instead of `var(--og)`)
- New typography beyond Orbitron/Rajdhani/Share Tech Mono
- Spacing values that don't match the established gutter/padding scale
- New border styles (dashed, double, colored borders where the system uses 1px `var(--bd)`/`var(--bd2)`)
- New icon style diverging from the established line-icon convention (`stroke="currentColor" stroke-width="1.5"`, 24×24 viewBox, in a 56×56 bordered box)
- Altered button geometry (the established buttons use angled `clip-path` corners — a plain rectangle or rounded-rect button is drift)
- Inconsistent card architecture (a new card that doesn't follow the bordered-grid-with-1px-gap pattern used everywhere else)

## Over-Design Test

For any element you're unsure about, ask: *"Does this improve comprehension, hierarchy, usability, conversion, or brand recognition?"* If the honest answer is no, recommend removing it rather than justifying it after the fact.

## Material Issue vs. Subjective Alternative

Distinguish these explicitly in every review:

- **Material issue** — affects usability, readability, responsiveness, accessibility, conversion, performance, consistency, commercial credibility, or technical correctness. Worth raising and fixing.
- **Subjective alternative** — simply another possible visual treatment with no material downside to the current one. Not worth raising. Do not recommend a redesign based only on a subjective alternative — this prevents endless design iteration with no measurable benefit.

## Output Format

Produce one of:

- **PASS** — no material issues.
- **PASS WITH ISSUES** — ships, but list the issues found (non-blocking).
- **REVISE** — material issues block completion; list them in priority order.

Then list the **highest-impact issues only**, each tagged as a Design Drift / Generic-AI-Design / Over-Design / Hierarchy finding, with a one-line fix recommendation. Do not pad the review with subjective alternatives.
