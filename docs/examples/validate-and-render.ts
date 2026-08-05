/**
 * Runnable example: validate every fixture and render the valid ones.
 *
 * Run with:
 *   npx tsx docs/examples/validate-and-render.ts
 *
 * This mirrors exactly what tests/validate.test.ts and tests/render.test.ts
 * assert on — it exists so you can see the library work end-to-end without
 * reading test code.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { renderNote, validate } from "../../src/index.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function loadFixture(relativePath: string): unknown {
  return JSON.parse(readFileSync(join(repoRoot, "fixtures", relativePath), "utf-8"));
}

const validFixtures = [
  "valid/primary-care-followup.json",
  "valid/urgent-care-visit.json",
  "valid/telehealth-checkin.json",
];

const invalidFixtures = ["invalid/missing-chief-complaint.json", "invalid/wrong-type-vitals.json"];

console.log("=== Valid fixtures ===\n");
for (const file of validFixtures) {
  const note = loadFixture(file);
  const result = validate(note);
  console.log(`${file}: valid=${result.valid}`);
  if (result.valid) {
    // Safe to render once validated — renderNote() does not re-validate.
    console.log(renderNote(note as Parameters<typeof renderNote>[0]));
  }
  console.log("---");
}

console.log("\n=== Invalid fixtures (expected failures) ===\n");
for (const file of invalidFixtures) {
  const note = loadFixture(file);
  const result = validate(note);
  console.log(`${file}: valid=${result.valid}`);
  for (const error of result.errors) {
    console.log(`  ${error.path} — ${error.message} (keyword: ${error.keyword})`);
  }
  console.log("---");
}
