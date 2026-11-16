// The one config module (06 rule 3): every timing, limit, key and range lives here, never inline.
export const CONFIG = Object.freeze({
  app: { codename: 'stall-tokens', name: 'Stall Tokens', version: '2.0.0-dev.1' },
  ports: { dev: 5173, preview: 4173 },
  // Shared github.io origin: every storage key and DB name starts with this prefix (ARCHITECTURE §9).
  storage: { prefix: 'stall-tokens.v2', dbVersion: 1 },
  themes: { night: 'stall-night', day: 'stall-day' },
  // D-TOKEN: each Counter device picks one range; tokens restart per day.
  tokens: { ranges: [{ from: 1, to: 500 }, { from: 501, to: 1000 }], pad: 3 },
  limits: {
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
  stock: { lowAtDefault: 5, supplyCategory: 'Supplies' },
  sync: { pollMinMs: 4000, pollMaxMs: 60000, backoff: 2, pushBatch: 200, timeoutMs: 15000 },
  timings: { toastMs: 2600, fakeDelayMs: 120, clockTickMs: 30000 },
  // Open Orders header: dots up to this many orders, then "3 of 12" (Q-ORDERS-1).
  openDotsMax: 8,
  // swipePx: horizontal travel that turns a drag on the Station page into next / previous order (Q-STN-LOOK D).
  gesture: { moveCancelPx: 10, swipePx: 56 },
} as const);

export type Side = keyof typeof CONFIG.themes;
