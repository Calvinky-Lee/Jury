import { getDb } from '../db/client.js'

export type PersonaWithEmbedding = {
  id: string
  name: string
  archetype: string
  avatar: { hue: string; form: string }
  voice: string
  domains: string[]
  stanceProfile: { coreValues: string[]; biases: string[]; decisionStyle: string }
  embedding: number[]
}

export const VECTOR_INDEX = 'personas_vector'
export const POOL_SIZE = 25
export const NUM_CANDIDATES = 100

/**
 * Relevance retrieval (spec 05 §retrieve.ts): Atlas `$vectorSearch` top-25 by
 * cosine similarity. The caller embeds the PARSED dilemma (summary + axes of
 * tension), not raw user text — the axes are what members must be relevant to.
 */
export async function retrievePool(
  queryVector: number[],
  k: number = POOL_SIZE,
): Promise<PersonaWithEmbedding[]> {
  const db = await getDb()
  const docs = await db
    .collection('personas')
    .aggregate([
      {
        $vectorSearch: {
          index: VECTOR_INDEX,
          queryVector,
          path: 'embedding',
          numCandidates: NUM_CANDIDATES,
          limit: k,
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          archetype: 1,
          avatar: 1,
          profile: 1,
          stanceProfile: 1,
          embedding: 1,
        },
      },
    ])
    .toArray()

  return docs.map((d) => {
    const voice = d.profile?.voice
    const domains = d.profile?.domains
    // voice/domains are required, non-empty fields on PersonaIdentitySchema
    // (packages/contract/src/persona.ts) — a doc missing them is malformed
    // seed data, not a case to silently paper over with empty defaults.
    if (!voice || !domains || domains.length === 0) {
      throw new Error(
        `persona ${d._id} is missing required profile fields (voice/domains) — seed data is malformed`,
      )
    }
    return {
      id: String(d._id),
      name: d.name,
      archetype: d.archetype,
      avatar: d.avatar,
      voice,
      domains,
      stanceProfile: d.stanceProfile,
      embedding: d.embedding,
    }
  })
}
