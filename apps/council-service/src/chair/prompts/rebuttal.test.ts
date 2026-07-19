import { describe, it, expect } from 'vitest';
import { runRebuttal, didStanceChange, buildRebuttalPrompt, type OtherMemberContext } from './rebuttal.js';
import { fakeClientWithResponse } from '../model-client.js';
import type { PersonaForBrief, Stance } from '../types.js';

const traditionalist: PersonaForBrief = {
  id: 'traditionalist',
  name: 'The Traditionalist',
  archetype: 'Status-quo guardian',
  voice: 'measured, protective',
  coreValues: ['customer trust', 'stability'],
  biases: ['overweights past disruptions'],
  decisionStyle: 'cautious, precedent-driven',
};

const others: OtherMemberContext[] = [
  {
    name: 'The Gambler',
    archetype: 'Bold upside-seeker',
    stance: { recommendation: 'Switch to annual billing, aggressively.', confidence: 0.85, keyReasons: ['a', 'b'] },
    fullText: 'Growth-stage companies that moved fast captured market share.',
  },
];

describe('rebuttal prompt', () => {
  it('has no tool-use guidance and references the own statement + others by name', () => {
    const { system, user } = buildRebuttalPrompt(traditionalist, 'Keep monthly billing.', others);
    expect(system.toLowerCase()).toContain('no tools this round');
    expect(user).toContain('The Gambler');
  });

  it('parses a well-formed response against MemberPhaseOutputSchema', async () => {
    const client = fakeClientWithResponse({
      fullText: 'The Gambler is optimizing for a market condition that may not hold.',
      recommendation: 'Keep monthly billing.',
      confidence: 0.7,
      keyReasons: ['Trust matters more than forecasting convenience', 'Support spikes correlate with pricing changes'],
      bubble: 'Not convinced — sticking with monthly.',
    });
    const result = await runRebuttal(client, traditionalist, 'Keep monthly billing.', others);
    expect(result.fullText.length).toBeGreaterThan(0);
  });
});

describe('didStanceChange', () => {
  const base: Stance = { recommendation: 'Keep monthly billing.', confidence: 0.7, keyReasons: ['a', 'b'] };

  it('false when the recommendation is unchanged (even with different casing/whitespace)', () => {
    const same: Stance = { ...base, recommendation: '  keep monthly billing.  ' };
    expect(didStanceChange(base, same)).toBe(false);
  });

  it('true when the recommendation genuinely changes', () => {
    const changed: Stance = { ...base, recommendation: 'Switch to annual billing.' };
    expect(didStanceChange(base, changed)).toBe(true);
  });
});
