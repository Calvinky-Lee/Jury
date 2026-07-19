import { describe, expect, test } from 'vitest'
import type { PersonaWithEmbedding } from '../src/casting/retrieve'
import { castSidebar } from '../src/casting/cast-sidebar'

// Composition test with injected fakes — no network, no Atlas (spec 05 §API).

const unit = (v: number[]) => {
  const n = Math.hypot(...v)
  return v.map((x) => x / n)
}

const persona = (id: string, name: string, v: number[]): PersonaWithEmbedding => ({
  id,
  name,
  archetype: `The ${name}`,
  avatar: { hue: 'indigo', form: 'round' },
  voice: 'test voice',
  domains: ['test'],
  stanceProfile: { coreValues: ['v'], biases: ['b'], decisionStyle: name },
  embedding: unit(v),
})

const fakePool: PersonaWithEmbedding[] = [
  persona('p1', 'Nearest', [1, 0.05, 0]),
  persona('p2', 'Analyst', [0.8, 0.55, 0]),
  persona('p3', 'Skeptic', [0.2, 0.9, 0.3]),
  persona('p4', 'Dreamer', [0.1, 0.2, 1]),
  persona('p5', 'Traditionalist', [0.7, 0.1, 0.6]),
  persona('p6', 'Gambler', [0, 0.7, 0.7]),
]

const deps = {
  embedQuery: async (_text: string) => unit([1, 0, 0]),
  retrievePool: async (_vector: number[]) => fakePool,
  baselines: { 3: 0.4, 4: 0.4, 5: 0.4, 6: 0.4 },
}

describe('castSidebar (spec 05 §API)', () => {
  test('returns N members with seats 0..N-1, scores, diversity, and a vector map', async () => {
    const result = await castSidebar('Should we switch to annual billing?', 4, deps)

    expect(result.members).toHaveLength(4)
    expect(result.members.map((m) => m.seat)).toEqual([0, 1, 2, 3])
    for (const m of result.members) {
      expect(typeof m.mmrScore).toBe('number')
      expect(m.situationBrief).toBeUndefined() // the Chair writes briefs, not P2
    }
    expect(result.diversityScore).toBeGreaterThan(0)
    expect(result.baselineRatio).toBeCloseTo(result.diversityScore / 0.4, 10)
    expect(result.vectorMap).toHaveLength(4)
    expect(result.vectorMap.map((p) => p.seat)).toEqual([0, 1, 2, 3])
    expect(result.vectorMap.map((p) => p.personaId)).toEqual(
      result.members.map((m) => m.id),
    )
  })

  test('rejects sidebar sizes outside 3–6', async () => {
    await expect(castSidebar('q', 2, deps)).rejects.toThrow()
    await expect(castSidebar('q', 7, deps)).rejects.toThrow()
  })
})
