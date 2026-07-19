import { describe, it, expect } from 'vitest';
import { runBrief, mentionsPersonaIdentity } from './brief.js';
import { fakeClientWithResponse } from '../model-client.js';
import type { PersonaForBrief, IntakeResult } from '../types.js';

const actuary: PersonaForBrief = {
  id: 'actuary',
  name: 'The Actuary',
  archetype: 'Risk quantifier',
  voice: 'measured, cites numbers',
  coreValues: ['risk quantification', 'data-driven decisions'],
  biases: ['overweights downside scenarios'],
  decisionStyle: 'cautious, evidence-first',
};

const intake: IntakeResult = {
  summary: 'Deciding whether to move the SaaS product from monthly to annual billing.',
  axesOfTension: ['cash-flow predictability vs. customer flexibility'],
  decisionType: 'business',
  councilSize: 4,
};

const idealBrief = {
  brief:
    "This pricing shift is exactly the kind of decision that needs real churn data before committing — a risk quantification exercise, not a guess.",
  initialRead: "Risky. I'd want churn data before touching pricing.",
};

describe('situation-brief prompt', () => {
  it('parses a well-formed response within the length caps', async () => {
    const client = fakeClientWithResponse(idealBrief);
    const result = await runBrief(client, actuary, intake);
    expect(result.brief.length).toBeGreaterThan(0);
    expect(result.initialRead.length).toBeLessThanOrEqual(140);
  });

  it('rejects an initialRead over 140 chars at the schema level', async () => {
    const client = fakeClientWithResponse({ ...idealBrief, initialRead: 'x'.repeat(141) });
    await expect(runBrief(client, actuary, intake)).rejects.toThrow();
  });
});

describe('mentionsPersonaIdentity — structural smoke test', () => {
  it('passes when the brief engages with the persona\'s values/biases', () => {
    expect(mentionsPersonaIdentity(idealBrief.brief, actuary)).toBe(true);
  });

  it('fails on a generic brief that could belong to any persona', () => {
    const genericBrief = 'This is a tricky decision with many factors to weigh carefully.';
    expect(mentionsPersonaIdentity(genericBrief, actuary)).toBe(false);
  });
});
