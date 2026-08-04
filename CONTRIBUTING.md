# Contributing to soap-schema

Thanks for considering a contribution. This repo is part of the Peerbits
HealthTech Open Source initiative — small, focused, spec-grounded tools, not
full products. Contributions that keep that scope are the easiest to accept.

## Before you start

- Check open issues first — especially ones tagged `good first issue` or
  `help wanted`.
- For anything non-trivial (new schema field, API change), open an issue to
  discuss the approach before writing code. Saves everyone a rewrite.
- This repo intentionally does **not** accept contributions that reintroduce
  product-specific logic, client-specific behavior, AI/NLP note-generation
  logic (that's out of scope — see README §1), or scope creep toward a full
  platform. If in doubt, ask in the issue first.
- The `coded-concept` subschema must stay coding-system-agnostic. PRs that
  hardcode ICD-10, SNOMED, or any other specific terminology into the schema
  will be asked to revert that part.

## Development setup

```bash
git clone git@github.com:PeerbitsSolution/soap-schema.git
cd soap-schema
npm install
npm test
```

## Making a change

1. Fork the repo and create a branch off `main`:
   `git checkout -b feature/short-description` or `fix/short-description`.
2. Write the code and the tests together — a PR that adds behavior without
   a test covering it will be asked to add one before merge.
3. If you change `schema/soap-note.schema.json`, regenerate types and keep
   the drift test green:
   ```bash
   npm run generate:types
   ```
4. Run the full check locally before opening a PR:
   ```bash
   npm run lint
   npm run typecheck
   npm test
   npm run build
   ```
5. Keep commits small and messages descriptive. Conventional Commits style
   is preferred (`fix:`, `feat:`, `docs:`, `chore:`) but not strictly enforced.
6. Open a PR against `main` using the PR template. Link the issue it
   addresses.

## Coding conventions

- TypeScript, strict mode. No `any` without a comment explaining why it's
  unavoidable.
- The JSON Schema files under `schema/` are the source of truth — `src/`
  code should follow the schema, not the other way around.
- Public API surface stays typed and exported from `src/index.ts`; internal
  modules (`schema-loader.ts`) are not part of the stability contract.
- No hardcoded credentials, tokens, or realistic-looking example secrets —
  see `SECURITY.md`.

## Fixtures

All example/fixture data must be obviously synthetic — invented, clearly
fictional patient encounters, never styled after a real case. See
`fixtures/README` conventions in the existing files under `fixtures/valid`
and `fixtures/invalid` before adding new ones.

## What we will not merge

- Anything containing real patient data, real credentials, or client-
  identifying content (see `SECURITY.md`).
- AI/NLP transcript-to-note generation logic — out of scope for this repo.
- A full FHIR resource generator — see the roadmap in README.md for where
  that belongs.
- ICD-10/CPT/SNOMED code validation or lookup logic against real code
  sets — the `coded-concept` subschema defines shape only.
- Breaking API or schema changes without a version bump discussion (see
  `CHANGELOG.md` and semver policy).

## Code of conduct

Be direct, be kind, assume good faith. Disagreements about approach are
fine and expected; personal attacks or dismissiveness aren't.

## Questions

Open an issue with the `question` label, or start a discussion if the repo
has GitHub Discussions enabled.
