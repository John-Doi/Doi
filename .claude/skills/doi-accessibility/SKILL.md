---
name: "DØi Accessibility QA"
description: "Reviews the DØi Labs website for accessibility issues (semantic HTML, headings, landmarks, keyboard nav, focus states, ARIA, contrast, touch targets, reduced motion) within the existing design system. Use before/after any Level 2+ frontend change, or when explicitly asked to check accessibility."
---

# DØi Accessibility QA

Solve accessibility issues **within** the established DØi visual identity (see `doi-design-system`). Do not redesign components to satisfy accessibility when a smaller, targeted fix (adding an attribute, adjusting a color value slightly, adding a focus ring) will do.

## What to Check

- **Semantic HTML** — real buttons/links for interactive elements (the accordion pattern already uses `<button>` correctly — verify any new interactive element follows suit rather than a `<div onclick>`).
- **Heading hierarchy** — one `<h1>` (`.hero-h1`), section headings as `<h2>` (`.sec-title`), workflow step titles as `<h3>` (`.step-title`). Don't skip levels when adding new headings.
- **Landmarks** — verified gap: the page currently has `<nav>` and `<footer>` but **no `<main>` element**. When doing landmark-related accessibility work, wrapping the primary content in `<main>` is a legitimate, low-risk fix to propose (Level 1) rather than something to silently skip.
- **Keyboard navigation** — every interactive element (accordion triggers, nav links, form controls, CTA buttons) must be reachable and operable via keyboard alone. Test with Tab/Shift+Tab/Enter/Space.
- **Focus states** — visible focus indicator on all interactive elements; don't strip `outline` without a replacement.
- **Form labels** — every input in the mission-intake wizard needs an associated `<label>` (verify `for`/`id` pairing or explicit wrapping) — check this specifically after any intake-form change.
- **Button semantics** — accordion triggers use `aria-expanded` + `aria-controls` correctly today (verified pattern: `svc-head`/`why-head`/`del-head` buttons). Any new accordion must follow the same pair.
- **Alt text** — verified gap: only 4 `alt="..."` attributes exist across the whole page. Most images currently lack alt text. When touching an `<img>`, add a meaningful `alt` (or `alt=""` if the image is genuinely decorative) rather than leaving it unset — this is real, pre-existing debt worth chipping away at opportunistically, not a fabricated requirement.
- **Color contrast** — `--t2` (#a8a8a8) and `--t3` (#555) on `--bg`/`--surf` (#080808/#0e0e0e) should be checked against WCAG AA for body text; `--t3` in particular is quite low-contrast and is used for muted/tertiary labels — that's an intentional design choice for de-emphasized text, not a bug, but never use `--t3` for anything that needs to be read reliably (form labels, primary body copy, error messages).
- **Touch target size** — mobile buttons/links should be comfortably tappable (~44×44px effective area); check the mobile sticky CTA and accordion headers specifically.
- **Reduced motion** — verified existing pattern: `const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;` in JS, plus a dedicated `@media(prefers-reduced-motion:reduce)` CSS block. Any new animation must be gated through both.
- **Screen-reader behavior** — decorative elements (background drone video, watermark logos, scanline effects) should be `aria-hidden="true"` (verify this is still true after any change — e.g. `.pl-visual` is already marked `aria-hidden="true"`).
- **Error states / form validation** — the intake wizard currently validates via `alert()` calls per step. This is functional but not ideal for screen readers (alerts are heard, but the field itself isn't marked invalid). Don't "fix" this by redesigning the validation UI wholesale (Level 3 territory) — if asked to improve it, prefer adding `aria-invalid`/`aria-describedby` to the offending field as a Level 1/2 fix.
- **Sticky mobile CTA accessibility** — `.mobile-cta` toggles via a `hide-in-hero` class and `transform:translateY(120%)`; verify it isn't focusable/announced while visually hidden (a translated-offscreen element is still in the tab order unless also given `inert` or `tabindex="-1"` — check current behavior before assuming it's fine).

## Ground Rules

- Never change the DØi visual identity (colors, fonts, logo, card geometry) to "fix" an accessibility issue when a non-visual fix exists.
- A finding is only worth reporting if it's a **material issue** (see `doi-ux-critic`) — actually verify it in the current markup, don't assume based on general best practice without checking.
- When proposing a fix, prefer the smallest change that resolves the issue (add an attribute > adjust a token value slightly > restructure markup > redesign a component).
