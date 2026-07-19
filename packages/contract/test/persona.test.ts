import { describe, expect, test } from 'vitest'
import {
  BLOB_FORMS,
  PALETTE,
  PersonaSchema,
  canonicalStanceText,
} from '../src/persona'

const validPersona = {
  id: '7f9c24e5-1c9a-4c3b-9d2e-8a1f0b6c5d4e',
  name: 'Marlow Tench',
  archetype: 'The Actuary',
  avatar: { hue: 'indigo', form: 'squat' },
  voice: 'Dry, precise, allergic to adjectives.',
  domains: ['finance', 'career'],
  stanceProfile: {
    coreValues: ['security', 'proven track records'],
    biases: ['overweights worst-case outcomes'],
    decisionStyle: 'risk-averse, precedent-driven, favors reversible choices',
  },
}

describe('persona schema (spec 02)', () => {
  test('accepts a valid persona', () => {
    expect(PersonaSchema.parse(validPersona)).toBeTruthy()
  })

  test('rejects a persona with zero explicit biases', () => {
    const noBias = {
      ...validPersona,
      stanceProfile: { ...validPersona.stanceProfile, biases: [] },
    }
    expect(() => PersonaSchema.parse(noBias)).toThrow()
  })

  test('rejects an avatar hue outside the fixed 12-color palette', () => {
    const badHue = { ...validPersona, avatar: { hue: 'chartreuse', form: 'round' } }
    expect(() => PersonaSchema.parse(badHue)).toThrow()
  })

  test('palette has exactly 12 hues and forms are the fixed SVG set', () => {
    expect(Object.keys(PALETTE)).toHaveLength(12)
    expect(BLOB_FORMS).toEqual(['round', 'tall', 'squat', 'spiky'])
  })
})

describe('canonicalStanceText (spec 05 — the ONLY text that gets embedded)', () => {
  test('renders the exact canonical template, no identity fields', () => {
    const text = canonicalStanceText(validPersona)
    expect(text).toBe(
      [
        'Decision style: risk-averse, precedent-driven, favors reversible choices',
        'Core values: security, proven track records',
        'Biases: overweights worst-case outcomes',
        'Domains: finance, career',
      ].join('\n'),
    )
    expect(text).not.toContain('Marlow')
    expect(text).not.toContain('Actuary')
  })
})
