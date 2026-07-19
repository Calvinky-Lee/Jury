/**
 * Load the embedded persona library into Atlas (spec 03 `personas` collection).
 * Wipes and reloads — the library is seed data, not user data.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import 'dotenv/config'
import { closeDb, getDb } from '../apps/council-service/src/db/client'

const IN = join(dirname(fileURLToPath(import.meta.url)), 'personas-embedded.json')

async function main() {
  const personas = JSON.parse(readFileSync(IN, 'utf8')) as {
    id: string
    name: string
    archetype: string
    avatar: { hue: string; form: string }
    voice: string
    domains: string[]
    stanceProfile: object
    stanceProfileText: string
    embedding: number[]
  }[]

  const db = await getDb()
  const col = db.collection('personas')
  await col.deleteMany({})
  await col.insertMany(
    personas.map((p) => ({
      _id: p.id as never, // uuid string ids, matching the contract
      name: p.name,
      archetype: p.archetype,
      avatar: p.avatar,
      profile: { voice: p.voice, domains: p.domains },
      stanceProfile: p.stanceProfile,
      stanceProfileText: p.stanceProfileText,
      embedding: p.embedding,
    })),
  )
  console.log(`loaded ${personas.length} personas into 'personas'`)
  await closeDb()
}

main()
