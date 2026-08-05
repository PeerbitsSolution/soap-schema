# Examples

Runnable, self-contained scripts demonstrating `@peerbits/soap-schema`.
These import from `../../src` directly (repo-relative), so they run against
the working tree without a build step — a consumer of the published package
would `import { validate, renderNote } from "@peerbits/soap-schema"` instead.

| File | Demonstrates |
|---|---|
| [`validate-and-render.ts`](./validate-and-render.ts) | `validate()` against every fixture (valid and invalid), then `renderNote()` on the valid ones |
| [`build-and-assert.ts`](./build-and-assert.ts) | Constructing a `SoapNote` object by hand, `assertValid()`'s throw-on-invalid behavior, and catching `SoapNoteValidationError` |

## Running

From the repo root, with dependencies installed (`npm install`):

```bash
npx tsx docs/examples/validate-and-render.ts
npx tsx docs/examples/build-and-assert.ts
```

For the full narrative walkthrough (installation, quick start, error
handling, FHIR mapping), see [docs/USER_GUIDE.md](../USER_GUIDE.md).
