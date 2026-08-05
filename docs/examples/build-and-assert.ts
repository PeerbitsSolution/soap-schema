/**
 * Runnable example: construct a note from scratch, validate it with the
 * throw-on-invalid API, and deliberately break it to see the error shape.
 *
 * Run with:
 *   npx tsx docs/examples/build-and-assert.ts
 */
import { SoapNoteValidationError, assertValid, renderNote, type SoapNote } from "../../src/index.js";

// A minimal but complete, fully synthetic note — every field invented for
// this example, no resemblance to a real encounter.
const note: SoapNote = {
  metadata: {
    encounterType: "primary-care-followup",
    authorRole: "physician",
    timestamp: new Date().toISOString(),
    patientRef: "example-patient-0001", // opaque — never a real name/DOB/MRN
  },
  subjective: {
    chiefComplaint: "Annual wellness visit, no acute concerns",
  },
  objective: {
    vitals: {
      heartRate: { value: 68, unit: "bpm" },
    },
  },
  assessment: [{ description: "Healthy adult, no active problems", status: "resolved" }],
  plan: [{ category: "followUp", detail: "Routine annual visit in 12 months." }],
};

assertValid(note); // throws SoapNoteValidationError if invalid; narrows the type on return
console.log(renderNote(note));

// Now show what a caller sees when assertValid() rejects bad input.
try {
  const broken = { ...note, subjective: { historyOfPresentIllness: "missing chiefComplaint" } };
  assertValid(broken);
} catch (error) {
  if (error instanceof SoapNoteValidationError) {
    console.log("\nCaught expected validation error:");
    for (const e of error.errors) {
      console.log(`  ${e.path} — ${e.message} (${e.keyword})`);
    }
  } else {
    throw error;
  }
}
