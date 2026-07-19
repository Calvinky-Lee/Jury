import { describe, it, expect } from 'vitest';
import { runIntake, isGenericAxis } from './intake.js';
import { fakeClientWithResponse, GeminiModelClient } from '../model-client.js';

const idealIntake = {
  summary: 'Deciding whether to move the SaaS product from monthly to annual billing.',
  axesOfTension: [
    'cash-flow predictability vs. customer flexibility',
    'growth speed vs. churn risk',
  ],
  decisionType: 'business',
  sidebarSize: 4,
};

describe('intake prompt', () => {
  it('parses a well-formed response and respects the sidebarSize clamp', async () => {
    const client = fakeClientWithResponse(idealIntake);
    const result = await runIntake(client, 'Should our startup switch to annual billing?');
    expect(result.axesOfTension.length).toBeGreaterThanOrEqual(2);
    expect(result.axesOfTension.length).toBeLessThanOrEqual(6);
    expect(result.sidebarSize).toBeGreaterThanOrEqual(3);
    expect(result.sidebarSize).toBeLessThanOrEqual(6);
  });

  it('rejects a sidebarSize outside 3-6 at the schema level', async () => {
    const client = fakeClientWithResponse({ ...idealIntake, sidebarSize: 8 });
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

describe.skipIf(!process.env.GEMINI_API_KEY)(
  'intake prompt — live Gemini (spec 04 §intake.ts real acceptance bar)',
  () => {
    const dilemmas = [
      'Should our startup switch to annual billing?',
      'Should I leave my stable corporate job to join an early-stage startup?',
      'Should we lay off 15% of the team to extend our runway?',
    ];

    it('every dilemma produces real, non-generic axes of tension', async () => {
      const client = new GeminiModelClient();
      for (const dilemma of dilemmas) {
        const result = await runIntake(client, dilemma);
        expect(result.axesOfTension.some(isGenericAxis)).toBe(false);
        expect(result.sidebarSize).toBeGreaterThanOrEqual(3);
        expect(result.sidebarSize).toBeLessThanOrEqual(6);
        // eslint-disable-next-line no-console
        console.log(`--- ${dilemma} ---`, result.axesOfTension);
      }
    }, 30_000);
  },
);
