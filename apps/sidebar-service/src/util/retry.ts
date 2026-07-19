function isRateLimitError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /429|rate limit|resource_exhausted/i.test(message);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Backs off on 429s (spec 09 §Rate-limit resilience) — the UI just sees a slower phase,
 * never an error, as long as the phase's own timeout budget allows it.
 */
export async function withRateLimitBackoff<T>(
  fn: () => Promise<T>,
  { retries = 2, baseDelayMs = 1000 }: { retries?: number; baseDelayMs?: number } = {},
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRateLimitError(err) || attempt === retries) throw err;
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }
  throw lastErr;
}
