# soap-schema

[![CI](https://github.com/PeerbitsSolution/soap-schema/actions/workflows/ci.yml/badge.svg)](https://github.com/PeerbitsSolution/soap-schema/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)
[![npm](https://img.shields.io/npm/v/%40peerbits%2Fsoap-schema)](https://www.npmjs.com/package/@peerbits/soap-schema)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](#3-installation)

> Canonical JSON Schema and TypeScript validation library for structured SOAP clinical notes

**Category:** AI Clinical Documentation — Clinical Documentation Components · **License:** Apache-2.0 · **Status:** alpha (v0.1.0, pre-1.0)

📖 **New here?** This README covers the essentials; for the complete
narrative walkthrough — installation, every API in depth, error-handling
patterns, the full schema field reference, versioning, and troubleshooting
— see **[docs/USER_GUIDE.md](./docs/USER_GUIDE.md)**.

---

## 1. What problem does this solve?

Every AI clinical documentation project reinvents the same structure: a SOAP
note (Subjective, Objective, Assessment, Plan) as a data shape, with no
canonical machine-readable schema to validate against. The result is ad hoc
JSON shapes that drift between projects, AI-generated notes that silently
produce malformed output with no validation layer to catch it before it
reaches an EHR or a FHIR mapping step, and no shared vocabulary for what a
"well-formed" structured note actually contains.

`soap-schema` defines that shape once — as a portable JSON Schema, not a
library-specific type — validates against it reliably, and renders the
result as a note a clinician can actually read, not just JSON a developer
can parse.

## 2. Features

- A canonical [JSON Schema (draft 2020-12)](./schema/soap-note.schema.json) for a structured SOAP note — usable from any language with a Draft 2020-12 validator, not just this TypeScript library
- A typed `validate()` / `assertValid()` library (ajv-based) returning structured, per-field validation errors — not just `true`/`false`
- TypeScript types generated directly from the schema, with a CI-enforced drift test so they can never silently fall out of sync
- `renderNote()` — converts a valid note into a clean, human-readable markdown note with standard SOAP section headers
- Five synthetic example fixtures (three valid, two deliberately invalid) used by both the test suite and the docs below
- A [documented FHIR mapping guide](./docs/FHIR_MAPPING_GUIDE.md) — guidance only, no code — describing how each section corresponds to FHIR `Composition`, `Condition`, and `Observation`

## 3. Installation

```bash
npm install @peerbits/soap-schema
```

Requires Node.js >= 18. No peer dependencies — `ajv` and `ajv-formats` are
regular dependencies, installed automatically.

This package is **ESM-only** (`"type": "module"`) — use `import`, not
`require()`. If your project is CommonJS, use a dynamic `import()` instead
(`const { validate } = await import("@peerbits/soap-schema")`) — see
[docs/USER_GUIDE.md §13](./docs/USER_GUIDE.md#13-troubleshooting--faq) if
you hit `ERR_REQUIRE_ESM`.

## 4. Quick Start

Every field below is invented and synthetic. This is a trimmed-down version
of one of the repo's fixtures, kept short for readability — see
[`fixtures/valid/primary-care-followup.json`](./fixtures/valid/primary-care-followup.json)
for the complete, untrimmed encounter (also rendered in full in §6 below).

**Input** — a plain JSON object (abbreviated from `fixtures/valid/primary-care-followup.json`):

```json
{
  "metadata": {
    "encounterType": "primary-care-followup",
    "authorRole": "physician",
    "timestamp": "2026-02-10T14:30:00Z",
    "patientRef": "synthetic-patient-0001"
  },
  "subjective": {
    "chiefComplaint": "Follow-up for hypertension management",
    "historyOfPresentIllness": "Patient is a fictional 58-year-old presenting for a scheduled follow-up. Reports good adherence to lisinopril, home blood pressure readings averaging 132/84. Denies headache, chest pain, or shortness of breath.",
    "reviewOfSystems": [
      { "system": "cardiovascular", "status": "negative", "finding": "Denies chest pain, palpitations, or edema." }
    ]
  },
  "objective": {
    "vitals": {
      "bloodPressure": { "systolic": { "value": 130, "unit": "mmHg" }, "diastolic": { "value": 82, "unit": "mmHg" } },
      "heartRate": { "value": 72, "unit": "bpm" }
    },
    "examFindings": [
      { "bodySystem": "cardiovascular", "finding": "Regular rate and rhythm, no murmurs, rubs, or gallops." }
    ]
  },
  "assessment": [
    {
      "description": "Essential hypertension, well controlled on current regimen",
      "status": "chronic",
      "codedConcept": { "system": "http://hl7.org/fhir/sid/icd-10-cm", "code": "I10", "display": "Essential (primary) hypertension" }
    }
  ],
  "plan": [
    { "category": "medication", "detail": "Continue lisinopril 10mg once daily." },
    { "category": "followUp", "detail": "Return to clinic in 3 months for routine hypertension recheck." }
  ]
}
```

```ts
import { readFileSync } from "node:fs";
import { validate, renderNote, type SoapNote } from "@peerbits/soap-schema";

// Using readFileSync + JSON.parse here (rather than a JSON import) so this
// snippet runs unmodified under plain Node.js ESM, CommonJS, and bundlers
// alike — see docs/USER_GUIDE.md for bundler-specific JSON-import variants.
const note: unknown = JSON.parse(readFileSync("./primary-care-followup.json", "utf-8"));

const result = validate(note);
if (!result.valid) {
  throw new Error(`Invalid note: ${result.errors.map((e) => e.message).join("; ")}`);
}

console.log(renderNote(note as SoapNote));
```

**Output** — `renderNote()`'s rendered note (this is the entire point of the library: the same JSON above, legible to a clinician without touching code):

```markdown
# SOAP Note

*Encounter: primary-care-followup · Author: physician · 2026-02-10T14:30:00Z*

## Subjective

**Chief Complaint:** Follow-up for hypertension management

**History of Present Illness:**
Patient is a fictional 58-year-old presenting for a scheduled follow-up. Reports good adherence to lisinopril, home blood pressure readings averaging 132/84. Denies headache, chest pain, or shortness of breath.

**Review of Systems:**
- cardiovascular (negative) — Denies chest pain, palpitations, or edema.

## Objective

**Vitals:**
- Blood Pressure: 130/82 mmHg
- Heart Rate: 72 bpm

**Exam Findings:**
- cardiovascular: Regular rate and rhythm, no murmurs, rubs, or gallops.

## Assessment

- Essential hypertension, well controlled on current regimen (chronic) [Essential (primary) hypertension — http://hl7.org/fhir/sid/icd-10-cm I10]

## Plan

- **Medication:** Continue lisinopril 10mg once daily.
- **Follow-up:** Return to clinic in 3 months for routine hypertension recheck.
```

## 5. Architecture

```
schema/                       Canonical JSON Schema (draft 2020-12) — the source of truth
  soap-note.schema.json          Top-level note shape
  definitions/
    vitals.schema.json           Vital sign measurements, all optional
    coded-concept.schema.json    Generic {system, code, display} — not tied to any terminology
    note-metadata.schema.json    Encounter metadata; opaque patientRef, no direct identifiers

src/
  validate.ts                  validate(), assertValid() — ajv wrapper, structured errors
  types.ts                     Generated from schema/soap-note.schema.json (do not hand-edit)
  render.ts                    renderNote() — dependency-free markdown rendering
  index.ts                     Public API surface

fixtures/                      Synthetic example notes used by tests and docs
docs/FHIR_MAPPING_GUIDE.md     Section-by-section FHIR mapping guidance (docs only, no code)
```

**Key decisions:**

- The JSON Schema file is the canonical artifact, not the TypeScript types.
  Any language with a Draft 2020-12 validator can use `schema/*.json`
  directly without touching this npm package.
- Types are generated (`npm run generate:types`), never hand-maintained — a
  drift test in CI fails the build the moment the schema and the committed
  types disagree.
- `coded-concept.schema.json` deliberately stays coding-system-agnostic
  (`system` + `code` + `display`) — it does not assume ICD-10, SNOMED, or
  any other terminology, and does not validate codes against a real code
  set.
- No network calls, no OAuth, no sandbox dependency — this is a
  schema-and-validation library, structurally different from other repos in
  this initiative.

See [docs/FHIR_MAPPING_GUIDE.md](./docs/FHIR_MAPPING_GUIDE.md) for how this
schema's sections correspond to FHIR `Composition`, `Condition`, and
`Observation` resources.

## 6. Example Usage

Three complete synthetic encounters live in [`fixtures/valid/`](./fixtures/valid)
across distinct encounter types. §4 above showed a trimmed version of
`primary-care-followup.json` for readability; all three fixtures'
**full, untrimmed** `renderNote()` output — kept honest by the same
snapshot test suite
([`tests/__snapshots__/render.test.ts.snap`](./tests/__snapshots__/render.test.ts.snap))
— is reproduced in full below, not just linked.

### [`primary-care-followup.json`](./fixtures/valid/primary-care-followup.json) — routine chronic-disease follow-up, full fixture

```markdown
# SOAP Note

*Encounter: primary-care-followup · Author: physician · 2026-02-10T14:30:00Z*

## Subjective

**Chief Complaint:** Follow-up for hypertension management

**History of Present Illness:**
Patient is a fictional 58-year-old presenting for a scheduled follow-up. Reports good adherence to lisinopril, home blood pressure readings averaging 132/84. Denies headache, chest pain, or shortness of breath. No new symptoms since last visit.

**Review of Systems:**
- cardiovascular (negative) — Denies chest pain, palpitations, or edema.
- respiratory (negative) — Denies dyspnea or cough.
- neurological (negative) — Denies headache or dizziness.

## Objective

**Vitals:**
- Blood Pressure: 130/82 mmHg
- Heart Rate: 72 bpm
- Temperature: 36.7 C
- Respiratory Rate: 16 breaths/min
- SpO2: 98 %
- Weight: 84 kg

**Exam Findings:**
- cardiovascular: Regular rate and rhythm, no murmurs, rubs, or gallops.
- respiratory: Clear to auscultation bilaterally, no wheezes or crackles.
- extremities: No peripheral edema.

## Assessment

- Essential hypertension, well controlled on current regimen (chronic) [Essential (primary) hypertension — http://hl7.org/fhir/sid/icd-10-cm I10]

## Plan

- **Medication:** Continue lisinopril 10mg once daily.
- **Patient Education:** Reinforced low-sodium diet and home blood pressure monitoring.
- **Follow-up:** Return to clinic in 3 months for routine hypertension recheck.
```

### [`urgent-care-visit.json`](./fixtures/valid/urgent-care-visit.json) — acute injury visit with an imaging order

```markdown
# SOAP Note

*Encounter: urgent-care · Author: nurse-practitioner · 2026-03-22T09:15:00Z*

## Subjective

**Chief Complaint:** Right ankle pain after fall

**History of Present Illness:**
Fictional 27-year-old presents after twisting their right ankle while playing recreational basketball approximately 2 hours prior. Reports immediate swelling and difficulty bearing weight. Denies numbness or tingling. No prior ankle injuries on this side.

**Review of Systems:**
- musculoskeletal (positive) — Right ankle pain and swelling.
- neurological (negative) — Denies numbness or tingling in the foot.

## Objective

**Vitals:**
- Heart Rate: 84 bpm
- Temperature: 36.9 C
- Respiratory Rate: 18 breaths/min
- SpO2: 99 %

**Exam Findings:**
- musculoskeletal: Moderate swelling and ecchymosis over the right lateral malleolus, tender to palpation. No obvious deformity.
- musculoskeletal: Negative Ottawa ankle rules; able to bear weight for four steps with discomfort.
- skin: No open wounds or lacerations.

## Assessment

- Right lateral ankle sprain, grade II (active) [Sprain of unspecified ligament of right ankle, initial encounter — http://hl7.org/fhir/sid/icd-10-cm S93.401A]

## Plan

- **Order:** Right ankle X-ray series to rule out fracture, given borderline Ottawa criteria.
- **Medication:** Ibuprofen 400mg every 6 hours as needed for pain, with food.
- **Patient Education:** Discussed RICE protocol (rest, ice, compression, elevation) and use of an ankle brace.
- **Follow-up:** Follow up with primary care or orthopedics in 1 week if symptoms have not improved.
```

### [`telehealth-checkin.json`](./fixtures/valid/telehealth-checkin.json) — minimal encounter with no vitals captured

Demonstrates that every `objective.vitals` field, and `vitals` itself, is
optional — this note validates and renders cleanly with none of them
present.

```markdown
# SOAP Note

*Encounter: telehealth-checkin · Author: physician-assistant · 2026-01-05T16:45:00Z*

## Subjective

**Chief Complaint:** Medication check-in for seasonal allergies

**History of Present Illness:**
Fictional 34-year-old video-visit check-in regarding seasonal allergic rhinitis started last month. Reports significant improvement in nasal congestion and sneezing since starting cetirizine. No new symptoms. No side effects noted.

**Review of Systems:**
- ENT (positive) — Mild residual nasal congestion, improved from baseline.
- respiratory (negative) — Denies wheeze or shortness of breath.

## Objective

**Exam Findings:**
- general: Patient appears well on video, no acute distress observed.

## Assessment

- Seasonal allergic rhinitis, improving on current therapy (active) [Other seasonal allergic rhinitis — http://hl7.org/fhir/sid/icd-10-cm J30.2]

## Plan

- **Medication:** Continue cetirizine 10mg once daily.
- **Patient Education:** Advised on pollen-avoidance measures and saline nasal rinse as an adjunct.
- **Follow-up:** Telehealth follow-up in 4 weeks, or sooner if symptoms worsen.
```

Runnable versions of all of the above live in
[`docs/examples/`](./docs/examples) — including error-handling with
`assertValid()` and `SoapNoteValidationError`. See
[docs/USER_GUIDE.md](./docs/USER_GUIDE.md) for the full narrative walkthrough.

Two deliberately invalid fixtures in
[`fixtures/invalid/`](./fixtures/invalid) exercise the validator's error
reporting — see [`tests/validate.test.ts`](./tests/validate.test.ts) for
the exact expected error path/keyword each one asserts on.

```ts
import { assertValid, SoapNoteValidationError } from "@peerbits/soap-schema";

try {
  assertValid(candidateNote); // throws if invalid
  // candidateNote is now typed as SoapNote
} catch (err) {
  if (err instanceof SoapNoteValidationError) {
    for (const e of err.errors) {
      console.error(`${e.path}: ${e.message} (${e.keyword})`);
    }
  }
}
```

## 7. Roadmap

- [ ] A full FHIR `Composition` resource generator (turning a valid SOAP note into an actual FHIR resource) — candidate future repo once this schema and `fhir-client` both exist, per [docs/FHIR_MAPPING_GUIDE.md](./docs/FHIR_MAPPING_GUIDE.md)
- [ ] A future `medical-terminology` repo for ICD-10/CPT/SNOMED code validation and lookup against `coded-concept` references — explicitly out of scope here
- [ ] Clinical review sign-off on `docs/FHIR_MAPPING_GUIDE.md` §5 open items

## 8. Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Issues tagged `good first issue`
are a good place to start.

## 9. License

Apache License 2.0 — see [LICENSE](./LICENSE).

## 10. About PeerbitsSolution

soap-schema is part of the [PeerbitsSolution HealthTech Open Source](https://github.com/PeerbitsSolution)
initiative — reusable engineering components extracted from our healthcare
technology work, published so other teams don't have to solve the same
problems from scratch. This repository contains generalized, reusable logic
only; it is not tied to any specific client engagement or commercial product.
