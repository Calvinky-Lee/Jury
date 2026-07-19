import { baselineRatio, diversityScore } from './diversity'
import { embedQuery as liveEmbedQuery } from './embed'
import { selectByMmrScored } from './mmr'
import { projectTo2d } from './project'
import { retrievePool as liveRetrievePool, type PersonaWithEmbedding } from './retrieve'

/**
 * The casting API P1 consumes (spec 05 §API).
 *
 *   castCouncil(parsedDilemma, size) →
 *     { members (seats 0..N-1, WITHOUT situationBrief — the Chair writes those),
 *       diversityScore, baselineRatio, vectorMap }
 *
 * Dependencies are injectable so composition is testable without Voyage/Atlas.
 */
export type CastCouncilDeps = {
  embedQuery?: (text: string) => Promise<number[]>
  retrievePool?: (vector: number[]) => Promise<PersonaWithEmbedding[]>
  baselines?: Record<number, number>
}

export type SeatedMember = PersonaWithEmbedding & {
  seat: number
  mmrScore: number
  situationBrief?: string
}

export type CastCouncilResult = {
  members: SeatedMember[]
  diversityScore: number
  baselineRatio: number
  vectorMap: { personaId: string; x: number; y: number; seat: number }[]
}

export async function castCouncil(
  parsedDilemma: string,
  size: number,
  deps: CastCouncilDeps = {},
): Promise<CastCouncilResult> {
  if (!Number.isInteger(size) || size < 3 || size > 6) {
    throw new Error(`Council size must be an integer in 3–6, got ${size}`)
  }
  const embedQuery = deps.embedQuery ?? liveEmbedQuery
  const retrievePool = deps.retrievePool ?? liveRetrievePool

  const queryVector = await embedQuery(parsedDilemma)
  const pool = await retrievePool(queryVector)

  const scored = selectByMmrScored(queryVector, pool, size)
  const members: SeatedMember[] = scored.map((s, seat) => ({
    ...s.candidate,
    seat,
    mmrScore: s.score,
  }))

  const castEmbeddings = members.map((m) => m.embedding)
  const score = diversityScore(castEmbeddings)
  const ratio = baselineRatio(score, size, deps.baselines)

  const coords = projectTo2d(
    pool.map((p) => p.embedding),
    castEmbeddings,
  )
  const vectorMap = coords.map((p, seat) => ({
    personaId: members[seat]!.id,
    x: p.x,
    y: p.y,
    seat,
  }))

  return { members, diversityScore: score, baselineRatio: ratio, vectorMap }
}
