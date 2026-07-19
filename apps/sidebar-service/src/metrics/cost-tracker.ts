import { MEMBER_MODEL, VERDICT_MODEL } from "../chair/model-config.js";

/**
 * Rough, illustrative per-1K-token USD pricing (spec 09: "well under $0.10/session" on a
 * paid key; the $0.50 cap is deep margin kept as a kill-switch). Not tied to any specific
 * published price list — good enough to trip the kill-switch on a genuinely runaway session.
 */
const FLASH_PRICE = 0.0002;
const PRO_PRICE = 0.002;

const PRICE_PER_1K_TOKENS_USD: Record<string, number> = {
  [MEMBER_MODEL]: FLASH_PRICE,
  [VERDICT_MODEL]: PRO_PRICE,
};

export function estimateCostUsd(model: string, totalTokens: number): number {
  const price = PRICE_PER_1K_TOKENS_USD[model] ?? FLASH_PRICE;
  return (totalTokens / 1000) * price;
}

/** Per-session running cost total — the kill-switch input (spec 09 §Cost cap, task 10). */
export class CostTracker {
  private totalUsd = 0;

  add(usd: number): void {
    this.totalUsd += usd;
  }

  get total(): number {
    return this.totalUsd;
  }

  exceedsCap(capUsd: number): boolean {
    return this.totalUsd > capUsd;
  }
}
