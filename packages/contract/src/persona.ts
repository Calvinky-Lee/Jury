import { z } from 'zod'

/**
 * P2's contract stake (spec 02): the persona record and persona_cast payload.
 *
 * WHY the identity / stance-profile split: only the stance profile is ever
 * embedded. Bio text (names, archetypes, flavor) makes embedding distance
 * measure topical vibes; values + biases + decision style are the closest
 * cheap proxy for "will these two actually give different advice" (spec 05).
 */

// Fixed 12-color palette shared with the frontend's blob character system
// (spec 07 — hue is the member's identity color everywhere in the UI).
export const PALETTE = {
  crimson: '#E5484D',
  ember: '#F76B15',
  amber: '#FFC53D',
  moss: '#7FB069',
  jade: '#29A383',
  teal: '#12A594',
  sky: '#0090FF',
  indigo: '#3E63DD',
  violet: '#8E4EC6',
  plum: '#AB4ABA',
  magenta: '#DE51A8',
  slate: '#8B8D98',
} as const

export type BlobHue = keyof typeof PALETTE
const HUES = Object.keys(PALETTE) as [BlobHue, ...BlobHue[]]

export const BLOB_FORMS = ['round', 'tall', 'squat', 'spiky'] as const
export type BlobForm = (typeof BLOB_FORMS)[number]

export const AvatarSchema = z.object({
  hue: z.enum(HUES),
  form: z.enum(BLOB_FORMS),
})

export const StanceProfileSchema = z.object({
  coreValues: z.array(z.string().min(1)).min(1),
  biases: z.array(z.string().min(1)).min(1), // ≥1 explicit bias — a real flaw (spec 05 rubric #2)
  decisionStyle: z.string().min(1),
})

export const PersonaIdentitySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1), // original names only — seed enforces the Pixar/Disney blocklist
  archetype: z.string().min(1),
  avatar: AvatarSchema,
  voice: z.string().min(1),
  domains: z.array(z.string().min(1)).min(1),
})

export const PersonaSchema = PersonaIdentitySchema.extend({
  stanceProfile: StanceProfileSchema,
})

export const CastMemberSchema = PersonaSchema.extend({
  seat: z.number().int().min(0).max(5),
  mmrScore: z.number(),
  situationBrief: z.string().optional(), // Chair-written after casting (spec 04)
  model: z
    .object({ id: z.string(), provider: z.string(), reason: z.string().max(80) })
    .optional(), // Chair-assigned capability routing (spec 04)
})

export const VectorPointSchema = z.object({
  personaId: z.string(),
  x: z.number().min(-1).max(1),
  y: z.number().min(-1).max(1),
  seat: z.number().int().min(0).max(5),
})

export const PersonaCastPayloadSchema = z.object({
  member: CastMemberSchema,
  seat: z.number().int().min(0).max(5),
  runningDiversityScore: z.number(),
  initialRead: z.string().max(140).optional(), // Chair-distilled first thinking bubble (spec 02)
})

export type Persona = z.infer<typeof PersonaSchema>
export type CastMember = z.infer<typeof CastMemberSchema>
export type VectorPoint = z.infer<typeof VectorPointSchema>

/**
 * The exact canonical text that gets embedded (spec 05) — stance profile plus
 * domains, never identity. Changing this template invalidates every stored
 * embedding: re-seed and add a rationale line to spec 05.
 */
export function canonicalStanceText(persona: {
  domains: string[]
  stanceProfile: { coreValues: string[]; biases: string[]; decisionStyle: string }
}): string {
  const s = persona.stanceProfile
  return [
    `Decision style: ${s.decisionStyle}`,
    `Core values: ${s.coreValues.join(', ')}`,
    `Biases: ${s.biases.join(', ')}`,
    `Domains: ${persona.domains.join(', ')}`,
  ].join('\n')
}
