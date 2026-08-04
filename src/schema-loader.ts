import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The published schema files live at package-root `/schema`, one level up
 * from both `src/` (dev) and `dist/` (built) — loading by relative file
 * path (rather than a JSON import) keeps this working identically under
 * ts-node/vitest, the compiled dist output, and any consumer that just
 * wants the raw JSON Schema files directly.
 */
const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

export function loadSchema(relativePath: string): object {
  const fullPath = join(packageRoot, "schema", relativePath);
  return JSON.parse(readFileSync(fullPath, "utf-8")) as object;
}
