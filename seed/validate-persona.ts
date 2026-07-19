import { PersonaSchema } from '../packages/contract/src/persona'

/**
 * Quality rubric enforcement (spec 05): schema validity, real trimmed content,
 * original names only (Pixar/Disney blocklist), and hue balance across the
 * library. Failures are regenerated, never hand-patched.
 */

// Iconic Pixar/Disney character names (incl. Inside Out and Zootopia — the two
// franchises the theme brushes against). Word-boundary matched, case-insensitive.
const BLOCKED_NAMES = [
  'joy', 'sadness', 'anger', 'fear', 'disgust', 'bing bong', 'riley',
  'embarrassment', 'anxiety', 'envy', 'ennui', 'nostalgia',
  'judy hopps', 'hopps', 'nick wilde', 'clawhauser', 'bogo', 'bellwether', 'gazelle',
  'woody', 'buzz lightyear', 'jessie', 'elsa', 'anna', 'olaf', 'kristoff',
  'moana', 'maui', 'mickey', 'minnie', 'donald duck', 'goofy',
  'simba', 'mufasa', 'scar', 'nala', 'timon', 'pumbaa',
  'nemo', 'dory', 'marlin', 'lightning mcqueen', 'mater',
  'mike wazowski', 'sulley', 'wall-e', 'remy', 'merida', 'miguel', 'coco',
]

const BLOCKLIST_PATTERNS = BLOCKED_NAMES.map(
  (name) => new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
)

export function isBlockedName(name: string): boolean {
  return BLOCKLIST_PATTERNS.some((re) => re.test(name))
}

export function validatePersona(persona: unknown): { ok: boolean; reasons: string[] } {
  const reasons: string[] = []

  const parsed = PersonaSchema.safeParse(persona)
  if (!parsed.success) {
    reasons.push(...parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`))
    return { ok: false, reasons }
  }
  const p = parsed.data

  if (isBlockedName(p.name)) {
    reasons.push(`name "${p.name}" matches the Pixar/Disney blocklist`)
  }
  if (!p.stanceProfile.decisionStyle.trim()) {
    reasons.push('decision style is empty (rubric #1: distinct style in one sentence)')
  }
  if (!p.voice.trim()) {
    reasons.push('voice is empty (rubric #3: voice must survive one sentence of reading)')
  }
  if (!p.stanceProfile.biases.some((b) => b.trim())) {
    reasons.push('no explicit bias (rubric #2: at least one real flaw)')
  }

  return { ok: reasons.length === 0, reasons }
}

/** Rubric #4: no hue exceeds ~10% of the library. */
export function checkHueBalance(hues: string[]): { ok: boolean; over: string[] } {
  const cap = Math.ceil(hues.length * 0.1)
  const counts = new Map<string, number>()
  for (const hue of hues) counts.set(hue, (counts.get(hue) ?? 0) + 1)
  const over = [...counts.entries()].filter(([, n]) => n > cap).map(([hue]) => hue)
  return { ok: over.length === 0, over }
}
