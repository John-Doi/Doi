---
name: "DØi Performance QA"
description: "Reviews frontend performance (LCP, CLS, INP, media loading, animation cost, DOM complexity) for the DØi Labs website, weighing visual value against performance cost rather than stripping features for a theoretical score. Use when a change adds media, animation, or significant DOM/JS, or when explicitly asked to review performance."
---

# DØi Performance QA

**Do not remove an important DØi visual feature simply to produce a theoretical performance improvement.** For every candidate optimization, weigh:

**VISUAL VALUE vs. PERFORMANCE COST** — optimize the *implementation* first (lazy-load it, defer it, compress it, throttle it); only recommend removing a visual feature outright when its cost clearly and materially exceeds its contribution to hierarchy, brand, or conversion.

## What to Check

- **LCP** — the hero's largest content is currently an image (`IMG_4044.webp`, preloaded per the existing code comment: "handles LCP") with the background video deferred until `window.onload` — verify any hero change preserves this ordering (image first, video deferred) rather than accidentally making the video render-blocking again.
- **CLS** — verify new elements have reserved space (explicit dimensions or aspect-ratio) before their content loads, especially images/icons injected into existing grids.
- **INP** — scroll handlers (`updatePipeline`, `updateHeroStage`, the scroll-progress bar) run on every scroll event gated through `requestAnimationFrame` — verify any new scroll-driven behavior is added to the existing rAF loop rather than registering a second independent `scroll` listener (duplicate listeners compound cost).
- **Hero media** — background video is deferred via `preload="none"` + a `data-src` swapped in on `window.addEventListener('load', ...)` (see the "PHASE 2 · DEFERRED VIDEO LOAD" comment). The sticky-pipeline drone video and mobile background video follow the same `data-src` deferred-load pattern. Any new background video must use this same deferred pattern, never a plain autoplaying `<video src="...">` in the initial HTML.
- **Image loading** — check whether a newly added image should be lazy-loaded (`loading="lazy"`) if it's below the fold.
- **Responsive images** — the project doesn't currently use `srcset`/`<picture>` anywhere verified; if adding a large new image, consider whether a responsive-image approach is warranted, but don't invent a whole image pipeline for one asset — proportionate effort only.
- **Font loading** — three Google Fonts families loaded via a single `<link>` with `display=swap` — already reasonably optimized; don't add a fourth family (also a brand-consistency violation, see `doi-design-system`).
- **CSS size** — all CSS is inline in a single `<style>` block in `index.html` (no build step, no CSS file splitting, by design per this project's architecture — see root `CLAUDE.md`). Don't propose extracting it into separate files; that's a Level 3 architecture change, not a performance task.
- **JavaScript execution** — all JS is inline at the bottom of `index.html`, plain vanilla (no framework, no bundler). Keep new code in the same style; don't introduce a build step or bundler to "optimize" this — that contradicts the project's explicit no-build-step architecture.
- **Scroll handlers / rAF / IntersectionObserver** — `IntersectionObserver` already drives the reveal-on-scroll animation for card grids (more efficient than a scroll listener) — prefer it over a new scroll-position calculation when the only need is "did this element enter the viewport."
- **Layout thrashing** — avoid reading layout properties (`getBoundingClientRect`, `offsetHeight`) inside a loop that also writes styles; batch reads then writes.
- **Animation GPU cost** — prefer `transform`/`opacity` (already the pattern used throughout — reveal animations, hero disclosure, drone movement all animate transform/opacity, not layout properties like `top`/`left`/`width`). Keep new animations on the same properties.
- **DOM complexity** — this is a long single-page site already; don't add deeply nested wrapper divs where a class on an existing element would do.
- **Third-party requests** — currently just Google Fonts. Don't add a new third-party script/analytics/widget without flagging it as a Level 3-adjacent decision (it affects both performance and the "premium technical operation, not generic SaaS" brand read).

## Reporting

When reviewing performance, report specific verified numbers where possible (element count, video file size from `ls -la`, whether an image has explicit dimensions) rather than generic advice. If you can't measure something in this environment, say so rather than guessing.
