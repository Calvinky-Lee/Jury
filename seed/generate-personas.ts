/**
 * Persona library generation (spec 05) — offline, one-time, human-reviewed.
 * ~200 personas via Gemini Flash, batched by decision domain, validated
 * against the quality rubric; failures are regenerated, never patched.
 *
 * Output: seed/personas.json — review it before `pnpm seed:load`.
 */
import { GoogleGenAI } from '@google/genai'
import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import 'dotenv/config'
import { BLOB_FORMS, PALETTE, type Persona } from '../packages/contract/src/persona'
import { checkHueBalance, validatePersona } from './validate-persona'

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'personas.json')
const TARGET = 200
const BATCH = 10
const MODEL = 'gemini-2.5-flash' // pinned at hour 0 per spec 04; upgrade to 3.x if the tier allows

const DOMAIN_BATCHES: { domain: string; share: number }[] = [
  { domain: 'business & startups', share: 0.2 },
  { domain: 'career', share: 0.2 },
  { domain: 'money & purchases', share: 0.15 },
  { domain: 'personal life & relationships', share: 0.15 },
  { domain: 'ethics & principles', share: 0.1 },
  { domain: 'creative & unconventional', share: 0.1 },
  { domain: 'generalist (cross-domain wisdom)', share: 0.1 },
]

const HUES = Object.keys(PALETTE)

const PROMPT = (domain: string, count: number, avoidNames: string[]) => `
You are generating ${count} distinct advisor personas for a decision-deliberation
product, focused on the domain: ${domain}.

Return STRICT JSON: an array of ${count} objects, each:
{
  "name": string,            // ORIGINAL human name. Never a Pixar/Disney/film character name.
  "archetype": string,       // "The <Something>" — e.g. "The Actuary", "The Gambler"
  "voice": string,           // one sentence of speech-style direction with real texture
  "domains": string[],       // 1-3 lowercase domains
  "avatar": { "hue": one of ${JSON.stringify(HUES)}, "form": one of ${JSON.stringify([...BLOB_FORMS])} },
  "stanceProfile": {
    "coreValues": string[],  // 2-4
    "biases": string[],      // 1-3 REAL flaws (e.g. "sunk-cost prone"), never humblebrags
    "decisionStyle": string  // ONE sentence, sharply distinct from the others in this batch
  }
}

Rules (quality rubric):
- Every decisionStyle must be distinguishable from the others in one reading.
- At least one bias per persona must be a genuine weakness.
- Assign hue by temperament: warm hues (crimson/ember/amber/magenta) = impulsive/
  passionate; cool hues (sky/indigo/teal/jade) = analytical/calm; violet/plum =
  unconventional; moss/slate = grounded/traditional. Spread forms; 'spiky' for
  abrasive personalities, 'round' for warm ones.
- Do NOT reuse any of these names: ${avoidNames.slice(-60).join(', ') || '(none yet)'}
Return ONLY the JSON array.`

async function main() {
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    console.error('GEMINI_API_KEY is not set — cannot generate. Add it to .env and rerun.')
    process.exit(1)
  }
  const ai = new GoogleGenAI({ apiKey: key })

  let existing: Persona[] = []
  try {
    existing = JSON.parse(readFileSync(OUT, 'utf8'))
    console.log(`resuming: ${existing.length} personas already in ${OUT}`)
  } catch {
    /* fresh start */
  }

  const personas: Persona[] = [...existing]
  for (const { domain, share } of DOMAIN_BATCHES) {
    const want = Math.round(TARGET * share)
    let have = personas.filter((p) => p.domains.join(',').includes(domain.split(' ')[0]!)).length
    let attempts = 0
    while (have < want && attempts < 10) {
      attempts++
      const count = Math.min(BATCH, want - have)
      const res = await ai.models.generateContent({
        model: MODEL,
        contents: PROMPT(domain, count, personas.map((p) => p.name)),
        config: { responseMimeType: 'application/json', temperature: 1.0 },
      })
      let batch: unknown[]
      try {
        batch = JSON.parse(res.text ?? '[]')
      } catch {
        console.warn(`  batch parse failure (attempt ${attempts}), regenerating`)
        continue
      }
      for (const raw of batch) {
        const candidate = { ...(raw as object), id: randomUUID() }
        const verdict = validatePersona(candidate)
        const name = (candidate as { name?: string }).name ?? '?'
        if (!verdict.ok) {
          console.warn(`  rejected ${name}: ${verdict.reasons.join('; ')}`)
          continue
        }
        if (personas.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
          console.warn(`  rejected ${name}: duplicate name`)
          continue
        }
        personas.push(candidate as Persona)
        have++
      }
      writeFileSync(OUT, JSON.stringify(personas, null, 2))
      console.log(`${domain}: ${have}/${want} (${personas.length} total)`)
    }
  }

  const balance = checkHueBalance(personas.map((p) => p.avatar.hue))
  if (!balance.ok) {
    console.warn(`hue balance over the ~10% cap: ${balance.over.join(', ')} — review before loading`)
  }
  console.log(`done: ${personas.length} personas → ${OUT}. Human-review before seed:load.`)
}

main()
