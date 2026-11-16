# Changelog
All notable changes to Stall Tokens. SemVer. Times IST.

## [Unreleased] — 2.0.0 (branch `feat/v2.0.0`)
### Added
- v2 rebuilt from `steph1420/app-starter` v0.1.0 (`0746f7b`; checks from agent-common `88c9672`): React 19, Vite 6, TypeScript strict, Driftline tokens + CSS Modules, Zustand, op-log sync with a pluggable transport.
- Docs first: `docs/ARCHITECTURE.md`, `FEATURES.md`, `docs/adr/ADR-0003-stall-accent.md`.
### Changed
- v1 single-file app moved to `legacy/v1/index.html` (kept byte for byte; rollback tag `v1.0.0`, branch `backup/pre-v2.0.0`).
### Audit (16 Nov, vs agent-common 06 v2)
- Re-copied the build-output check (agent-common `ab6431f`); added the feature-ID check to `npm run check` (CI workflow change waits on a `workflow`-scoped login).
- Logged the two silent catch/retry spots; moved a slider threshold to config and an inline style to CSS Modules (no visual change).
- FEATURES.md test column made honest; F-42 row added; README fixed.
### Dropped
- v1 data import and the `/beta/` path (Steve 16 Nov 15:48 IST: v1 never used).

## [1.0.0] — d9daa49
- Initial single-file release (tagged later as the rollback point).
