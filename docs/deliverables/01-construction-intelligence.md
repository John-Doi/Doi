# Deliverable Spec — Construction Intelligence

**Maps to:** Mission Application "Construction Intelligence" · Intake service "Construction Progress + QA" · Deliverable categories "Progress Documentation," "Comparison + Change Documentation," "Site Condition Documentation" (see `index.html`).
**Builds on:** `00-master-architecture.md` — read that first. This file only defines what's different about this product.

## Target Users
Project managers, construction managers, owners, developers, general contractors, subcontractors, project stakeholders.

## Primary Purpose
Repeatable visual documentation of project conditions and progress across the life of a project — not a one-time inspection.

## Report Architecture

The brief's proposed 13-section outline was evaluated against the Common Report Core (`00-master-architecture.md` §3) and folded down — several proposed sections were redundant with the universal core rather than genuinely construction-specific:

| Core section (§3) | Construction-specific content |
|---|---|
| 01 Cover | — |
| 02 Document Control | — |
| 03 Executive Summary | Why this capture was scheduled (e.g. "monthly progress capture, milestone 4 of 9"), what was captured, what was produced, key observations, what the client should review |
| 04 Mission Information | Add: **Project Phase / Milestone** (free text, e.g. "Foundation complete, framing in progress") |
| 05 Capture Methodology | Flight pattern used for repeatability (same waypoints/altitude across visits where possible, so period-over-period comparison is valid) |
| 06 Findings + Annotated Evidence | Organized by **Area of Interest** (site zone), each with Progress Documentation and, where a prior capture exists, **Milestone Comparison** (side-by-side current vs. previous) and **Change Documentation** (what changed) |
| 07 Areas of Interest / Review Items | Findings flagged `REVIEW RECOMMENDED` or `PRIORITY REVIEW` — see claim boundary below |
| 08 QA / Human Verification | Standard (§8 of master doc) |
| 09 Limitations | E.g. capture angle/weather constraints, areas not accessible from aerial capture, any area excluded from this cycle's scope |
| 10 Deliverable Index | — |
| 11 Appendix | Full image index if the client wants every frame, not just the annotated selection |

No separate "Milestone Comparison" or "Change Documentation" top-level sections — they are properties of a Finding (§5 of master doc: multiple Evidence IDs, one current + one prior, attached to the same Finding), not separate report structures. This keeps one Finding model working across all four products instead of a construction-only variant.

## Claim Boundary — Construction Intelligence

DØi documents **observable site conditions and progress**. DØi does **not** issue:

- professional engineering conclusions
- code-compliance determinations
- structural/QA sign-off on behalf of the client's engineer or inspector of record

Every Observation field is written as what was seen, not what it means structurally. Where something looks like it may need engineering attention, the Finding is flagged `REVIEW RECOMMENDED` or `PRIORITY REVIEW` (operational triage only — see master doc §5) and the report explicitly states the client's engineer/inspector of record should evaluate it, not DØi.

## Finding Categories (this product's controlled vocabulary for the shared Finding model)

`PROGRESS` · `QA / SITE CONDITION` · `CHANGE` · `ACCESS / SCHEDULE NOTE`

## Evidence Types Used
`RGB` (primary). `SPATIAL` where the mission also includes a mapping capture (cross-reference `04-mapping-3d.md` rather than duplicating that product's architecture inside this one).

## Dry-Run Validation Plan

| Field | This product's instance |
|---|---|
| Mission Objective | Prove repeatable capture + milestone comparison works end-to-end on a real active site |
| Site Type | An active construction site DØi already has access to (or a controlled test site if none is available) |
| Required Capture | Two capture passes at the same waypoints/altitude, at least one week apart, to produce a real (not simulated) comparison |
| Processing | Organize by Area of Interest, pair current + prior imagery per Finding |
| Analysis | Manual comparison first pass; AI-assisted change detection only if already available — do not block the dry run on AI tooling that isn't ready |
| QA | Full checklist, master doc §8 |
| Deliverable | One complete PDF report + organized imagery folder, following §9's folder standard |
| Success Criteria | A non-technical stakeholder can look at the report and correctly state what changed on site without DØi explaining it verbally |
| Lessons-Learned Review | Whoever owns the client relationship reviews the report before it's treated as a template; anything confusing gets fixed in this spec, not patched ad hoc in the next report |

## Standardization Classification
- **Standardize now:** report architecture above, claim-boundary language.
- **Test first:** the repeatable-waypoint capture methodology (needs a real two-visit dry run before it's trusted), the Milestone Comparison presentation format.
