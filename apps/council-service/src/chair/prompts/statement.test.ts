import { describe, it, expect } from 'vitest';
import { buildStatementPrompt, runStatement } from './statement.js';
import { fakeClientWithResponse } from '../model-client.js';
import type { PersonaForBrief, SituationBrief } from '../types.js';

const gambler: PersonaForBrief = {
  id: 'gambler',
  name: 'The Gambler',
  archetype: 'Bold upside-seeker',
  voice: 'punchy, high-energy',
  coreValues: ['seizing market windows', 'asymmetric upside'],
  biases: ['discounts downside scenarios'],
  decisionStyle: 'fast, conviction-driven',
};

const brief: SituationBrief = {
  brief: 'This is a growth-window decision — hesitating costs more than a wrong bold move.',
  initialRead: 'Move fast. The window is now.',
};

const idealStatement = {
  fullText:
    'Growth-stage companies that moved fast on annual pricing captured market share while competitors hesitated. We should do the same, aggressively, before the window closes.',
  recommendation: 'Switch to annual billing and push a steep discount to lock in growth fast.',
  confidence: 0.85,
  keyReasons: ['Aggressive pricing accelerates land-grab', 'Locked-in revenue funds hiring'],
  bubble: 'Go annual, go aggressive, lock in the growth window now.',
};

describe('opening-statement prompt', () => {
  it('injects persona identity and tool-use guidance into the system prompt', () => {
    const { system } = buildStatementPrompt(gambler, brief, 'Should we switch to annual billing?');
    expect(system).toContain('seizing market windows');
    expect(system).toContain('discounts downside scenarios');
    expect(system).toContain('fast, conviction-driven');
    expect(system.toLowerCase()).toContain('max 3 tool iterations');
  });

  it('parses a well-formed response against MemberPhaseOutputSchema', async () => {
    const client = fakeClientWithResponse(idealStatement);
    const result = await runStatement(client, gambler, brief, 'Should we switch to annual billing?');
    expect(result.fullText.length).toBeGreaterThan(0);
    expect(result.keyReasons.length).toBeGreaterThanOrEqual(2);
    expect(result.bubble.length).toBeLessThanOrEqual(140);
  });

  it('rejects a bubble over 140 chars at the schema level', async () => {
    const client = fakeClientWithResponse({ ...idealStatement, bubble: 'x'.repeat(141) });
    await expect(runStatement(client, gambler, brief, 'dilemma')).rejects.toThrow();
  });
});
