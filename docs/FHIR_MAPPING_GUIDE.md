# FHIR Mapping Guide — soap-schema → FHIR R4

> **Status: documentation only, not implemented in this repo.** This guide
> describes how a *future* implementation could map a valid `soap-schema`
> note onto FHIR R4 resources. No code in this repository generates FHIR
> resources — see [Roadmap](../README.md#7-roadmap).
>
> **⚠️ Requires clinical review before this guide is treated as authoritative.**
> Per the repo's Definition of Done, this document must be reviewed by
> someone with clinical documentation familiarity, not just the implementing
> engineer, before it's relied on for a real mapping implementation. Section
> 5 lists the specific items that need that review.

## 1. Purpose

`soap-schema` defines a vendor-neutral, structured SOAP note shape. It does
not itself produce FHIR resources. This guide exists so a future
implementation (see the roadmap in the main README) has a starting point
grounded in the actual FHIR specification and US Core guidance, rather than
each project inventing its own mapping.

## 2. How a structured note fits into FHIR exchange

Before mapping individual fields, it matters which FHIR resource actually
carries a clinical note on the wire. Two resources are relevant, and they
are not interchangeable:

- **[`Composition`](https://hl7.org/fhir/composition.html)** — a
  structured document resource with typed `section`s, each of which can
  carry both human-readable narrative (`section.text`) and references to
  discrete resources (`section.entry`). This is the resource FR7 asks this
  guide to map to, and it's the natural fit for a schema that already has
  named, structured sections.
- **`DocumentReference`** — per the [US Core Clinical Notes
  guidance](https://build.fhir.org/ig/HL7/US-Core/clinical-notes.html),
  this is the resource **US Core actually standardizes on** for exchanging
  clinical notes (reads and writes). `DocumentReference` is explicitly
  described as the right choice for narrative broader than a single
  order/report — e.g. a progress note — and can *point to* a `Composition`,
  a CDA document, a PDF, or plain text via `content.attachment`.
  `Composition` itself is acknowledged by the guide but is **not** the
  primary exchange resource it requires servers to expose.

**Implication for a future implementation:** the realistic FHIR-facing shape
is a `DocumentReference` whose `content.attachment` wraps either rendered
text/HTML (via this repo's `renderNote()`) or a `Composition` built using
the section mapping below. Section 3 maps to `Composition.section` because
that's what FR7 asks for and because it's the more precise structural
target — but don't assume a US Core–conformant server will accept a bare
`Composition` over the wire without a wrapping `DocumentReference`.

## 3. Section-by-section mapping

LOINC section codes below are drawn directly from FHIR's own
[`doc-section-codes` value set](https://www.hl7.org/fhir/valueset-doc-section-codes.html)
(the codes FHIR itself ships for `Composition.section.code` /
C-CDA-aligned sections) — not inferred from general knowledge, per this
initiative's AI guardrails.

| `soap-schema` field | FHIR target | LOINC section code | Notes |
|---|---|---|---|
| `metadata.encounterType` | `Composition.encounter` / `Encounter.type` | — | Resolve to a full `Encounter` reference; this schema only carries a free-text label. |
| `metadata.authorRole` | `Composition.author` (via the referenced `Practitioner`/`PractitionerRole`) | — | `authorRole` is descriptive text here, not a coded `PractitionerRole` — a real implementation should resolve it to an actual practitioner resource, not copy the string. |
| `metadata.timestamp` | `Composition.date` | — | Direct copy, already ISO 8601. |
| `metadata.patientRef` | `Composition.subject` | — | `patientRef` is intentionally opaque (see §6.1 of the handover and `note-metadata.schema.json`); resolving it to a `Patient` resource reference is the caller's responsibility, not this schema's. |
| `subjective.chiefComplaint` | `Composition.section` (narrative) | `10154-3` "Chief complaint Narrative - Reported" | Section `text.div` = the complaint text. |
| `subjective.historyOfPresentIllness` | `Composition.section` (narrative) | `10164-2` "History of Present illness Narrative" | Narrative-only; no discrete `entry` in FHIR R4 for free-text HPI. |
| `subjective.reviewOfSystems[]` | `Composition.section` (narrative), optionally `Observation` entries | `10187-3` "Review of systems Narrative - Reported" | Each finding's `status` (`positive`/`negative`/`not-assessed`) could map to `Observation.value[x]` / `Observation.status` if a future version produces discrete `Observation` resources per system; for now this is narrative-only. |
| `objective.vitals` | `Observation` (US Core Vital Signs profiles), referenced from a `Composition.section` | `8716-3` "Vital signs" | Each populated vitals field (`heartRate`, `bloodPressure`, etc.) maps to one `Observation` using the relevant [US Core Vital Signs](https://hl7.org/fhir/R4/observation-vitalsigns.html) profile and its LOINC code (e.g. heart rate is LOINC `8867-4`) — this repo's `vitals.schema.json` intentionally does not embed those per-vital-sign LOINC codes; that binding belongs in the future implementation. |
| `objective.examFindings[]` | `Composition.section` (narrative), optionally `Observation`/`ClinicalImpression` entries | `29545-1` "Physical findings Narrative" | `bodySystem` could inform `Observation.bodySite` in a discrete-entry implementation. |
| `assessment[]` | `Condition` resources, referenced from a `Composition.section` | `57852-6` "Problem list Narrative - Reported" | `problem.status` (`active`/`resolved`/`chronic`) maps to `Condition.clinicalStatus` (note: FHIR's `Condition.clinicalStatus` value set — `active`/`recurrence`/`relapse`/`inactive`/`remission`/`resolved` — is not a 1:1 match with this schema's three-value status; a future mapper needs an explicit conversion table, not a direct string copy). `problem.codedConcept`, when present, maps to `Condition.code`. |
| `plan[]` | `Composition.section`, with category-specific discrete resources | — (no single stable LOINC code covers all five plan categories) | `category: "medication"` → `MedicationRequest`; `"order"` → `ServiceRequest`; `"referral"` → `ServiceRequest` with a referral category, per FHIR guidance; `"followUp"` and `"patientEducation"` → narrative-only `Composition.section` content in most implementations, as FHIR has no single canonical discrete resource for either. **This mapping needs clinical/informatics review** — see §5. |

## 4. Coding-system neutrality

`coded-concept.schema.json` deliberately defines only `{ system, code,
display }` and does not assume ICD-10-CM, SNOMED CT, or any other specific
terminology. When mapping `problem.codedConcept` to `Condition.code`, the
`system` URI carried in the note is passed straight through to
`CodeableConcept.coding.system` — this repo does not validate that the
`code` is a real, current code within that system. Code-set validation
(ICD-10/SNOMED/LOINC lookups) is explicitly out of scope here; see the
future `medical-terminology` repo referenced in the main README's roadmap.

## 5. Open items requiring clinical review

These are flagged, not resolved, in this document — an engineer-only pass
is not sufficient per the repo's Definition of Done:

1. **`assessment[].status` → `Condition.clinicalStatus` conversion table.**
   This schema's three-value status (`active`/`resolved`/`chronic`) needs an
   explicit, clinically-reviewed mapping onto FHIR's six-value
   `Condition.clinicalStatus` value set — a naive string copy is wrong for
   at least `chronic`, which has no direct FHIR equivalent.
2. **LOINC code for `subjective.chiefComplaint`.** Verify `10154-3` "Chief
   complaint Narrative - Reported" is the section code a target EHR
   actually expects — some systems use a different or locally-extended
   code for chief complaint sections.
3. **`plan[]` category → discrete resource mapping**, especially whether
   `referral` should map to `ServiceRequest` or `Task`, and how
   `followUp`/`patientEducation` should be represented when a target system
   wants more than narrative text.
4. **Per-vital-sign LOINC bindings** for `objective.vitals` fields (e.g.
   confirming `8867-4` for heart rate, `8480-6`/`8462-4` for systolic/
   diastolic blood pressure) against the specific
   [US Core Vital Signs](https://hl7.org/fhir/R4/observation-vitalsigns.html)
   profile version a target implementation adopts.

## 6. References

- [FHIR R4 Composition resource](https://hl7.org/fhir/composition.html)
- [FHIR `doc-section-codes` value set](https://www.hl7.org/fhir/valueset-doc-section-codes.html)
- [US Core Clinical Notes guidance](https://build.fhir.org/ig/HL7/US-Core/clinical-notes.html)
- [US Core Vital Signs profiles](https://hl7.org/fhir/R4/observation-vitalsigns.html)
- [FHIR R4 Condition resource](https://hl7.org/fhir/R4/condition.html)
