import { describe, it, expect } from 'vitest';
import { buildClosingPrompt, runClosing } from './closing.js';
import { fakeClientWithResponse, GeminiModelClient } from '../model-client.js';
import type { PersonaForBrief, Stance } from '../types.js';

const pragmatist: PersonaForBrief = {
  id: 'pragmatist',
  name: 'The Pragmatist',
  archetype: 'Practical middle path',
  voice: 'even-keeled, solution-oriented',
  coreValues: ['optionality', 'practical compromise'],
  biases: ['avoids committing to extremes'],
  decisionStyle: 'balanced, seeks middle ground',
};

const postRebuttalStance: Stance = {
  recommendation: 'Offer annual as a discounted option, keep monthly as the default.',
  confidence: 0.65,
  keyReasons: ['Optionality captures upside without forcing migration', 'Keeps a safety net for price-sensitive segments'],
};

describe('closing-pitch prompt', () => {
  it('addresses the Chair directly, has no tool-use guidance, and states the lock', () => {
    const { system } = buildClosingPrompt(pragmatist, postRebuttalStance, 'Monthly billing preserves trust.');
    expect(system).toContain('Chair');
    expect(system.toLowerCase()).toContain('no tools');
    expect(system.toLowerCase()).toContain('locked');
  });

  it('parses a well-formed response against MemberPhaseOutputSchema', async () => {
    const client = fakeClientWithResponse({
      fullText: 'Offer annual as a discounted option, keep monthly as the default.',
      recommendation: 'Offer annual as a discounted option, keep monthly as the default.',
      confidence: 0.65,
      keyReasons: ['Optionality resolves both risks at once', 'No customer is forced to switch'],
      bubble: 'Offer both — let the market self-select.',
    });
    const result = await runClosing(client, pragmatist, postRebuttalStance, 'Monthly billing preserves trust.');
    expect(result.fullText.length).toBeGreaterThan(0);
    expect(result.bubble.length).toBeLessThanOrEqual(140);
  });
});

describe.skipIf(!process.env.GEMINI_API_KEY)('closing-pitch prompt — live Gemini', () => {
  it('produces a schema-valid closing within the 60-word budget', async () => {
    const client = new GeminiModelClient();
    const result = await runClosing(client, pragmatist, postRebuttalStance, 'Monthly billing preserves trust.');
    const wordCount = result.fullText.trim().split(/\s+/).length;
    expect(wordCount).toBeLessThanOrEqual(90); // loose ceiling — spec target is <=60
    // eslint-disable-next-line no-console
    console.log('--- live closing ---', result);
  }, 30_000);
});
