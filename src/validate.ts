import Ajv2020, { type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import { loadSchema } from "./schema-loader.js";
import type { SoapNote } from "./types.js";

/** A single validation failure, mirroring an Ajv error but with a stable, minimal shape. */
export interface ValidationError {
  /** JSON Pointer path to the failing location, e.g. "/subjective/chiefComplaint". */
  path: string;
  /** Human-readable description of the failure. */
  message: string;
  /** The JSON Schema keyword that failed, e.g. "required", "enum", "type". */
  keyword: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);

ajv.addSchema(loadSchema("definitions/vitals.schema.json"));
ajv.addSchema(loadSchema("definitions/coded-concept.schema.json"));
ajv.addSchema(loadSchema("definitions/note-metadata.schema.json"));

const validateFn: ValidateFunction = ajv.compile(loadSchema("soap-note.schema.json"));

function toValidationErrors(errors: ErrorObject[] | null | undefined): ValidationError[] {
  if (!errors) {
    return [];
  }
  return errors.map((error) => ({
    path: error.instancePath === "" ? "/" : error.instancePath,
    message: error.message ?? "Validation failed",
    keyword: error.keyword,
  }));
}

/**
 * Validates an unknown value against the soap-note schema.
 * Never throws — inspect `result.valid` / `result.errors` instead.
 */
export function validate(note: unknown): ValidationResult {
  const valid = validateFn(note);
  return {
    valid: Boolean(valid),
    errors: toValidationErrors(validateFn.errors),
  };
}

export class SoapNoteValidationError extends Error {
  public readonly errors: ValidationError[];

  constructor(errors: ValidationError[]) {
    super(
      `Invalid SOAP note: ${errors.map((e) => `${e.path} ${e.message}`).join("; ") || "unknown validation failure"}`,
    );
    this.name = "SoapNoteValidationError";
    this.errors = errors;
  }
}

/**
 * Throws {@link SoapNoteValidationError} if `note` does not conform to the
 * soap-note schema; narrows to {@link SoapNote} on return for callers who
 * prefer to fail fast rather than branch on `validate()`'s result.
 */
export function assertValid(note: unknown): asserts note is SoapNote {
  const result = validate(note);
  if (!result.valid) {
    throw new SoapNoteValidationError(result.errors);
  }
}
