# soap-schema

> Canonical JSON Schema and TypeScript validation library for structured SOAP clinical notes

**Category:** AI Clinical Documentation — Clinical Documentation Components · **License:** Apache-2.0 · **Status:** alpha (v0.1.0, pre-1.0)

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

## 4. Quick Start

Every field below is invented — see [`fixtures/valid/`](./fixtures/valid) for the full synthetic encounter this is drawn from.

**Input** — a plain JSON object (from `fixtures/valid/primary-care-followup.json`):

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
import { validate, renderNote } from "@peerbits/soap-schema";
import note from "./primary-care-followup.json";

const result = validate(note);
if (!result.valid) {
  throw new Error(`Invalid note: ${result.errors.map((e) => e.message).join("; ")}`);
}

console.log(renderNote(note));
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

Three complete synthetic encounters live in
[`fixtures/valid/`](./fixtures/valid), each rendered in full in
[`tests/__snapshots__/render.test.ts.snap`](./tests/__snapshots__/render.test.ts.snap):

- [`primary-care-followup.json`](./fixtures/valid/primary-care-followup.json) — routine chronic-disease follow-up (shown above)
- [`urgent-care-visit.json`](./fixtures/valid/urgent-care-visit.json) — acute injury visit with an imaging order
- [`telehealth-checkin.json`](./fixtures/valid/telehealth-checkin.json) — minimal encounter with no vitals captured, demonstrating that every `objective`/`vitals` field is optional

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

## 10. About Peerbits

soap-schema is part of the [Peerbits HealthTech Open Source](https://github.com/PeerbitsSolution)
initiative — reusable engineering components extracted from our healthcare
technology work, published so other teams don't have to solve the same
problems from scratch. This repository contains generalized, reusable logic
only; it is not tied to any specific client engagement or commercial product.
