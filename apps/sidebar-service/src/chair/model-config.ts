// Model tier constants (spec 04 §Model tiers).
// Verified against a live AI Studio key on 2026-07-19 via real generateContent
// calls (not just the ListModels listing, which lists models a key can't
// actually call): gemini-2.5-flash/gemini-2.5-pro/gemini-2.0-flash/
// gemini-3-pro-preview all 404 with "no longer available to new users" —
// Google has cut new API keys off from those. Re-verify if this 404s again;
// AI Studio's model availability shifts per-key over time.
//
// Of the models that DO respond, JSON-mode reliability varied a lot in a small
// live sample (responseMimeType: 'application/json' does not guarantee a
// clean single object — see model-client.ts's extractFirstJsonObject for the
// failure modes actually observed): gemini-3.5-flash ~25% valid,
// gemini-3-flash-preview 100% valid, gemini-3.1-pro-preview ~60-70% valid
// (client-side retry covers the rest). Picked on reliability, not recency.
export const MEMBER_MODEL = 'gemini-3-flash-preview';
export const VERDICT_MODEL = 'gemini-3.1-pro-preview';

// Per-call timeout budgets (spec 04 §Orchestration). Closings are tiny/fast
// hence the shorter budget. Injectable in DeliberationDeps for tests that need
// to trigger the timeout path quickly.
export const STATEMENT_TIMEOUT_MS = 45_000;
export const REBUTTAL_TIMEOUT_MS = 45_000;
export const CLOSING_TIMEOUT_MS = 15_000;
