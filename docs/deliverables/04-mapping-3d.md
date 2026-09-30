# Deliverable Spec — Mapping + 3D

**Maps to:** Mission Application "Mapping + 3D" · Intake service "Mapping + 3D" · Deliverable category "Mapping + 3D Products" (see `index.html`).
**Builds on:** `00-master-architecture.md` — read that first.

## Target Users
Project teams, engineering firms (as a data source, not a substitute for their own survey), developers, planners, anyone needing site visualization or spatial documentation.

## Primary Purpose
Structured aerial capture and photogrammetric processing — georeferenced imagery, orthomosaic-style products, 3D reconstruction, spatial documentation — for visualization and project-specific mapping, not licensed land surveying.

## Report Architecture

| Core section (§3) | Mapping-specific content |
|---|---|
| 01–04 | Standard |
| 05 Capture Methodology | Flight pattern, overlap percentage, ground control (if any), positioning method used (e.g. standard GNSS vs. RTK-enabled — state which, plainly) |
| — | **Processing Methodology** (new, mapping-specific — the only product where the processing pipeline itself needs its own subsection, since accuracy claims depend entirely on it): photogrammetry software/pipeline used, ground control usage, known error sources |
| 06 Findings + Annotated Evidence | Reframed as **Spatial Products**: Map/Model Overview, 3D Reconstruction, annotated site views. "Findings" here are Areas of Interest on the map/model, not condition observations — still uses the shared Finding object (master doc §5), just with `Category = SPATIAL` |
| — | **Output Index**: every spatial product file, its format, and what it covers — folds into Deliverable Index (§10) rather than being a separate list |
| 08–11 | Standard, with Limitations explicitly covering positioning accuracy and what the methodology does and doesn't support (see claim boundary) |

## Claim Boundary — Mapping + 3D (second-highest-risk product)

**Do not describe any product as:** `SURVEY-GRADE`, `CERTIFIED SURVEY`, `ENGINEERING SURVEY`, or claim `GUARANTEED CENTIMETER ACCURACY` — **unless** the specific mission's equipment, ground-control methodology, and validation process actually support that claim, and a qualified surveyor's involvement (if licensure is legally required in the jurisdiction) is documented. Absent that, these words do not appear in the report, the proposal, or the sales conversation.

**Approved language:** `MAPPING`, `PHOTOGRAMMETRY`, `SPATIAL DOCUMENTATION`, `GEOREFERENCED IMAGERY`, `3D RECONSTRUCTION`.

If RTK-enabled positioning was used (per the existing "Why DØi" CAP-02 language, already conditioned as "when mission requirements support it"), the report states the actual positioning method and its expected accuracy range — it does not round up to "survey-grade" just because RTK was involved.

## Finding Categories
`AREA OF INTEREST (SPATIAL)` · `PROCESSING NOTE` (e.g. an area with poor photogrammetric coverage, disclosed rather than hidden)

## Evidence Types Used
`SPATIAL` (orthomosaic, point cloud, mesh, GeoTIFF as applicable). `RGB` where individual annotated site views support the spatial product.

## Dry-Run Validation Plan

| Field | This product's instance |
|---|---|
| Mission Objective | Prove the capture → processing → spatial-product pipeline produces a usable, clearly-scoped output without overstating accuracy |
| Site Type | A site with enough visual texture/features for reliable photogrammetric processing |
| Required Capture | Standard overlap flight pattern; document positioning method used |
| Processing | Run the actual photogrammetry pipeline DØi uses in production — do not fake this step with a placeholder model |
| Analysis | Review processing quality (coverage gaps, alignment errors) before anything is called a deliverable |
| QA | Full checklist, master doc §8, plus explicit check that no survey-grade/certified language appears anywhere |
| Deliverable | Spatial product file(s) + PDF summary report |
| Success Criteria | A client can correctly state what the product is (and is not) a substitute for, from the report's Limitations section alone |
| Lessons-Learned Review | Confirm the accuracy-disclosure language survives contact with an actual processing run — real photogrammetric error is often worse than assumed, and the report must reflect the real number, not an aspirational one |

## Standardization Classification
- **Standardize now:** report architecture, the survey-grade claim-boundary rule (non-negotiable, applies regardless of equipment used).
- **Test first:** the Processing Methodology disclosure format, and whether the actual accuracy achieved on a real dry run matches what the sales/website copy implies — if it doesn't, the website copy needs revisiting before this is called standardized, not the other way around.
