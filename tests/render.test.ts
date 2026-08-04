import { describe, expect, it } from "vitest";

import { renderNote } from "../src/render.js";
import { assertValid } from "../src/validate.js";
import { VALID_FIXTURES, loadFixture } from "./fixture-loader.js";

describe("renderNote", () => {
  for (const file of VALID_FIXTURES) {
    it(`renders a stable, human-readable note for ${file}`, () => {
      const note = loadFixture(file);
      assertValid(note);
      expect(renderNote(note)).toMatchSnapshot();
    });
  }

  it("renders a bare-minimum note without crashing on absent optional sections", () => {
    const note = loadFixture(VALID_FIXTURES[2]);
    assertValid(note);
    const output = renderNote(note);
    expect(output).toContain("# SOAP Note");
    expect(output).toContain("## Subjective");
    expect(output).toContain("## Objective");
    expect(output).toContain("## Assessment");
    expect(output).toContain("## Plan");
  });
});
