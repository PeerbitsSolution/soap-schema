/**
 * @peerbits/soap-schema
 * Canonical JSON Schema and TypeScript validation library for structured
 * SOAP clinical notes.
 *
 * Public API surface — everything a consumer should import lives here.
 * Internal modules (schema-loader.ts) are not part of the stability
 * contract and can change without a major version bump.
 */

export { validate, assertValid, SoapNoteValidationError } from "./validate.js";
export type { ValidationError, ValidationResult } from "./validate.js";

export { renderNote } from "./render.js";

export type {
  SoapNote,
  NoteMetadata,
  ReviewOfSystemsFinding,
  Vitals,
  Measurement,
  ExamFinding,
  Problem,
  CodedConcept,
  PlanItem,
} from "./types.js";

export const VERSION = "0.1.0";
