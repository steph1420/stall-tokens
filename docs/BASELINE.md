# Baseline record — 21 November 2026

## Scope
- Production repository: `steph1420/stall-tokens`
- Production branch preserved: `main`
- Production backup: `backup/main-2026-11-21`
- Original working reference: `work/pos-hardening-2026-11-21`
- CI-enabled working branch: `feat/pos-hardening-2026-11-21`
- Baseline source branch: `feat/v2.1.0`
- Baseline source commit: `3652c2a4676666aa427009ae3002d6480bcbe55e`

## Change policy
This record is documentation only. No application source, dependency, build, deployment, sync or printer files are changed by the baseline-trigger commit.

## Verification state before baseline run
- GitHub branch comparison confirmed the production backup is identical to `main`.
- GitHub branch comparison confirmed the original working reference is identical to `feat/v2.1.0`.
- A direct local checkout was attempted but this execution environment could not resolve `github.com`; local `npm ci` and `npm run check` have therefore not been run here.
- The repository CI workflow defines a full gate: pinned dependencies, leak scan, build-output check, feature-ID check, install, token drift, TypeScript, ESLint, Stylelint, dependency rules, contrast, tests and production build.
- The branch status document records a 236-test pass on the v2.1.0 beta work, but that record is not treated as an independently verified result for this baseline commit.

## Acceptance
Update this record only after the CI run for the baseline-trigger commit is inspected. A successful build/test gate is not hardware verification and does not establish Android, iPad or physical-printer operation.
