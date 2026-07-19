/**
 * Idempotent index setup (specs 03 + 05): the Atlas Vector Search index over
 * persona embeddings plus the standard indexes. Run after seed:load.
 */
import 'dotenv/config'
import { closeDb, getDb } from '../apps/sidebar-service/src/db/client'
import { EMBEDDING_DIMS } from '../apps/sidebar-service/src/casting/embed'
import { VECTOR_INDEX } from '../apps/sidebar-service/src/casting/retrieve'

async function main() {
  const db = await getDb()

  // Atlas can't create a search index on a collection that doesn't exist yet.
  await db.createCollection('personas').catch(() => {})

  // Vector search index (cosine, 1024 dims) — spec 03.
  const personas = db.collection('personas')
  const existing = await personas.listSearchIndexes().toArray().catch(() => [])
  if (!existing.some((i) => i.name === VECTOR_INDEX)) {
    await personas.createSearchIndex({
      name: VECTOR_INDEX,
      type: 'vectorSearch',
      definition: {
        fields: [
          {
            type: 'vector',
            path: 'embedding',
            numDimensions: EMBEDDING_DIMS,
            similarity: 'cosine',
          },
        ],
      },
    })
    console.log(`created vector search index '${VECTOR_INDEX}' (may take ~1 min to build)`)
  } else {
    console.log(`vector search index '${VECTOR_INDEX}' already exists`)
  }

  // Standard indexes — spec 03.
  await db.collection('events').createIndex({ sessionId: 1, seq: 1 }, { unique: true })
  await db.collection('castings').createIndex({ sessionId: 1, seat: 1 }, { unique: true })
  await db.collection('statements').createIndex({ sessionId: 1 })
  await db.collection('sessions').createIndex({ createdAt: -1 })
  await db.collection('sessions').createIndex({ dilemma: 'text' }) // search bar (spec 03)
  console.log('standard indexes ensured')
  await closeDb()
}

main()
