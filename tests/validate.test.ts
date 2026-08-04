import { describe, expect, it } from "vitest";

import { SoapNoteValidationError, assertValid, validate } from "../src/validate.js";
import { INVALID_FIXTURES, VALID_FIXTURES, loadFixture } from "./fixture-loader.js";

describe("validate", () => {
  for (const file of VALID_FIXTURES) {
    it(`accepts the valid fixture ${file}`, () => {
      const note = loadFixture(file);
      const result = validate(note);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  }

  for (const { file, expectedPath, expectedKeyword } of INVALID_FIXTURES) {
    it(`rejects the invalid fixture ${file} with the expected error`, () => {
      const note = loadFixture(file);
      const result = validate(note);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ path: expectedPath, keyword: expectedKeyword }),
      );
    });
  }

  it("rejects a value that is not an object at all", () => {
    const result = validate("not a soap note");
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.keyword).toBe("type");
  });

  it("rejects additional, undeclared top-level properties", () => {
    const note = loadFixture(VALID_FIXTURES[0]) as Record<string, unknown>;
    const result = validate({ ...note, unexpectedField: "should not be allowed" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({ keyword: "additionalProperties" }));
  });
});

describe("assertValid", () => {
  it("does not throw for a valid note", () => {
    const note = loadFixture(VALID_FIXTURES[0]);
    expect(() => assertValid(note)).not.toThrow();
  });

  it("throws SoapNoteValidationError with populated errors for an invalid note", () => {
    const note = loadFixture(INVALID_FIXTURES[0].file);
    try {
      assertValid(note);
      expect.unreachable("assertValid should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(SoapNoteValidationError);
      expect((error as SoapNoteValidationError).errors.length).toBeGreaterThan(0);
    }
  });
});
