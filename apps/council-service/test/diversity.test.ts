import { describe, expect, test } from 'vitest'
import { baselineRatio, diversityScore } from '../src/casting/diversity'

describe('diversityScore (spec 05 — mean pairwise cosine distance)', () => {
  test('mutually orthogonal unit vectors score exactly 1', () => {
    const cast = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]
    expect(diversityScore(cast)).toBeCloseTo(1, 10)
  })

  test('identical vectors score 0', () => {
    const cast = [
      [1, 0, 0],
      [1, 0, 0],
      [1, 0, 0],
    ]
    expect(diversityScore(cast)).toBeCloseTo(0, 10)
  })

  test('mixed cast lands strictly between the extremes', () => {
    const cast = [
      [1, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
    ]
    const score = diversityScore(cast)
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(1)
  })
})

describe('baselineRatio (spec 05 — per-size baselines, n ∈ 3–6)', () => {
  const baselines = { 3: 0.5, 4: 0.55, 5: 0.6, 6: 0.62 }

  test('divides by the baseline for the cast size', () => {
    expect(baselineRatio(0.65, 3, baselines)).toBeCloseTo(1.3, 10)
    expect(baselineRatio(0.55, 4, baselines)).toBeCloseTo(1.0, 10)
  })

  test('throws on a size with no precomputed baseline', () => {
    expect(() => baselineRatio(0.5, 7, baselines)).toThrow()
  })
})
