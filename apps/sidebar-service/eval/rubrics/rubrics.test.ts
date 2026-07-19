import { describe, it, expect } from 'vitest';
import { scoreVerdictFidelity, buildVerdictFidelityPrompt } from './verdict-fidelity.js';
import { scoreActionability, buildActionabilityPrompt } from './actionability.js';
import { fakeClientWithResponse } from '../../src/chair/model-client.js';
import { splitIdealVerdict } from '../../src/chair/prompts/__fixtures__/verdict-fixtures.js';
import { parseVerdictResponse } from '../../src/chair/prompts/verdict.js';

const verdict = parseVerdictResponse(splitIdealVerdict);
const transcript = 'The Actuary argued for a guarantee clause; the Gambler pushed for aggressive pricing; the Traditionalist dissented in favor of keeping monthly.';

const idealScore = { score: 4, justification: 'The ruling reflects the 3-1 split and steelmans the dissent.' };

describe('verdict-fidelity rubric', () => {
  it('builds a prompt that includes the transcript and verdict', () => {
    const { user } = buildVerdictFidelityPrompt(transcript, verdict);
    expect(user).toContain('The Actuary argued');
    expect(user).toContain(verdict.ruling);
  });

  it('parses a well-formed judge response', async () => {
    const client = fakeClientWithResponse(idealScore);
    const result = await scoreVerdictFidelity(client, transcript, verdict);
    expect(result.score).toBe(4);
  });

  it('rejects a score outside 1-5 at the schema level', async () => {
    const client = fakeClientWithResponse({ ...idealScore, score: 7 });
    await expect(scoreVerdictFidelity(client, transcript, verdict)).rejects.toThrow();
  });
});

describe('actionability rubric', () => {
  it('builds a prompt that includes the verdict', () => {
    const { user } = buildActionabilityPrompt(verdict);
    expect(user).toContain(verdict.ruling);
  });

  it('parses a well-formed judge response', async () => {
    const client = fakeClientWithResponse(idealScore);
    const result = await scoreActionability(client, verdict);
    expect(result.score).toBe(4);
  });
});
