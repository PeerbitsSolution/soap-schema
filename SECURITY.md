# Security Policy

## Reporting a vulnerability

If you believe you've found a security vulnerability in soap-schema,
please **do not open a public issue**. Instead:

- Email: security@peerbits.com  <!-- TODO: confirm actual reporting address -->
- Or use GitHub's private vulnerability reporting: **Security -> Report a
  vulnerability** on this repo.

Please include:
- A description of the vulnerability and its potential impact
- Steps to reproduce (proof-of-concept code if applicable)
- Any suggested remediation, if you have one

You should expect an acknowledgment within **3 business days**. We'll keep
you updated as we investigate and fix, and will credit you in the release
notes unless you'd prefer to stay anonymous.

## Supported versions

| Version | Supported |
|---|---|
| latest `1.x` (once released) | ✅ |
| `0.x` (pre-release) | ✅ (best effort) |

## What this repo does and does not contain

This is an open-source reference implementation maintained by Peerbits. It
is intended to be:

- **Spec-compliant** — the canonical schema conforms to JSON Schema draft
  2020-12; the FHIR mapping guidance in `docs/FHIR_MAPPING_GUIDE.md` is
  grounded in the FHIR R4 Composition resource and US Core Clinical Notes
  guidance (see that document's references section for the specific pages
  cited).
- **Free of PHI** — no real patient data appears anywhere in this repo,
  including tests and fixtures. All example clinical data under
  `fixtures/` is synthetic and invented.
- **Free of production credentials** — this repo has no network, auth, or
  credential-handling surface at all; there is nothing to configure with
  secrets.

Unlike other repos in the Peerbits HealthTech Open Source initiative, this
one has **no network calls, no OAuth flow, and no sandbox dependency** — it
is a schema definition and a pure validation/rendering library. There is no
token or credential storage concern here to document.

## Scanning & dependency policy

- Dependabot is enabled on this repository for both npm and GitHub Actions
  dependencies (weekly).
- CodeQL static analysis runs on every push to `main` and every PR.
- Dependencies with a known critical/high CVE are patched or removed before
  the next tagged release; see `CHANGELOG.md` for disclosure of any that
  affected a released version.
