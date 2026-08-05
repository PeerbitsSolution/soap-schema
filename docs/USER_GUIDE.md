# soap-schema — User Guide

A complete, narrative walkthrough of `@peerbits/soap-schema`: what it is,
how to install and use it, the full API and schema field reference, error
handling, cross-language portability, versioning policy, and troubleshooting.

If you just want the fastest possible taste, the [README](../README.md#4-quick-start)
Quick Start is shorter. This guide is for when you're actually integrating
the library.

## Table of Contents

1. [Overview](#1-overview)
2. [Installation & requirements](#2-installation--requirements)
3. [Core concepts](#3-core-concepts)
4. [Getting started, step by step](#4-getting-started-step-by-step)
5. [API reference](#5-api-reference)
6. [Schema field reference](#6-schema-field-reference)
7. [Error handling](#7-error-handling)
8. [Using the schema from other languages](#8-using-the-schema-from-other-languages)
9. [Fixtures & examples](#9-fixtures--examples)
10. [FHIR mapping](#10-fhir-mapping)
11. [Versioning & schema evolution](#11-versioning--schema-evolution)
12. [Security & PHI guidance for consumers](#12-security--phi-guidance-for-consumers)
13. [Troubleshooting / FAQ](#13-troubleshooting--faq)
14. [Getting help](#14-getting-help)

---

## 1. Overview

`soap-schema` gives you three things, layered on top of each other:

1. **A canonical JSON Schema** (`schema/soap-note.schema.json`, draft
   2020-12) defining what a structured SOAP (Subjective, Objective,
   Assessment, Plan) clinical note looks like as data. This is the actual
   source of truth — it's a plain JSON Schema file, not a TypeScript-only
   concept, and works with any conformant validator in any language.
2. **A TypeScript validation library** (`validate`, `assertValid`) that
   wraps that schema with [ajv](https://ajv.js.org/) and returns
   structured, typed errors instead of a bare boolean.
3. **A rendering function** (`renderNote`) that turns a validated note into
   a clean markdown document with standard SOAP section headers — the
   piece that makes a note legible to a clinician who will never open the
   JSON.

What it deliberately does **not** do: generate a SOAP note from a
transcript (that's an AI/NLP problem, out of scope here), produce actual
FHIR resources (see [§10](#10-fhir-mapping) — guidance only), or validate
medical codes against a real code system like ICD-10 or SNOMED (the
`codedConcept` shape is intentionally generic — see [§6](#6-schema-field-reference)).

## 2. Installation & requirements

```bash
npm install @peerbits/soap-schema
```

- **Node.js >= 18.** The package ships as native ESM (`"type": "module"`
  in `package.json`).
- **No peer dependencies.** `ajv` and `ajv-formats` install automatically
  as regular dependencies.
- **TypeScript is optional at runtime** — the compiled `dist/` output is
  plain JS with `.d.ts` type declarations alongside it. You get full types
  for free if you use TypeScript; the library works identically from plain
  JS if you don't.
- **The raw schema ships too.** `schema/` is included in the published npm
  package (see `package.json`'s `files` field) specifically so non-JS
  consumers, or JS consumers who want to use a different validator, can
  read the `.json` files directly without touching any of the TS code —
  see [§8](#8-using-the-schema-from-other-languages).

## 3. Core concepts

### The schema is the source of truth, not the TypeScript types

This is the single most important thing to understand about this library.
`schema/soap-note.schema.json` and its `schema/definitions/*.json`
subschemas are the canonical artifact. `src/types.ts` is **generated from**
that schema (`npm run generate:types`, using
[json-schema-to-typescript](https://github.com/bcherny/json-schema-to-typescript))
and is never hand-edited — a CI-enforced test
([`tests/types-drift.test.ts`](../tests/types-drift.test.ts)) fails the
build the instant someone edits the schema without regenerating types, or
edits the generated file by hand.

If you ever need to answer "what does this library actually allow?", read
the schema files, not the TypeScript interfaces — the interfaces are a
derived convenience, and in the one-in-a-million case they've drifted, the
schema wins.

### Validation returns data, not just a boolean

`validate()` never throws and always returns a `ValidationResult`. Every
failure comes back as a structured `ValidationError` with a JSON Pointer
path, a human-readable message, and the JSON Schema keyword that failed —
enough to build a real error UI, not just "something's wrong."

`assertValid()` exists alongside it for call sites that would rather throw
and let a catch block (or an unhandled rejection, deliberately) stop
execution. Both run the exact same underlying ajv validator; pick whichever
control-flow style fits the call site.

### Rendering does not validate

`renderNote()` takes a `SoapNote` — already a *valid* note, typed as such
— and produces markdown. It does not re-validate its input. If you have an
`unknown` value from outside your program (an HTTP body, a file, an LLM's
output), always call `validate()` or `assertValid()` first. Passing an
unvalidated object cast to `SoapNote` will not throw, but the rendered
output may be missing sections or contain `undefined` in the text.

## 4. Getting started, step by step

This walks through the same flow as the README Quick Start, with more
explanation at each step.

### Step 1 — get a candidate note

In a real application this comes from an LLM's structured output, a form
submission, or an upstream system. For this walkthrough, use one of the
repo's fixtures:

```ts
import { readFileSync } from "node:fs";

const candidate: unknown = JSON.parse(
  readFileSync("./primary-care-followup.json", "utf-8"),
);
```

Note the `unknown` type — this is the honest type for "JSON I haven't
checked yet." Don't cast it to `SoapNote` until it's actually been
validated.

### Step 2 — validate it

```ts
import { validate } from "@peerbits/soap-schema";

const result = validate(candidate);

if (!result.valid) {
  // Handle result.errors — see §7 for the shape and a real example.
  console.error("Invalid note:", result.errors);
} else {
  // TypeScript does not automatically narrow `candidate` here — validate()
  // returns a result object, it doesn't assert on its argument. Use
  // assertValid() (next section) if you want narrowing.
}
```

### Step 3 — or use the throw-and-narrow variant

If you'd rather fail fast and get a narrowed `SoapNote` back, use
`assertValid()` instead of branching on `validate()`'s return value:

```ts
import { assertValid, type SoapNote } from "@peerbits/soap-schema";

assertValid(candidate); // throws SoapNoteValidationError if invalid
// candidate is now typed as SoapNote by TypeScript's control-flow analysis
const note: SoapNote = candidate;
```

### Step 4 — render it

```ts
import { renderNote } from "@peerbits/soap-schema";

console.log(renderNote(note));
```

That's the whole flow. See [`docs/examples/`](./examples) for two complete,
runnable scripts covering both styles
([`validate-and-render.ts`](./examples/validate-and-render.ts) and
[`build-and-assert.ts`](./examples/build-and-assert.ts)).

## 5. API reference

Everything below is exported from the package root
(`import { ... } from "@peerbits/soap-schema"`) — there is no deep-import
surface; internal modules like the schema file loader are not part of the
stability contract.

### `validate(note: unknown): ValidationResult`

```ts
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  /** JSON Pointer to the failing location, e.g. "/subjective/chiefComplaint". Root-level failures use "/". */
  path: string;
  /** Human-readable failure description (from ajv). */
  message: string;
  /** The JSON Schema keyword that failed, e.g. "required", "type", "enum", "additionalProperties". */
  keyword: string;
}
```

Never throws. `errors` is always `[]` when `valid` is `true`. Ajv is
configured with `allErrors: true`, so a single call surfaces every failure
in one pass rather than stopping at the first one.

### `assertValid(note: unknown): asserts note is SoapNote`

Runs the same validation as `validate()`. Throws
`SoapNoteValidationError` (see below) if invalid; otherwise returns `void`
and TypeScript narrows the argument to `SoapNote` at the call site via the
`asserts` return type.

### `class SoapNoteValidationError extends Error`

```ts
class SoapNoteValidationError extends Error {
  readonly errors: ValidationError[];
}
```

Thrown only by `assertValid()`. `error.message` is a single-line summary of
all failures (joined with `; `); `error.errors` gives you the structured
list for programmatic handling. Always `instanceof`-check before reading
`.errors` — see [§7](#7-error-handling).

### `renderNote(note: SoapNote): string`

Converts an already-valid note into markdown with standard SOAP section
headers (`# SOAP Note`, `## Subjective`, `## Objective`, `## Assessment`,
`## Plan`). Deterministic and side-effect-free — the same input always
produces the same output, which is what makes it safe to snapshot-test
(see [`tests/render.test.ts`](../tests/render.test.ts)).

Every optional section (HPI, review of systems, vitals, exam findings) is
omitted from the output entirely when absent from the input, rather than
rendered as an empty heading — see the `telehealth-checkin` fixture's
rendered output in the README for an example with no vitals at all.

Has no dependencies beyond the TypeScript standard library — intentionally
no templating engine, matching the rest of this library's zero-runtime-
dependency-beyond-ajv philosophy.

### Types

All generated from `schema/soap-note.schema.json` — see
[§6](#6-schema-field-reference) for the authoritative field-by-field
reference; these are just the TypeScript shapes.

```ts
import type {
  SoapNote,
  NoteMetadata,
  ReviewOfSystemsFinding,
  Vitals,
  Measurement,
  ExamFinding,
  Problem,
  CodedConcept,
  PlanItem,
} from "@peerbits/soap-schema";
```

## 6. Schema field reference

This mirrors `schema/soap-note.schema.json` and its subschemas exactly —
if this table and the schema file ever disagree, the schema file is
correct (see [§3](#3-core-concepts)).

### Top level (`SoapNote`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `metadata` | `NoteMetadata` | ✅ | See below. |
| `subjective` | object | ✅ | |
| `objective` | object | ✅ | |
| `assessment` | `Problem[]` | ✅ | Can be an empty array. |
| `plan` | `PlanItem[]` | ✅ | Can be an empty array. |

No additional top-level properties are allowed (`additionalProperties: false`).

### `metadata` (`note-metadata.schema.json`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `encounterType` | string | ✅ | Free text, e.g. `primary-care-followup`, `urgent-care`, `telehealth-checkin`. Not an enum — the schema doesn't constrain encounter types to a fixed list. |
| `authorRole` | string | ✅ | Free text, e.g. `physician`, `nurse-practitioner`. |
| `timestamp` | string | ✅ | ISO 8601 date-time (validated via the `date-time` format keyword). |
| `patientRef` | string | ❌ | **Opaque.** Must not be a real name, DOB, or MRN — see [§12](#12-security--phi-guidance-for-consumers). |

### `subjective`

| Field | Type | Required | Notes |
|---|---|---|---|
| `chiefComplaint` | string | ✅ | Non-empty. |
| `historyOfPresentIllness` | string | ❌ | Free-text narrative. |
| `reviewOfSystems` | `ReviewOfSystemsFinding[]` | ❌ | |

`ReviewOfSystemsFinding`: `system` (string, required), `status` (required,
one of `"positive" | "negative" | "not-assessed"`), `finding` (string,
optional).

### `objective`

| Field | Type | Required | Notes |
|---|---|---|---|
| `vitals` | `Vitals` | ❌ | See below. |
| `examFindings` | `ExamFinding[]` | ❌ | |

`ExamFinding`: `bodySystem` (string, required), `finding` (string,
required).

### `vitals.schema.json`

Every field is independently optional — **never assume all are present.**
The `telehealth-checkin` fixture omits `vitals` entirely and still
validates.

| Field | Type | Notes |
|---|---|---|
| `bloodPressure.systolic` | `Measurement` | |
| `bloodPressure.diastolic` | `Measurement` | |
| `heartRate` | `Measurement` | |
| `temperature` | `Measurement` | |
| `respiratoryRate` | `Measurement` | |
| `spo2` | `Measurement` | |
| `height` | `Measurement` | |
| `weight` | `Measurement` | |

`Measurement`: `{ value: number, unit: string }`, both required. `unit` is
required specifically so a bare number is never ambiguous (lb vs kg, °F vs
°C) — the schema does not assume or normalize units.

### `assessment[]` (`Problem`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `description` | string | ✅ | Non-empty. |
| `status` | string | ✅ | One of `"active" \| "resolved" \| "chronic"`. |
| `codedConcept` | `CodedConcept` | ❌ | **Optional by design** — the schema validates problems that have no coding applied yet. |

### `plan[]` (`PlanItem`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `category` | string | ✅ | One of `"medication" \| "order" \| "referral" \| "followUp" \| "patientEducation"`. |
| `detail` | string | ✅ | Free text. |

### `coded-concept.schema.json`

**Deliberately generic** — does not assume or hardcode ICD-10, SNOMED CT,
LOINC, or any other terminology. This repo does not validate that `code`
is a real, current code within `system`; that's explicitly out of scope
(see the future `medical-terminology` repo in the [README roadmap](../README.md#7-roadmap)).

| Field | Type | Required | Notes |
|---|---|---|---|
| `system` | string (URI) | ✅ | e.g. `http://hl7.org/fhir/sid/icd-10-cm`, `http://snomed.info/sct`. |
| `code` | string | ✅ | Non-empty. |
| `display` | string | ✅ | Non-empty, human-readable. |

## 7. Error handling

### Reading a `ValidationResult`

```ts
const result = validate(candidate);
if (!result.valid) {
  for (const error of result.errors) {
    console.error(`${error.path}: ${error.message} (${error.keyword})`);
  }
}
```

For the fixture in [`fixtures/invalid/missing-chief-complaint.json`](../fixtures/invalid/missing-chief-complaint.json),
this prints:

```
/subjective: must have required property 'chiefComplaint' (required)
```

For [`fixtures/invalid/wrong-type-vitals.json`](../fixtures/invalid/wrong-type-vitals.json):

```
/objective/vitals/heartRate/value: must be number (type)
```

Both are exercised exactly this way in
[`tests/validate.test.ts`](../tests/validate.test.ts), which asserts on
the specific `path`/`keyword` pair, not just that *some* error occurred —
copy that test's pattern for your own regression tests against this
schema.

### Catching `SoapNoteValidationError`

```ts
import { assertValid, SoapNoteValidationError } from "@peerbits/soap-schema";

try {
  assertValid(candidate);
} catch (error) {
  if (error instanceof SoapNoteValidationError) {
    // error.errors is the same ValidationError[] shape as above
    respondWithValidationErrors(error.errors);
  } else {
    throw error; // something else went wrong — don't swallow it
  }
}
```

### Common validation failures and what they mean

| `keyword` | Typical cause | Fix |
|---|---|---|
| `required` | A required field is missing at the path shown (the path points to the *containing* object, not the missing field itself — check `error.message` for the field name). | Add the missing field. |
| `type` | A field has the wrong JSON type (e.g. a string where a number is expected). | Fix the value's type at the source — this is the most common failure mode for LLM-generated output that stringifies numbers. |
| `enum` | A field like `status` or `category` has a value outside its fixed set. | Check [§6](#6-schema-field-reference) for the exact allowed values — they are case-sensitive. |
| `additionalProperties` | An object has a field not defined in the schema. | Either remove the field, or if it's genuinely needed, that's a schema change — open an issue rather than working around it locally. |
| `format` | A `timestamp` isn't valid ISO 8601, or a `system` URI is malformed. | Fix the source data's formatting. |

## 8. Using the schema from other languages

The JSON Schema files under `schema/` are the canonical artifact — see
[§3](#3-core-concepts) — and work with any Draft 2020-12–conformant
validator, not just ajv. This is not a theoretical claim: the example
below was run against this repo's actual schema and fixture files using
Python's [`jsonschema`](https://python-jsonschema.readthedocs.io/) library
(a completely independent implementation from ajv) as part of verifying
this guide.

```python
# pip install jsonschema referencing
import json
from referencing import Registry, Resource
from jsonschema import Draft202012Validator

def load(path):
    with open(path) as f:
        return json.load(f)

soap_note = load("schema/soap-note.schema.json")
vitals = load("schema/definitions/vitals.schema.json")
coded_concept = load("schema/definitions/coded-concept.schema.json")
note_metadata = load("schema/definitions/note-metadata.schema.json")

# The subschemas' $id values are what soap-note.schema.json's $refs
# resolve against — register each by its own $id.
registry = Registry().with_resources([
    (s["$id"], Resource.from_contents(s))
    for s in (soap_note, vitals, coded_concept, note_metadata)
])

validator = Draft202012Validator(soap_note, registry=registry)

note = load("fixtures/valid/primary-care-followup.json")
errors = list(validator.iter_errors(note))
print("valid" if not errors else errors)
```

This prints `valid` for all three fixtures under `fixtures/valid/` and
produces the expected error for each fixture under `fixtures/invalid/`
using nothing but the `.json` files — no npm install, no TypeScript,
confirming the "canonical artifact is the JSON Schema file itself" claim
in the README's [Architecture section](../README.md#5-architecture) for
real, not just in principle.

The same approach works with any other Draft 2020-12 validator (Java's
`json-schema-validator`, Go's `santhosh-tekuri/jsonschema`, .NET's
`JsonSchema.Net`, etc.) — register the four schema files by their `$id`
and validate against `soap-note.schema.json`.

## 9. Fixtures & examples

| Fixture | Encounter type | Notable for |
|---|---|---|
| [`fixtures/valid/primary-care-followup.json`](../fixtures/valid/primary-care-followup.json) | `primary-care-followup` | Full-featured note — all optional sections populated. |
| [`fixtures/valid/urgent-care-visit.json`](../fixtures/valid/urgent-care-visit.json) | `urgent-care` | A `plan` item with category `order`; partial vitals (no blood pressure). |
| [`fixtures/valid/telehealth-checkin.json`](../fixtures/valid/telehealth-checkin.json) | `telehealth-checkin` | No `vitals` at all — proves every vitals field, and the vitals object itself, is optional. |
| [`fixtures/invalid/missing-chief-complaint.json`](../fixtures/invalid/missing-chief-complaint.json) | — | Missing the required `chiefComplaint` field. |
| [`fixtures/invalid/wrong-type-vitals.json`](../fixtures/invalid/wrong-type-vitals.json) | — | `vitals.heartRate.value` is a string instead of a number. |

All fixture content is invented and synthetic — see
[§12](#12-security--phi-guidance-for-consumers) for why that matters and
what it means for your own fixtures if you extend this schema.

Runnable example scripts: [`docs/examples/`](./examples), covered in
[§4](#4-getting-started-step-by-step) above.

## 10. FHIR mapping

This repo ships **documentation only** for mapping a `soap-schema` note
onto FHIR R4 — no code here generates FHIR resources (that's an explicit
future-repo candidate, see the [README roadmap](../README.md#7-roadmap)).

See **[docs/FHIR_MAPPING_GUIDE.md](./FHIR_MAPPING_GUIDE.md)** for the
full section-by-section mapping to `Composition.section`, `Condition`, and
`Observation`, grounded in the actual FHIR Composition resource and US
Core Clinical Notes guidance. That document is explicitly flagged as
**pending clinical review** — read its status banner before treating any
of its LOINC codes or resource mappings as final.

## 11. Versioning & schema evolution

- **Package version** follows [Semantic Versioning](https://semver.org/) —
  see [`CHANGELOG.md`](../CHANGELOG.md).
- **Schema version** is carried in each schema file's `$id` URI path
  segment (`.../v1/soap-note.schema.json`). When a future change to the
  schema is a **breaking** change (removing a required field's validity,
  tightening a type, removing an enum value), the `$id` version segment
  bumps (`v1` → `v2`) alongside a major version bump of the npm package.
  Additive, backward-compatible changes (a new optional field, a new enum
  value) do not require a schema version bump.
- **Generated types always track the schema** — never hand-edit
  `src/types.ts`; run `npm run generate:types` after any schema change and
  let `tests/types-drift.test.ts` confirm they match before you commit.

If you're pinning against this schema in a downstream project, pin by
package version (`package.json`'s `dependencies`), not by the `$id` URI —
the URI identifies the schema, it isn't a fetchable resource with version
history of its own.

## 12. Security & PHI guidance for consumers

This library ships with **zero real patient data** — every fixture is an
invented, clearly fictional encounter (see
[SECURITY.md](../SECURITY.md) and the org-level PHI Sanitization
Checklist this repo was built against). That guarantee is about this
repo's own contents; it does not automatically extend to how you use the
schema in your own application. Specifically:

- **`metadata.patientRef` is intentionally opaque.** The schema does not
  define or expect a name, date of birth, or MRN anywhere. Do not put one
  in `patientRef` — resolving that reference to an actual patient identity
  is explicitly *your* application's responsibility, not something this
  library does or should do.
- **Free-text fields are free text.** `historyOfPresentIllness`,
  `chiefComplaint`, exam finding text, and plan `detail` fields are
  unconstrained strings. The schema cannot stop a caller from typing a
  real patient's name into a narrative field — that's an application-level
  data-handling concern, not something JSON Schema validation can enforce.
- **If you fork this schema for internal fixtures,** keep them synthetic.
  The org guidance this repo follows is explicit: invent a plausible but
  clearly fictional encounter, never style one after a real case.

## 13. Troubleshooting / FAQ

**"Cannot find module '@peerbits/soap-schema'" / import errors under plain Node.js.**
Confirm you're on Node >= 18 and that your project either has
`"type": "module"` in `package.json` or you're using dynamic `import()` —
this package ships as native ESM.

**A JSON import of a fixture fails with `ERR_IMPORT_ATTRIBUTE_MISSING`.**
This happens when importing a `.json` file directly in Node ESM without an
`with { type: "json" }` import attribute (a relatively new, still-evolving
part of the JS module spec). The examples in this guide and the README use
`readFileSync` + `JSON.parse` instead specifically to sidestep this —
that pattern works unmodified across Node ESM, CommonJS, and bundlers.

**`validate()` says valid but `renderNote()`'s output looks wrong / has blank sections.**
`renderNote()` does not validate its input (see [§3](#3-core-concepts)).
If you skipped `validate()`/`assertValid()` and cast an object to
`SoapNote` directly, you may be rendering data that doesn't actually match
the schema. Always validate first.

**I added a field to the schema and now `npm test` fails on `types-drift.test.ts`.**
Expected — run `npm run generate:types` to regenerate `src/types.ts`, then
re-run tests. This test exists specifically to catch exactly this case.

**Can I add ICD-10/SNOMED validation to `coded-concept`?**
Not in this repo, by design — see [§6](#6-schema-field-reference) and the
Out of Scope section of the README. That belongs in a future
`medical-terminology` repo that validates codes against real, versioned
code sets; hardcoding one terminology into this schema would break the
other terminologies it's meant to support generically.

**Does this repo call any external service, or need any credentials?**
No. There is no network access, no auth flow, and no sandbox dependency
anywhere in this repo — see [SECURITY.md](../SECURITY.md).

## 14. Getting help

- Bug or unexpected behavior: open a [GitHub issue](https://github.com/PeerbitsSolution/soap-schema/issues) using the bug report template.
- Feature request or schema change proposal: open an issue using the feature request template — see [CONTRIBUTING.md](../CONTRIBUTING.md) first, especially the scope boundaries.
- Security vulnerability: **do not** open a public issue — see [SECURITY.md](../SECURITY.md) for private reporting instructions.
