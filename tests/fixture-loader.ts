import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

export function loadFixture(relativePath: string): unknown {
  return JSON.parse(readFileSync(join(repoRoot, "fixtures", relativePath), "utf-8"));
}

export const VALID_FIXTURES = [
  "valid/primary-care-followup.json",
  "valid/urgent-care-visit.json",
  "valid/telehealth-checkin.json",
] as const;

export const INVALID_FIXTURES = [
  {
    file: "invalid/missing-chief-complaint.json",
    expectedPath: "/subjective",
    expectedKeyword: "required",
  },
  {
    file: "invalid/wrong-type-vitals.json",
    expectedPath: "/objective/vitals/heartRate/value",
    expectedKeyword: "type",
  },
] as const;
