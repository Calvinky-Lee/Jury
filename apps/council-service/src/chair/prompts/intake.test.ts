import { describe, it, expect } from 'vitest';
import { runIntake, isGenericAxis } from './intake.js';
import { fakeClientWithResponse } from '../model-client.js';

const idealIntake = {
  summary: 'Deciding whether to move the SaaS product from monthly to annual billing.',
  axesOfTension: [
    'cash-flow predictability vs. customer flexibility',
    'growth speed vs. churn risk',
  ],
  decisionType: 'business',
  councilSize: 4,
};

describe('intake prompt', () => {
  it('parses a well-formed response and respects the councilSize clamp', async () => {
    const client = fakeClientWithResponse(idealIntake);
    const result = await runIntake(client, 'Should our startup switch to annual billing?');
    expect(result.axesOfTension.length).toBeGreaterThanOrEqual(2);
    expect(result.axesOfTension.length).toBeLessThanOrEqual(6);
    expect(result.councilSize).toBeGreaterThanOrEqual(3);
    expect(result.councilSize).toBeLessThanOrEqual(6);
  });

  it('rejects a councilSize outside 3-6 at the schema level', async () => {
    const client = fakeClientWithResponse({ ...idealIntake, councilSize: 8 });
    await expect(runIntake(client, 'dilemma')).rejects.toThrow();
  });
});

describe('isGenericAxis — spec 04 acceptance heuristic', () => {
  it('flags generic pros/cons framing', () => {
    expect(isGenericAxis('pros vs cons')).toBe(true);
    expect(isGenericAxis('Pros and Cons')).toBe(true);
    expect(isGenericAxis('benefits and drawbacks')).toBe(true);
    expect(isGenericAxis('advantages vs disadvantages')).toBe(true);
  });

  it('does not flag a real named tension', () => {
    expect(isGenericAxis('cash-flow predictability vs. customer flexibility')).toBe(false);
    expect(isGenericAxis('job security vs. growth ceiling')).toBe(false);
  });

  it('the ideal fixture has no generic axes', () => {
    expect(idealIntake.axesOfTension.some(isGenericAxis)).toBe(false);
  });
});
