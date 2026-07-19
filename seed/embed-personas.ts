/**
 * Embedding pipeline (spec 05): canonical stance-profile text → voyage-3
 * (input_type 'document') → seed/personas-embedded.json.
 * Only the stance profile is embedded — never names or flavor text.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import 'dotenv/config'
import { embed } from '../apps/sidebar-service/src/casting/embed'
import { canonicalStanceText, type Persona } from '../packages/contract/src/persona'

const HERE = dirname(fileURLToPath(import.meta.url))
const IN = join(HERE, 'personas.json')
const OUT = join(HERE, 'personas-embedded.json')

async function main() {
  const personas: Persona[] = JSON.parse(readFileSync(IN, 'utf8'))
  console.log(`embedding ${personas.length} stance profiles with voyage-3…`)

  const texts = personas.map((p) => canonicalStanceText(p))
  const vectors = await embed(texts, 'document')

  const out = personas.map((p, i) => ({
    ...p,
    stanceProfileText: texts[i],
    embedding: vectors[i],
  }))
  writeFileSync(OUT, JSON.stringify(out))
  console.log(`done → ${OUT}`)
}

main()
