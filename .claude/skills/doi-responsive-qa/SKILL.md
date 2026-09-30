---
name: "DØi Responsive QA"
description: "Checks the DØi Labs website across required mobile/tablet/desktop viewports for overflow, wrapping, and layout regressions, with special attention to iOS Safari viewport-unit and safe-area quirks. Use after any Level 1+ frontend change before considering it done, and whenever asked to verify responsive behavior."
---

# DØi Responsive QA

**A layout passing desktop QA does not automatically pass mobile QA.** Always check both. This project has a real history of mobile-only regressions shipping unnoticed (a longer heading wrapped awkwardly under mobile-only CSS in a recent change) — treat mobile as a first-class check, not an afterthought.

## Required Viewports

| Class | Widths |
|---|---|
| Mobile | 375, 393, 430 |
| Tablet / small desktop | 768, 1024 |
| Desktop | 1280, 1440 |

If browser automation is available (see `.claude/qa/visual-qa.js` and the note below), capture real screenshots at these widths rather than reasoning from source alone — CSS interactions (flex wrap, grid reflow, absolute positioning) are easy to get wrong by inspection.

## What to Inspect at Each Width

- Horizontal overflow (`document.documentElement.scrollWidth > clientWidth` — zero tolerance)
- Text wrapping, especially longer technical labels/headings (mono uppercase labels with letter-spacing are the most wrap-prone elements on this site)
- Heading scale (most headings use `clamp()` — verify the clamp floor is still legible at 375px)
- Navigation — desktop nav (`.nav-links`, centered via a `1fr auto 1fr` grid — verify this centering survives any nav content change) vs. mobile (nav-links/CTA hidden below 900px, only logo shows)
- Gutters — `var(--mobile-gutter)` (20px) should be applied consistently; watch for a new mobile section that inherits the desktop 60px margin instead
- Card grids (`.svc-grid`, `.ind-list`, `.del-grid`, `.why-grid`) — all collapse to `grid-template-columns:1fr` below 900px; verify a new grid follows the same collapse rule
- Accordions — verify `max-height` values used for open-state transitions still fit their content at every width (a longer body string can get clipped by a fixed `max-height`)
- Proof band / trust grids — column count changes at the 900px breakpoint (4→2 columns); verify text doesn't wrap to 3+ lines
- Hero — progressive disclosure (`--s1`/`--s2`/`--s3`) and logo scaling (`clamp` via `40vw`/`max-width:620px` on desktop, fixed on mobile) should be unaffected by unrelated changes
- Sticky elements — `.mobile-cta` (sticky bottom CTA) and `.nav` (fixed top) — verify no new fixed/sticky element competes with these
- Workflow — the sticky pipeline (`.pipeline-zone`, 390vh) is desktop-only; mobile uses a separate non-sticky `.mob-pipeline`/`.mob-step` markup — verify any workflow copy change is applied to **both** (a common miss)
- Mission intake form — `.form-2col` grid collapses to 1 column below 900px; verify new form fields still tab in a sensible order
- Footer — 4-column grid collapses to 1 column below 900px
- CTA visibility — `REQUEST MISSION BRIEF` should always be reachable: in the nav (desktop), in the hero, and via the mobile sticky CTA (mobile)

## iOS Safari / Viewport-Unit Specifics

Pay particular attention to:
- **Dynamic viewport units** — the hero already uses `height:150vh;height:150svh` (mobile) and `100vh;100svh` patterns specifically to avoid Safari's dynamic toolbar changing the scrollable distance mid-scroll. Any new full-height section on mobile should follow the same `vh` (fallback) + `svh` (real) pairing, not just `100vh` alone.
- **`safe-area-inset-bottom`** — the mobile sticky CTA already accounts for this (`padding:9px var(--mobile-gutter) calc(9px + env(safe-area-inset-bottom))` and a body `padding-bottom` calc). Any new fixed-bottom element must do the same or it will sit under the iPhone home-indicator bar.
- **100vh vs 100svh/100dvh** — don't introduce a bare `100vh` on a new mobile-visible full-screen section; it will be taller than the visible viewport on Safari when the toolbar is expanded. Use the same fallback pattern as the existing hero.
- **Long technical labels** — mono/uppercase labels with letter-spacing are the highest-risk text for mobile wrapping; always check them specifically at 375px (the narrowest required width).

## Known Environment Note

Playwright is installed globally on this sandbox (`npm root -g`), with a pre-installed Chromium at `/opt/pw-browsers` — not as a repo `package.json` dependency. `.claude/qa/visual-qa.js` resolves it at runtime via the global npm root (Node doesn't search that path by default) and works out of the box in this sandbox. This may not be true in every environment Claude Code runs this repo from — if the script reports it can't resolve playwright, fall back to reasoning from source plus a manual `npx serve .` + browser check, and note in your summary that automated screenshots weren't available.

Also note: this sandbox's headless Chromium cannot decode H.264 video (`canPlayType` returns empty for `avc1`), so background/hero video elements will not visually render in automated screenshots — verify video-dependent visuals on a real device/browser instead of relying on the screenshot for those specific elements.
