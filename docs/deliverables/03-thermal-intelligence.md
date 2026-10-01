# Deliverable Spec — Thermal Intelligence

**Maps to:** Mission Application "Thermal Intelligence" · Intake service "Thermal Inspection" · Deliverable category "Thermal Findings" (see `index.html`).
**Builds on:** `00-master-architecture.md` and, where a mission also has a visual-only inspection component, `02-asset-facility-inspection.md`.

## Target Users
Roofing, HVAC, electrical, solar, building-envelope, and facility/industrial stakeholders — always someone who can commission a "further evaluation," not necessarily a thermographer themselves.

## Primary Purpose
Thermal findings with supporting RGB documentation — never thermal imagery presented without visual context.

## Report Architecture

| Core section (§3) | Thermal-specific content |
|---|---|
| 01–04 | Standard, plus **Environmental Conditions at capture** (ambient temp, time of day, recent weather — thermal readings are meaningless without this and it must not be omitted) |
| 05 Capture Methodology | Thermal + RGB acquisition parameters, why the capture window was chosen (e.g. solar loading, delta-T conditions) |
| 06 Findings + Annotated Evidence | Each Finding pairs a Thermal Image with an RGB Image (master doc §5/§6 — one Finding, two Evidence references, not two parallel reports) |
| 07 Areas of Interest | Findings marked `REVIEW RECOMMENDED` / `PRIORITY REVIEW` |
| 08–11 | Standard |

## Claim Boundary — Thermal Intelligence (highest-risk product in this system)

A thermal pattern is **an observation**, not a diagnosis. DØi does not state or imply that a thermal anomaly establishes:

- electrical failure
- moisture intrusion
- insulation failure
- component failure
- a code violation

**unless** that conclusion has been independently established through an appropriate validated process outside DØi's scope (e.g. a licensed electrician's or roofing contractor's follow-up).

**Approved language:** "thermal pattern," "temperature differential," "area of interest," "potential anomaly," "recommended for further evaluation."

**Never write:** "this indicates a failure," "this confirms moisture intrusion," "this is a code violation," or any sentence that collapses the gap between what the camera saw and what caused it.

Temperature values are reported only where the capture methodology actually supports a valid reading (correct emissivity assumptions, reasonable environmental conditions, no reflective interference) — the report states this explicitly rather than printing a number that looks authoritative regardless of capture quality.

## Finding Categories
`ROOFING` · `ELECTRICAL` · `HVAC` · `SOLAR` · `BUILDING ENVELOPE` · `INDUSTRIAL / FACILITY SYSTEM`

## Evidence Types Used
`THERMAL` + `RGB` (always paired). `SPATIAL` only if the mission also includes a mapping deliverable (cross-reference `04-mapping-3d.md`).

## Dry-Run Validation Plan

| Field | This product's instance |
|---|---|
| Mission Objective | Prove the thermal/RGB pairing and claim-boundary language hold up on a real structure with genuine thermal variation |
| Site Type | A roof or building with known, real thermal variation (not a synthetic/staged scenario) |
| Required Capture | Thermal + RGB pass under conditions that actually support a valid reading (document why the window was chosen) |
| Processing | Pair every Thermal Image with its RGB counterpart before any Finding is created |
| Analysis | AI-assisted anomaly flagging if available, always followed by human verification before any finding is called `PRIORITY REVIEW` |
| QA | Full checklist, master doc §8, plus explicit check that no root-cause language slipped in |
| Deliverable | PDF report + thermal/RGB imagery folders |
| Success Criteria | A roofing/HVAC/electrical contractor reading the report understands exactly what was observed and what to check themselves — without reading it as DØi having already diagnosed the cause |
| Lessons-Learned Review | Have someone outside the mission team read the report cold and ask "what does DØi think caused this?" — if they can answer that question from the report text, the language needs to be tightened before standardizing |

## Standardization Classification
- **Standardize now:** thermal/RGB pairing structure, the approved-language list above.
- **Test first:** environmental-conditions disclosure format, whether "Recommended for Further Evaluation" reads as neutral or alarmist to a first-time client — validate on a real dry run before treating the wording as final.
