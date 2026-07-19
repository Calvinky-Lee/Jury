import { describe, expect, test } from 'vitest'
import {
  checkHueBalance,
  isBlockedName,
  validatePersona,
} from '../../../seed/validate-persona'

const base = {
  id: '7f9c24e5-1c9a-4c3b-9d2e-8a1f0b6c5d4e',
  name: 'Marlow Tench',
  archetype: 'The Actuary',
  avatar: { hue: 'indigo', form: 'squat' },
  voice: 'Dry, precise, allergic to adjectives.',
  domains: ['finance'],
  stanceProfile: {
    coreValues: ['security'],
    biases: ['overweights worst-case outcomes'],
    decisionStyle: 'risk-averse and precedent-driven',
  },
}

describe('Pixar/Disney name blocklist (spec 05 rubric #5)', () => {
  test('blocks exact and word-boundary matches, case-insensitively', () => {
    expect(isBlockedName('Joy')).toBe(true)
    expect(isBlockedName('judy hopps')).toBe(true)
    expect(isBlockedName('Bing Bong')).toBe(true)
    expect(isBlockedName('Professor Sadness Jr.')).toBe(true)
  })

  test('does not false-positive on names that merely contain a blocked substring', () => {
    expect(isBlockedName('Joyce Whitfield')).toBe(false)
    expect(isBlockedName('Marlow Tench')).toBe(false)
  })
})

describe('validatePersona (spec 05 quality rubric)', () => {
  test('accepts a rubric-passing persona', () => {
    expect(validatePersona(base).ok).toBe(true)
  })

  test('rejects a blocked name with a reason', () => {
    const bad = validatePersona({ ...base, name: 'Judy Hopps' })
    expect(bad.ok).toBe(false)
    expect(bad.reasons.join(' ')).toMatch(/blocklist/i)
  })

  test('rejects an empty decision style', () => {
    const bad = validatePersona({
      ...base,
      stanceProfile: { ...base.stanceProfile, decisionStyle: '  ' },
    })
    expect(bad.ok).toBe(false)
  })
})

describe('checkHueBalance (spec 05 rubric #4 — no hue exceeds ~10%)', () => {
  test('flags a hue above the 10% cap', () => {
    const hues = [
      ...Array(30).fill('indigo'),
      ...Array(170).fill(null).map((_, i) => ['jade', 'ember', 'sky', 'plum'][i % 4]),
    ] as string[]
    const result = checkHueBalance(hues)
    expect(result.ok).toBe(false)
    expect(result.over).toContain('indigo')
  })

  test('passes a distribution balanced across all 12 hues', () => {
    const twelve = [
      'crimson', 'ember', 'amber', 'moss', 'jade', 'teal',
      'sky', 'indigo', 'violet', 'plum', 'magenta', 'slate',
    ]
    const hues = Array(120)
      .fill(null)
      .map((_, i) => twelve[i % 12]) as string[]
    expect(checkHueBalance(hues).ok).toBe(true)
  })
})
