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
The baseline setup commits change documentation only. No application source, dependency, build, deployment, sync or printer files are changed.

## Repository and release facts
- Production `main` is v2.0.0 and deploys from `main`.
- The v2.1.0 work branch is explicitly documented as Beta-only; Stable / `main` was deliberately left untouched.
- The mobile repository is a separate codebase. Its latest inspected snapshot is commit `e7179bc82726268b7d0571f4952af74e2f1e54ee`; it is not merged into this working branch.
- The active working branch currently differs from its v2.1.0 base only by this baseline document.

## Confirmed gaps in the active v2.1.0 base
1. **Printer transport is browser BLE, not a complete cross-platform printer stack.** `src/data/adapters/btPrinter.ts` uses `navigator.bluetooth`, GATT services and characteristics. `src/store/rules/escpos.ts` hard-codes 32 columns, and `src/ui/slip/TokenSlip.tsx` falls back to `window.print()`. The inspected implementation has no Android USB transport or Bluetooth Classic SPP/RFCOMM adapter. Source: [BLE adapter](https://github.com/steph1420/stall-tokens/blob/3652c2a4676666aa427009ae3002d6480bcbe55e/src/data/adapters/btPrinter.ts), [ESC/POS renderer](https://github.com/steph1420/stall-tokens/blob/3652c2a4676666aa427009ae3002d6480bcbe55e/src/store/rules/escpos.ts), [token slip](https://github.com/steph1420/stall-tokens/blob/3652c2a4676666aa427009ae3002d6480bcbe55e/src/ui/slip/TokenSlip.tsx).
2. **iPad direct Bluetooth printing cannot be delivered by this browser-only path.** Web Bluetooth is a BLE GATT API, and current Safari/iOS support tables still mark it unsupported. The existing fallback is browser printing, not direct Bluetooth ESC/POS. Sources: [MDN Web Bluetooth](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API), [Can I Use compatibility](https://caniuse.com/web-bluetooth).
3. **Printer controls are not yet in the active v2.1.0 Settings screen.** The inspected Settings screen imports General, Display, Menu, Kitchen, Money, Sync, Data, Account and About groups, but not the separate mobile repository's PrinterSettings component.
4. **General settings still expose Token range.** The active branch's `GeneralSettings.tsx` still cycles token ranges; the mobile repository removed that control and added event name.
5. **Receipt formatting is still a fixed token-slip implementation.** The active renderer is not a receipt-template studio and uses a fixed 32-column ESC/POS layout. No template-block editor or image/logo rendering path was found in the inspected slip modules.
6. **Variants, add-ons and secondary units are not yet present in the active base's order model/path.** Item-level percentage discounts have since been implemented on the active working branch; see the completion record below.

## Defects / incomplete behavior to fix before importing mobile-repository work
The following findings apply to the separate mobile repository snapshot at commit `e7179bc82726268b7d0571f4952af74e2f1e54ee`; they must not be described as defects already present in the v2.1.0 base unless reproduced there.

1. **Ordinary item discount bypass.** `MenuScreen.tsx` opens the customization sheet only when variants or add-ons exist; otherwise it calls `addItem()`. `counter.ts` routes that to `addItemCustom(itemId, it.name, it.price)`, passing the undiscounted base price. The discount calculation lives in `CustomizeItemSheet.tsx`, so a discount-only item can bypass it. Sources: [MenuScreen](https://github.com/steph1420/stall-tokens-mobile/blob/e7179bc82726268b7d0571f4952af74e2f1e54ee/src/ui/counter/menu/MenuScreen.tsx), [counter actions](https://github.com/steph1420/stall-tokens-mobile/blob/e7179bc82726268b7d0571f4952af74e2f1e54ee/src/store/counter.ts), [customization sheet](https://github.com/steph1420/stall-tokens-mobile/blob/e7179bc82726268b7d0571f4952af74e2f1e54ee/src/ui/counter/CustomizeItemSheet.tsx).
2. **Secondary unit multiplier has no verified transaction effect.** The editor exposes the field, but the inspected add-to-cart and price-calculation paths do not apply a conversion. Treat as UI/data-only until quantity, unit display, billing and stock behavior are traced and tested. Source: [ItemEditorSections](https://github.com/steph1420/stall-tokens-mobile/blob/e7179bc82726268b7d0571f4952af74e2f1e54ee/src/ui/counter/ItemEditorSections.tsx).
3. **Printer connection status can become stale after reload.** The mobile printer module stores a printer name in localStorage but keeps the Bluetooth device and writable characteristic in module memory. The Settings UI displays “Paired and ready” based on the saved name; the live connection is not restored from that name. Sources: [Bluetooth adapter](https://github.com/steph1420/stall-tokens-mobile/blob/e7179bc82726268b7d0571f4952af74e2f1e54ee/src/data/adapters/btPrinter.ts), [PrinterSettings](https://github.com/steph1420/stall-tokens-mobile/blob/e7179bc82726268b7d0571f4952af74e2f1e54ee/src/ui/stall/settings/PrinterSettings.tsx).
4. **Paper-width preference is not wired through to ESC/POS rendering.** The mobile Settings UI toggles `printerPaper`, but the inspected renderer remains fixed at 32 columns and the print path does not pass the selected width. Thus the 80 mm option is not verified as functional. Sources: [PrinterSettings](https://github.com/steph1420/stall-tokens-mobile/blob/e7179bc82726268b7d0571f4952af74e2f1e54ee/src/ui/stall/settings/PrinterSettings.tsx), [ESC/POS renderer](https://github.com/steph1420/stall-tokens-mobile/blob/e7179bc82726268b7d0571f4952af74e2f1e54ee/src/store/rules/escpos.ts).
5. **Hardware claims remain unverified.** Neither the repository's historical notes nor these source inspections establish a successful physical print on the user's Cysno 58 mm printer, USB printing, or direct printing from iPad.

## Completed implementation after baseline

### P1-01 — Item-level percentage discounts
- Added an additive `discountPct` item field with legacy default 0 and 0–100 validation.
- Added an Item discount (%) input to the Add/Edit Item sheet.
- Menu cards show the discounted price and strike through the original price.
- Ordinary menu taps now store the discounted unit price on the order line. Existing order lines retain their original captured price after menu edits.
- Added pure price-calculation tests, counter/order-flow tests, and a UI interaction test that enters the discount in the item form and verifies the resulting order-line price.
- Implementation commits: `c29d90d3492177660ecc3f260a081892118c3b09`, `1d8c5592033a45ade3dc43abeb7a5bae7ed27362`, `37ba99ce63fe0fa55f53a62fd10927b65cb3d3fe`, `bb29c630dbdde7d30144f3c0573bfa2a96fd5182`, `bf05c55175eeeed1ce9702ca018f433c1c78b857`.
- GitHub Actions run #100 [44869565766](https://github.com/steph1420/stall-tokens/actions/runs/44869565766) passed all 16 CI steps: 52 test files, 263 tests, TypeScript, ESLint, Stylelint, dependency/contrast checks and production build.
- This is automated verification. The discount input and order flow have a UI-level test; it is not a claim of physical-device acceptance.

## Verification state
- GitHub branch comparison confirmed `backup/main-2026-11-21` is identical to production `main` at `e383374bd22516ca676fea775b1252858d6e3648`.
- GitHub branch comparison confirmed `work/pos-hardening-2026-11-21` was identical to `feat/v2.1.0` at `3652c2a4676666aa427009ae3002d6480bcbe55e`.
- The active `feat/pos-hardening-2026-11-21` branch currently contains documentation changes only relative to `feat/v2.1.0`.
- A direct local checkout was attempted, but this execution environment could not resolve `github.com`; local `npm ci` and `npm run check` have not been run.
- The CI workflow defines a full gate: pinned dependencies, leak scan, build-output check, feature-ID check, install, token drift, TypeScript, ESLint, Stylelint, dependency rules, contrast, tests and production build.
- GitHub Actions run #95 for baseline commit `36b2e99bcf6a4950f3ac3bc5508a2709a6b4e684` completed successfully: [run 44868414884](https://github.com/steph1420/stall-tokens/actions/runs/44868414884).
- All 16 CI steps passed: pin/lockfile, leak scan, build-output check, feature-ID check, install, token drift, TypeScript, ESLint, Stylelint, dependency rules, contrast, tests and production build.
- Vitest result: 50 test files passed, 259 tests passed. Production build transformed 597 modules and completed successfully. Vite emitted a non-fatal chunk-size warning for the 659.57 kB main JS chunk (210.78 kB gzip); this is a performance follow-up, not a failed build.
- This verifies the v2.1.0 baseline source in GitHub Actions. It does not verify physical hardware or actual Android/iPad runtime behavior.

## Acceptance
- P0-07 source-level defect/gap inventory: recorded above.
- P0-06 is complete: full GitHub Actions CI/build/test gate passed for the baseline commit.
- A successful build/test gate is not hardware verification and does not establish Android, iPad or physical-printer operation.
