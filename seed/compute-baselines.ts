/**
 * Diversity baseline precompute (spec 05): sample 1,000 random casts at EACH
 * council size n ∈ 3–6 over the loaded library; write DIVERSITY_BASELINE[n]
 * into apps/council-service/src/casting/baselines.json with the batch id.
 * The UI ratio = cast diversity / baseline — targets ≥ 1.3×.
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import 'dotenv/config'
import { diversityScore } from '../apps/council-service/src/casting/diversity'
import { closeDb, getDb } from '../apps/council-service/src/db/mongo'

const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  '../apps/council-service/src/casting/baselines.json',
)
const SAMPLES = 1000

async function main() {
  const docs = await getDb()
    .collection('personas')
    .find({}, { projection: { embedding: 1 } })
    .toArray()
  const embeddings = docs.map((d) => d.embedding as number[])
  if (embeddings.length < 10) {
    console.error(`only ${embeddings.length} personas loaded — run seed:load first`)
    process.exit(1)
  }

  const baselines: Record<string, number | string> = {
    batchId: `${embeddings.length}-personas-${new Date().toISOString()}`,
  }
  for (let n = 3; n <= 6; n++) {
    let sum = 0
    for (let s = 0; s < SAMPLES; s++) {
      const cast: number[][] = []
      const used = new Set<number>()
      while (cast.length < n) {
        const i = Math.floor(Math.random() * embeddings.length)
        if (used.has(i)) continue
        used.add(i)
        cast.push(embeddings[i]!)
      }
      sum += diversityScore(cast)
    }
    baselines[String(n)] = sum / SAMPLES
    console.log(`n=${n}: baseline ${(sum / SAMPLES).toFixed(4)}`)
  }

  writeFileSync(OUT, JSON.stringify(baselines, null, 2) + '\n')
  console.log(`written → ${OUT} (commit this file with the seed batch)`)
  await closeDb()
}

main()
