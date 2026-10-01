# Deliverable Spec — Asset + Facility Inspection

**Maps to:** Mission Application "Asset + Facility Inspection" · Intake service "Commercial / Industrial Inspection" · Deliverable categories "Inspection Documentation," "Site Condition Documentation," "Analytical Outputs" (see `index.html`).
**Builds on:** `00-master-architecture.md` — read that first.

## Target Users
Commercial/industrial facility owners and managers, property managers, infrastructure operators, insurers evaluating observable condition (not issuing an engineering report themselves).

## Primary Purpose
Visual/condition documentation of an asset or facility — roofs, exteriors, infrastructure, difficult-access areas, equipment visible from aerial capture.

## Report Architecture

| Core section (§3) | Inspection-specific content |
|---|---|
| 01–04 | Standard, plus **Asset / Facility Overview** (what was inspected and why) folded into Mission Information rather than a standalone section |
| 05 Capture Methodology | Which areas were captured, sensor(s) used, any areas not accessible from the air (stated here, cross-referenced in Limitations) |
| 06 Findings + Annotated Evidence | Organized by **Area Inspected**. Each Finding: Observed Condition, Annotated Finding, Priority for Review |
| 07 Areas of Interest / Review Items | Same object, filtered to `REVIEW RECOMMENDED` / `PRIORITY REVIEW` — see below |
| 08–11 | Standard |

## Claim Boundary — Asset + Facility Inspection

DØi documents **observable conditions from aerial visual (and, where applicable, thermal) capture**. DØi does not issue engineering condition assessments, structural safety ratings, or code-compliance findings.

**Priority language (reused directly from the shared Finding model, master doc §5) — do not invent a parallel severity scale:**

- `DOCUMENTED` — captured and recorded, no follow-up implied
- `REVIEW RECOMMENDED` — worth a closer look by the client or their qualified inspector/engineer
- `PRIORITY REVIEW` — DØi recommends the client prioritize getting qualified eyes on this sooner

None of these are safety certifications. Every use of `PRIORITY REVIEW` in a report must be paired with plain language stating DØi is flagging it for further qualified evaluation, not diagnosing it.

## Finding Categories
`ROOFING` · `EXTERIOR / ENVELOPE` · `EQUIPMENT (VISIBLE)` · `INFRASTRUCTURE` · `ACCESS-LIMITED AREA`

## Evidence Types Used
`RGB` (primary), `THERMAL` where the mission scope includes it (in which case, cross-reference `03-thermal-intelligence.md` for how the RGB/thermal pairing is documented rather than duplicating that logic here).

## Dry-Run Validation Plan

| Field | This product's instance |
|---|---|
| Mission Objective | Prove the Area Inspected → Finding → Priority-for-Review flow produces a report a facility manager can act on without a call to DØi first |
| Site Type | A commercial or industrial building DØi has legitimate access to for a test capture |
| Required Capture | Full exterior/roof pass, RGB only for the first dry run (add thermal in the Product C dry run rather than combining both on the first attempt) |
| Processing | Group by Area Inspected, assign Priority for Review per finding |
| Analysis | Human review of every finding before any is marked `PRIORITY REVIEW` |
| QA | Full checklist, master doc §8, with explicit sign-off that no finding implies an engineering conclusion |
| Deliverable | PDF report + annotated imagery folder |
| Success Criteria | A facility manager can list, from the report alone, which areas need a follow-up inspection and by whom (their engineer, not DØi) |
| Lessons-Learned Review | Check specifically whether `PRIORITY REVIEW` language reads as a safety certification to a first-time reader — if it does, revise the wording before standardizing |

## Standardization Classification
- **Standardize now:** report architecture, three-tier Priority-for-Review language.
- **Test first:** whether "Priority for Review" reads clearly to a non-technical client on a real dry run — this is the highest legal/credibility risk item in the whole Phase 4 system and should not be assumed correct from spec alone.
