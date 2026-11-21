# Baseline record — 21 November 2026

## Scope
- Production repository: `steph1420/stall-tokens`
- Production branch preserved: `main`
- Production backup: `backup/main-2026-11-21`
- Original working reference: `work/pos-hardening-2026-11-21`
- Active working branch: `feat/pos-hardening-2026-11-21`
- Baseline source branch: `feat/v2.1.0`
- Baseline source commit: `3652c2a4676666aa427009ae3002d6480bcbe55e`

## Change policy
The baseline setup commit changes documentation only. No application source, dependency, build, deployment, sync or printer files are changed.

## Verification state
- GitHub branch comparison confirmed `backup/main-2026-11-21` is identical to production `main` at `e383374bd22516ca676fea775b1252858d6e3648`.
- GitHub branch comparison confirmed `work/pos-hardening-2026-11-21` was identical to `feat/v2.1.0` at `3652c2a4676666aa427009ae3002d6480bcbe55e`.
- The active `feat/pos-hardening-2026-11-21` branch differs from its v2.1.0 baseline by this documentation file only.
- A direct local checkout was attempted, but this execution environment could not resolve `github.com`; local `npm ci` and `npm run check` have not been run.
- The CI workflow defines a full gate: pinned dependencies, leak scan, build-output check, feature-ID check, install, token drift, TypeScript, ESLint, Stylelint, dependency rules, contrast, tests and production build.
- GitHub's available connector returned no workflow run or commit status for the baseline commit. A temporary draft PR (#3) against `feat/v2.1.0` was created to expose pull-request CI, then closed unmerged; no successful run was returned for inspection.
- The branch status document records a 236-test pass on the v2.1.0 Beta work. This is historical project documentation, not independent verification of this baseline commit.

## Acceptance
P0-06 remains pending until a full CI/build/test result for the baseline commit is inspected. A successful build/test gate is not hardware verification and does not establish Android, iPad or physical-printer operation.
