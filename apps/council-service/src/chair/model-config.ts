// Model tier constants (spec 04 §Model tiers).
// Defaults to the 2.5 fallback per spec 04 — re-verify 3.x availability on the
// team's AI Studio tier and pin exact IDs here at the real hour-0 sync.
export const MEMBER_MODEL = 'gemini-2.5-flash';
export const VERDICT_MODEL = 'gemini-2.5-pro';

// Per-call timeout budgets (spec 04 §Orchestration). Closings are tiny/fast
// hence the shorter budget. Injectable in DeliberationDeps for tests that need
// to trigger the timeout path quickly.
export const STATEMENT_TIMEOUT_MS = 45_000;
export const REBUTTAL_TIMEOUT_MS = 45_000;
export const CLOSING_TIMEOUT_MS = 15_000;
