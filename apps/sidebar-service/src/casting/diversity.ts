import baselines from './baselines.json'
import { cosineSim } from './mmr'

/**
 * Sidebar diversity (spec 05 §diversity.ts): mean pairwise cosine distance of
 * the cast, normalized against a per-size random-cast baseline — mean pairwise
 * distance is not comparable across sidebar sizes, so each n ∈ 3–6 has its own
 * baseline, precomputed over the seeded library (seed/compute-baselines.ts and
 * checked in as baselines.json with its seed batch id). Target ratio ≥ 1.3×.
 */
export const DIVERSITY_BASELINES: Record<number, number> = {
  3: baselines['3'],
  4: baselines['4'],
  5: baselines['5'],
  6: baselines['6'],
}

export function diversityScore(embeddings: number[][]): number {
  if (embeddings.length < 2) return 0
  let sum = 0
  let pairs = 0
  for (let i = 0; i < embeddings.length; i++) {
    for (let j = i + 1; j < embeddings.length; j++) {
      sum += 1 - cosineSim(embeddings[i]!, embeddings[j]!)
      pairs++
    }
  }
  return sum / pairs
}

export function baselineRatio(
  score: number,
  n: number,
  baselinesBySize: Record<number, number> = DIVERSITY_BASELINES,
): number {
  const baseline = baselinesBySize[n]
  if (baseline === undefined || baseline <= 0) {
    throw new Error(`No diversity baseline precomputed for sidebar size ${n}`)
  }
  return score / baseline
}
