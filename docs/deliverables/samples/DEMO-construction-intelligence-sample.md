> **DEMONSTRATION DELIVERABLE — SAMPLE FORMAT**
> This document is a fictional prototype built to validate the report architecture in `../00-master-architecture.md` and `../01-construction-intelligence.md`. Every name, mission ID, address, date, and finding below is synthetic. No real client, project, or mission is represented. Every image reference is a `DEMONSTRATION DATA PLACEHOLDER` — no actual imagery exists for this sample.

---

# DØi Labs — Construction Intelligence Report
### DEMONSTRATION DELIVERABLE

## Document Control

| Field | Value |
|---|---|
| DØi Document ID | `DOI-20260115-001_ConstructionIntelReport_v1.0` |
| Mission ID | `DOI-20260115-001` *(synthetic)* |
| Client | Meridian Fictional Builders, Inc. *(synthetic — sample only)* |
| Project / Site | Sample Business Park — Building 3 *(synthetic)* |
| Location | 000 Demonstration Way, Sample City, CA 00000 *(fictional address)* |
| Mission Date | 2026-01-15 *(synthetic)* |
| Report Date | 2026-01-17 *(synthetic)* |
| Report Version | v1.0 |
| Prepared By | [Analyst name placeholder] |
| Verified By | [Verifier name placeholder — must differ from Prepared By] |
| Document Status | **FINAL** *(sample status for demonstration purposes)* |

## Executive Summary

- **Why was the mission conducted?** Monthly progress capture, milestone 4 of 9, per the recurring capture schedule established at project kickoff.
- **What was captured?** RGB aerial imagery across all four site zones defined in the project's Areas of Interest.
- **What was produced?** This report, organized imagery by zone, and a milestone comparison against the December 2025 capture.
- **What are the important observations?** Framing progress on Zone A is ahead of the prior cycle; a materials staging change in Zone C is noted for awareness, not concern.
- **What should the client review?** OBS-002 (Zone C staging relocation) — documented, no action required, included for project record continuity.

## Mission Information

- Project Phase / Milestone: Framing — Milestone 4 of 9
- Scope: Full-site progress capture, 4 zones

## Capture Methodology

RGB capture at consistent waypoints and altitude, matching the prior capture cycle (2025-12-15) to support valid milestone comparison. Weather: clear, no obstructions.

## Findings + Annotated Evidence

### OBS-001 — Zone A, Framing Progress
- **Category:** PROGRESS
- **Source:** VISUAL
- **Observation:** Second-floor framing complete across Zone A; ahead of the pace observed in the prior capture cycle.
- **Supporting Image:** `IMG-014` — *DEMONSTRATION DATA PLACEHOLDER (no actual image attached to this sample)*
- **Location Reference:** Zone A, northeast quadrant
- **Priority for Review:** DOCUMENTED
- **Verification Status:** HUMAN VERIFIED

### OBS-002 — Zone C, Materials Staging Relocation
- **Category:** CHANGE
- **Source:** VISUAL (AI-flagged as a change vs. prior capture, then human-verified)
- **Observation:** Materials staging area relocated approximately 40 ft south of its position in the prior capture. Noted for project record; does not affect any structure.
- **Supporting Image:** `IMG-021` (current) + `IMG-009` (prior, 2025-12-15) — *DEMONSTRATION DATA PLACEHOLDERS*
- **Location Reference:** Zone C, south perimeter
- **Priority for Review:** DOCUMENTED
- **Verification Status:** HUMAN VERIFIED

### OBS-003 — Zone D, Limited Access
- **Category:** ACCESS / SCHEDULE NOTE
- **Source:** MANUAL
- **Observation:** Zone D partially obstructed by an active crane swing radius at time of capture; approximately 15% of the zone was not visible in this cycle's imagery.
- **Supporting Image:** `IMG-028` — *DEMONSTRATION DATA PLACEHOLDER*
- **Location Reference:** Zone D
- **Priority for Review:** REVIEW RECOMMENDED — *recommend prioritizing Zone D coverage in the next capture window, not an indication of a site problem*
- **Verification Status:** HUMAN VERIFIED

## Areas of Interest / Review Items

| Finding | Priority | Note |
|---|---|---|
| OBS-003 | REVIEW RECOMMENDED | Coordinate next capture timing with site crane schedule to close the Zone D coverage gap |

## QA / Human Verification

All findings in this sample were marked HUMAN VERIFIED before inclusion, per the master QA gate (`00-master-architecture.md` §8). No finding in this report was AI-flagged and shipped without human review. This report contains no engineering conclusions — OBS-003's "Review Recommended" refers to capture coverage, not a structural or safety condition.

## Limitations

- Zone D coverage incomplete this cycle due to active crane operations (see OBS-003).
- This report documents observable site conditions from aerial capture only. It is not a substitute for the project's own quality-control, safety, or engineering inspections.

## Deliverable Index

| File | Format |
|---|---|
| `DOI-20260115-001_ConstructionIntelReport_v1.0.pdf` | PDF (this report) |
| `02_IMAGERY/` | Organized RGB imagery, all zones |
| `03_ANNOTATED/` | Annotated imagery for OBS-001 through OBS-003 |

*(Folder structure per `00-master-architecture.md` §9 — only the folders this sample mission actually produced are listed; no thermal, mapping, or 3D deliverables apply to this mission type.)*

## Appendix

Full image index omitted from this demonstration sample — a real deliverable would list every captured frame here, not only the annotated selection.

---

> **End of demonstration.** This sample validates that the Common Report Core, Document Control block, Finding/Evidence data model, and QA gate defined in `00-master-architecture.md` produce a coherent, internally consistent report for the Construction Intelligence product without requiring any construction-specific report system of its own.
