import { describe, expect, test } from 'vitest'
import { LAMBDA, selectByMmr } from '../src/casting/mmr'

// Synthetic embeddings — no model calls (spec 05 §mmr.ts).
// Cosine geometry in 3D is enough to pin the behaviors.
const unit = (v: number[]) => {
  const n = Math.hypot(...v)
  return v.map((x) => x / n)
}

type Cand = { id: string; embedding: number[] }
const cand = (id: string, v: number[]): Cand => ({ id, embedding: unit(v) })

const query = unit([1, 0, 0])

describe('selectByMmr (spec 05)', () => {
  test('lambda is the spec constant 0.6', () => {
    expect(LAMBDA).toBe(0.6)
  })

  test('identical pool ⇒ deterministic output', () => {
    const pool = [
      cand('a', [1, 0.1, 0]),
      cand('b', [0.9, 0.4, 0]),
      cand('c', [0.5, 0.8, 0.2]),
      cand('d', [0.1, 0.2, 1]),
      cand('e', [0.6, 0.6, 0.5]),
    ]
    const first = selectByMmr(query, pool, 3).map((c) => c.id)
    const second = selectByMmr(query, pool, 3).map((c) => c.id)
    expect(second).toEqual(first)
  })

  test('a clone of a selected persona is never picked', () => {
    const pool = [
      cand('top', [1, 0.05, 0]),
      cand('top-clone', [1, 0.05, 0]), // identical embedding to 'top'
      cand('other1', [0.4, 0.9, 0]),
      cand('other2', [0.3, 0, 0.95]),
      cand('other3', [0.5, 0.5, 0.7]),
    ]
    const picked = selectByMmr(query, pool, 4).map((c) => c.id)
    expect(picked).toContain('top')
    expect(picked).not.toContain('top-clone')
  })

  test('lambda = 1 degenerates to pure top-N relevance', () => {
    const pool = [
      cand('r1', [1, 0.01, 0]),
      cand('r2', [1, 0.1, 0]),
      cand('r3', [0.8, 0.6, 0]),
      cand('far', [0, 0, 1]),
    ]
    const picked = selectByMmr(query, pool, 3, 1).map((c) => c.id)
    expect(picked).toEqual(['r1', 'r2', 'r3'])
  })

  test('lambda = 0 degenerates to farthest-point (first pick still pure relevance)', () => {
    const pool = [
      cand('nearest', [1, 0.01, 0]),
      cand('near-nearest', [1, 0.05, 0]),
      cand('orthogonal', [0, 1, 0]),
      cand('opposite-ish', [0, 0, 1]),
    ]
    const picked = selectByMmr(query, pool, 3, 0).map((c) => c.id)
    expect(picked[0]).toBe('nearest')
    // subsequent picks flee the selected set instead of hugging the query
    expect(picked).toContain('orthogonal')
    expect(picked).toContain('opposite-ish')
    expect(picked).not.toContain('near-nearest')
  })

  test('selects exactly n with no duplicates, and throws when the pool is too small', () => {
    const pool = [cand('a', [1, 0, 0]), cand('b', [0, 1, 0])]
    expect(selectByMmr(query, pool, 2)).toHaveLength(2)
    expect(() => selectByMmr(query, pool, 3)).toThrow()
  })
})
