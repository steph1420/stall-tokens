// The one config module (06 rule 3): every timing, limit, key and range lives here, never inline.
/** Build-time env (absent when vite.config.ts itself loads this file). */
// Plain `import.meta.env` (not a cast) so Vite and Vitest both rewrite it; undefined when vite.config.ts loads this file.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- absent under the config loader
const ENV = (import.meta.env ?? {}) as Record<string, unknown>;
const envStr = (k: string): string => { const v = ENV[k]; return typeof v === 'string' ? v : ''; };

/** Q-CHANNEL A / Q-BETA-PATH B: Stable (root repo) or Beta (`steph1420/stall-tokens-beta`). */
export type Channel = 'stable' | 'beta';
export const CHANNELS = Object.freeze({
  stable: { label: 'Stable', name: 'Stall Tokens', shortName: 'Stall', prefix: 'stall-tokens.v2' },
  beta: { label: 'Beta', name: 'Stall Tokens Beta', shortName: 'Stall β', prefix: 'stall-tokens-beta.v2', basePath: '/stall-tokens-beta/' },
} as const);
/** Beta wins if either the build says so (`VITE_CHANNEL=beta`) or the page is served under the Beta path, so Beta can never open Stable's data. */
export const detectChannel = (envChannel: string, pathname: string | undefined): Channel =>
  envChannel === 'beta' || (pathname ?? '').startsWith(CHANNELS.beta.basePath) ? 'beta' : 'stable';
const channel: Channel = detectChannel(envStr('VITE_CHANNEL'), typeof location === 'undefined' ? undefined : location.pathname);
const isBeta = channel === 'beta';

export const CONFIG = Object.freeze({
  app: {
    codename: 'stall-tokens',
    name: 'Stall Tokens',
    version: envStr('VITE_APP_VERSION') || '2.1.0',
    gitSha: envStr('VITE_GIT_SHA') || 'dev',
    buildDate: envStr('VITE_BUILD_DATE') || 'dev',
    channel,
    channelLabel: CHANNELS[channel].label,
  },
  ports: { dev: 5173, preview: 4173 },
  // Shared github.io origin: every storage key and DB name starts with this prefix (ARCHITECTURE §9). Beta has its own (§4.7, F-49).
  storage: { prefix: CHANNELS[channel].prefix, dbVersion: 1 },
  themes: { night: 'stall-night', day: 'stall-day' },
  // D-TOKEN: each Counter device picks one range; tokens restart per day.
  tokens: { ranges: [{ from: 1, to: 500 }, { from: 501, to: 1000 }], pad: 3 },
  limits: {
    recordTextMax: 500, // F-48 info record text cell (business, events, sources)
    nameMaxChars: 60,
    noteMaxChars: 140,
    qtyMax: 99,
    linesMax: 80,
    itemsMax: 300,
    moneyMaxPaise: 99_99_99_999_00, // ₹9,99,99,999
    upiIdMaxChars: 60,
    payeesMax: 8,
  },
  money: { paisePerRupee: 100, sliderSnapPaise: 1000, roundOffSteps: [500, 1000] as const },
  payment: {
    denominations: [5, 10, 20, 50, 100, 200, 500] as const,
    moreDenominations: [1000, 2000] as const,
    tipChips: [1000, 2000] as const, // ₹10, ₹20 (D-TIP)
    upiNoteMaxChars: 40,
    // Slider: the moving ₹ label hides near either end so it never overlaps the ₹0 / total labels.
    sliderLabelEdge: 0.12,
  },
  stations: ['Tortillas', 'Momos', 'Desserts', 'Sandwiches', 'Cutlets', 'Beverages'] as const,
  swatchCount: 8, // item colours are swatch indexes into --dl-stall-swatch-N (tokens)
  // Q-SUPPLY-CONFIRM B: a pasted thing marked "Menu" lands in `newMenuCategory` at ₹0 until a price is set.
  stock: { lowAtDefault: 5, supplyCategory: 'Supplies', newMenuCategory: 'New' },
  // F-44 baked-in sync (Steve 19:33): a build can carry the bridge URL / key (VITE_SYNC_URL, VITE_SYNC_KEY); empty by default.
  // F-49: Beta never carries a baked sync link or key; it only talks to a bridge typed in on that phone.
  sync: { bakedUrl: isBeta ? '' : envStr('VITE_SYNC_URL'), bakedKey: isBeta ? '' : envStr('VITE_SYNC_KEY'), pollMinMs: 4000, pollMaxMs: 60000, backoff: 2, pushBatch: 200, timeoutMs: 15000 },
  // s127 take-over (Q-TAKE-LEASE B ★ 90 s, D-TAKE-1): a claim lapses when its phone is not heard from for leaseMs; a waiting
  // phone checks every checkMs; an app hidden for hiddenReleaseMs lets go of its order (Q-TAKE-WHEN A); leaving an order lets
  // go after switchGraceMs, so a quick tab flip writes nothing.
  handling: { leaseMs: 90_000, checkMs: 10_000, hiddenReleaseMs: 30_000, switchGraceMs: 5_000, actionToastMs: 8_000 },
  timings: { toastMs: 2600, fakeDelayMs: 120, clockTickMs: 30000, printDelayMs: 300, remindLaterMs: 3600000 },
  // Open Orders header: dots up to this many orders, then "3 of 12" (Q-ORDERS-1).
  openDotsMax: 8,
  // swipePx: horizontal travel that turns a drag on the Station page into next / previous order (Q-STN-LOOK D).
  gesture: { moveCancelPx: 10, swipePx: 56 },
} as const);

export type Side = keyof typeof CONFIG.themes;

/** Q-HARM-7 footer stamp: `vX.Y.Z · <short hash> · <build date IST>`. */
export const appStamp = (): string => `v${CONFIG.app.version} · ${CONFIG.app.gitSha} · ${CONFIG.app.buildDate}`;
