import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { generateTypes } from "../scripts/generate-types.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("generated types", () => {
  it("src/types.ts matches what generate:types would produce from the current schema", async () => {
    const generated = await generateTypes();
    const committed = readFileSync(join(repoRoot, "src", "types.ts"), "utf-8");
    expect(committed).toBe(generated);
  });
});
