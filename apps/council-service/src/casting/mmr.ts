/**
 * MMR casting (spec 05 §mmr.ts): greedy maximal-marginal-relevance selection.
 * Pure and deterministic — testable with synthetic embeddings, no model calls.
 *
 *   score(p) = λ·sim(dilemma, p) − (1−λ)·max_{s∈selected} sim(p, s)
 *
 * First pick is pure relevance (spec). Ties resolve to the earliest pool
 * candidate, which keeps selection deterministic for identical pools.
 * λ tuning protocol: log old→new + observed KPI effect in spec 05.
 */
export const LAMBDA = 0.6

/** Candidates this similar to an already-seated member are clones: they add
 *  zero diversity, so they are never picked regardless of relevance. */
const CLONE_SIMILARITY = 0.999

const dot = (a: number[], b: number[]) =>
  a.reduce((sum, x, i) => sum + x * (b[i] ?? 0), 0)

export function cosineSim(a: number[], b: number[]): number {
  const denom = Math.hypot(...a) * Math.hypot(...b)
  return denom === 0 ? 0 : dot(a, b) / denom
}

export type Scored<T> = { candidate: T; score: number }

export function selectByMmrScored<T extends { embedding: number[] }>(
  query: number[],
  pool: T[],
  n: number,
  lambda: number = LAMBDA,
): Scored<T>[] {
  if (pool.length < n) {
    throw new Error(`MMR pool too small: need ${n}, have ${pool.length}`)
  }
  const selected: Scored<T>[] = []
  const remaining = [...pool]

  while (selected.length < n) {
    let bestIdx = -1
    let bestScore = -Infinity
    for (let i = 0; i < remaining.length; i++) {
      const cand = remaining[i]!
      const rel = cosineSim(query, cand.embedding)
      if (selected.length === 0) {
        if (rel > bestScore) {
          bestScore = rel
          bestIdx = i
        }
        continue
      }
      const maxSim = Math.max(
        ...selected.map((s) => cosineSim(cand.embedding, s.candidate.embedding)),
      )
      if (maxSim >= CLONE_SIMILARITY) continue // clone guard
      const score = lambda * rel - (1 - lambda) * maxSim
      if (score > bestScore) {
        bestScore = score
        bestIdx = i
      }
    }
    if (bestIdx === -1) {
      throw new Error('MMR pool exhausted: every remaining candidate is a clone of the selected set')
    }
    selected.push({ candidate: remaining.splice(bestIdx, 1)[0]!, score: bestScore })
  }
  return selected
}

export function selectByMmr<T extends { embedding: number[] }>(
  query: number[],
  pool: T[],
  n: number,
  lambda: number = LAMBDA,
): T[] {
  return selectByMmrScored(query, pool, n, lambda).map((s) => s.candidate)
}
