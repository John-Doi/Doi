---
name: "DØi Design System"
description: "Authoritative visual and interaction standard for DØi Labs frontend work (index.html). Use before any change to layout, typography, color, spacing, animation, or component styling on the DØi website, and whenever evaluating whether a proposed design change fits the established brand."
---

# DØi Design System

Governs all frontend visual work on the DØi Labs website (`index.html`, and `doilabs-v2.html` where touched). This skill is authoritative over generic design suggestions, including any general-purpose frontend-design capability — when they conflict, DØi's established system wins.

## Brand Position

DØi Labs is a premium aerial-intelligence and technical-services company (B2B, not consumer). The site should read as: aerospace, intelligence, engineering, precision, controlled operations, advanced sensing, technical competence.

It must **not** read as: a hobby drone company, consumer electronics brand, gaming site, generic SaaS template, real-estate photography business, military cosplay/tactical brand, cyberpunk entertainment site, or a generic AI-generated landing page.

**Commercial credibility test** for any client-facing design decision: *"Would this look credible today to a construction manager, engineering firm, infrastructure operator, facility manager, insurer, government organization, aerospace organization, or financial institution?"* If not, revise it.

## Verified Design Tokens (do not invent new ones)

These are the actual tokens declared in `index.html`'s `:root` — read them from the file if in doubt, don't guess:

```css
--bg:#080808;        /* page background, near-black */
--surf:#0e0e0e;       /* section surface */
--card:#111; --card2:#141414;   /* card backgrounds */
--bd:#1e1e1e; --bd2:#2a2a2a;    /* borders */
--og:#ff6b1a;         /* primary DØi orange accent */
--og2:#FF6B00; --tiger:#e65411; /* orange variants (gradient stop / hover) */
--t1:#f0f0f0; --t2:#a8a8a8; --t3:#555;  /* text hierarchy: primary/secondary/muted */
--mono:'Share Tech Mono',monospace;
--disp:'Orbitron',sans-serif;
--body:'Rajdhani',sans-serif;
--mobile-gutter:20px;
```

**Do not introduce new brand colors, gradients, or shades without explicit user authorization.** Orange (`--og`/`--tiger`) marks active state, CTAs, important data points, and technical accents — never let it dominate a whole section; it should read as a controlled highlight against the black/charcoal base.

## Logo

The official DØi Labs logo assets (`DOiLabs_Logo2.png`, `DOiLabsLogo_nav.png`, `DOiLabs_WordmarkOnly.png`, `DOiReconlogo.png`) are authoritative. Never redraw, reinterpret, recolor, resize disproportionately, or generate an alternate mark. Never change the Ø slash treatment. Adding a background behind the logo, or creating a new variant, requires explicit user authorization first — this is a Level 3 change (see Change Control below).

## Typography

Three families, loaded via Google Fonts (`Orbitron:wght@400;700;900`, `Rajdhani:wght@400;500;600;700`, `Share Tech Mono`) — verify `<head>` before assuming a weight is available:

- **`var(--disp)` (Orbitron)** — display/major headings (`.hero-h1`, `.sec-title`, `.step-title`, card titles). Heavy weight (900), the "technical/aerospace" voice.
- **`var(--body)` (Rajdhani)** — body copy and general interface text (default on `<body>`, 18px base).
- **`var(--mono)` (Share Tech Mono)** — technical labels, data, codes, uppercase micro-copy (nav, `.step-code`, `.svc-div`, `.del-type`, `.ind-micro`, form labels). These are globally upsized via a shared selector at the top of the stylesheet (12px→14px, 11px→13px) — don't fight that rule with a one-off smaller size.

Do not introduce a fourth font family casually. Keep the three roles (display / body / technical-label) visually distinct — that contrast is a deliberate hierarchy signal, not an accident.

Avoid letter-spacing so wide it hurts legibility, especially on mono labels at mobile widths (this has caused real wrapping bugs before — see `doi-responsive-qa`).

## Layout Principles

Prefer: strong alignment, intentional whitespace, consistent section geometry (most content sections use a bordered `repeat(N,1fr)` grid with 1px gap + shared border color, e.g. `.svc-grid`, `.ind-list`, `.del-grid`, `.why-grid`), reusable spacing (`var(--mobile-gutter)` on mobile, 60px section padding on desktop), predictable component behavior (accordion pattern: button + `aria-expanded` + `max-height` transition, reused across Capabilities/Deliverables/Why-DØi).

Avoid: arbitrary offsets, unexplained negative margins, decorative cards with no informational purpose, inconsistent section widths, visual density that doesn't map to real information.

**Reuse existing components before inventing new ones.** This codebase already has: a bordered card grid pattern, an accordion pattern, an icon-in-bordered-box pattern (`.ind-icon`/`.why-icon`, 56×56px box, 28×28px SVG, `color:var(--og)`), and a micro-label pattern (small mono uppercase line under a title). A new section should almost always reuse one of these rather than invent a fifth card style.

## Tactical/Technical Styling

Allowed in moderation: subtle grid backgrounds, technical mono labels, thin geometric lines, restrained scanline effects, small operational metadata (e.g. proof-band stats), subtle aerospace references.

Avoid: excessive HUD graphics, fake radar, fake classified markings, excessive crosshairs (note: the site does use `cursor:crosshair` globally as a deliberate stylistic choice — that's existing, don't add more crosshair *imagery* on top of it), glitch effects, fake military UI, telemetry that overwhelms content, or adding "technical" decoration with no functional reason.

**Rule of thumb: DØi should look like a sophisticated technical operation, not a movie interface.**

## Animation

Animation must serve one of: hierarchy, orientation, storytelling, state change, or feedback. Never decorative-only.

Existing verified animation systems — extend these, don't build parallel ones:
- Scroll-driven hero progressive disclosure (`updateHeroStage()`, CSS custom properties `--s1`/`--s2`/`--s3` consumed via opacity/transform).
- Sticky pipeline workflow (`.pipeline-zone` at `390vh`, `updatePipeline()` computes proportional scroll progress, drives both the active step and the ambient background drone element).
- `IntersectionObserver`-based reveal-on-scroll for card grids (fade + translateY, staggered).
- `requestAnimationFrame` for the scroll-progress bar and hero stage updates.

All of the above already respect `prefers-reduced-motion` (checked via `const REDUCE = window.matchMedia(...)` in JS, and a dedicated `@media(prefers-reduced-motion:reduce)` CSS block). **Any new animation must be gated the same way** — check both the existing CSS block and the `REDUCE` JS flag before adding motion.

Avoid excessive parallax or long scroll-locking beyond what the existing hero/pipeline zones already do.

## Commercial UX Architecture

Primary CTA text, everywhere, is exactly: **`REQUEST MISSION BRIEF`**. Do not introduce a competing CTA phrase (previously drifted to "REQUEST CONSULTATION" in a few spots — always grep for CTA text consistency after nav/hero/mobile-sticky-CTA changes).

Customer journey the design should make legible: Client Requirement → DØi Capability → Mission → Data Acquisition → Processing + Analysis → Deliverable → Client Decision.

Primary commercial applications (Mission Applications section, `#industries`): Construction Intelligence, Asset + Facility Inspection, Thermal Intelligence, Mapping + 3D, Project + Infrastructure Support, Advanced Facilities. Secondary: Commercial Property + Media (not a primary card — see prior PR history).

Capability architecture (`#services`, distinct from Mission Applications — capabilities are *how*, applications are *what the customer needs*): RCN (Aerial Reconnaissance), OPS (Operational + Project Documentation), SYN (Mapping + Spatial Data), THM (Thermal Inspection), XLAB (Data Processing + Analysis), FAB (Custom Mission Design). Don't collapse these two concepts into one section.

## AI Presentation Rules

DØi uses AI as an intelligence-processing layer. Approved framing: **AI-assisted processing**, **AI-assisted comparison**, **AI-assisted anomaly flagging**, **human verification**. The existing PROCESS workflow stage already encodes this as a `.step-pipeline` microcopy line (`CAPTURE → ORGANIZE → PROCESS → COMPARE → AI-ASSISTED FLAGGING → HUMAN VERIFICATION → DELIVER`) — extend that pattern rather than adding a new one.

Never imply: fully autonomous inspection, AI engineering diagnosis, guaranteed defect detection, or autonomous professional judgment. AI is a processing layer, not a marketing gimmick, and human verification must always stay visible in the story.

## Never Fabricate

Never add client logos, testimonials, case studies, project statistics, performance metrics, certifications (SOC 2, ISO 27001, survey certification, engineering certification), new insurance limits, or new FAA claims that aren't already verified and present in the audited trust content. If a claim isn't already on the site, adding it is a Level 3 change requiring explicit authorization, not something to infer from "this would sound good."

## Change Control

- **Level 1 (Polish)** — spacing, alignment, minor typography/responsive correction within the tokens above. Implement directly.
- **Level 2 (Component change)** — card redesign, new reusable UI pattern, section composition change, navigation behavior change. Consult this skill, then run `doi-ux-critic` + `doi-responsive-qa` (+ `doi-accessibility` if the change touches interactive elements) before considering it done.
- **Level 3 (Brand/architecture change)** — new color, new font, logo change, major navigation restructuring, homepage redesign, new visual language, large new animation system. **Do not implement automatically.** Propose it with rationale and wait for explicit approval.

See `doi-ux-critic` for how to evaluate a change against this system, and the project `CLAUDE.md` for the always-on rules that summarize this skill.
