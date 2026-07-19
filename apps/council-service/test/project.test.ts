import { describe, expect, test } from 'vitest'
import { projectTo2d } from '../src/casting/project'

// Pool with variation deliberately concentrated on the first two axes of a
// 5-dim space, plus noise dims that PCA should ignore (spec 05 §project.ts).
const pool: number[][] = []
for (let i = 0; i < 12; i++) {
  const a = Math.cos((i / 12) * Math.PI * 2)
  const b = Math.sin((i / 12) * Math.PI * 2)
  pool.push([2 * a, 1.5 * b, 0.01 * (i % 3), 0.01 * ((i + 1) % 2), 0])
}

describe('projectTo2d (spec 05 — per-session PCA over the retrieval pool)', () => {
  test('deterministic: same pool + cast ⇒ identical coordinates', () => {
    const cast = [pool[0]!, pool[3]!, pool[6]!]
    const first = projectTo2d(pool, cast)
    const second = projectTo2d(pool, cast)
    expect(second).toEqual(first)
  })

  test('all coordinates are normalized into [-1, 1]²', () => {
    const cast = [pool[0]!, pool[2]!, pool[5]!, pool[9]!]
    for (const p of projectTo2d(pool, cast)) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(1)
      expect(Math.abs(p.y)).toBeLessThanOrEqual(1)
    }
  })

  test('identical cast embeddings land on the same point', () => {
    const cast = [pool[4]!, pool[4]!]
    const [p1, p2] = projectTo2d(pool, cast)
    expect(p1!.x).toBeCloseTo(p2!.x, 10)
    expect(p1!.y).toBeCloseTo(p2!.y, 10)
  })

  test('opposite vectors in the pool separate; PCA ignores the noise dims', () => {
    // pool[0] ≈ (2, 0, …) and pool[6] ≈ (−2, 0, …): opposite along PC1
    const cast = [pool[0]!, pool[6]!, pool[0]!]
    const [a, b, aAgain] = projectTo2d(pool, cast)
    const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y)
    expect(dist).toBeGreaterThan(1) // far apart in the projection
    expect(Math.hypot(a!.x - aAgain!.x, a!.y - aAgain!.y)).toBeCloseTo(0, 10)
  })
})
