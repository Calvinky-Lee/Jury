import { JudgeScoreSchema, type JudgeScore } from './schema.js';
import type { ModelClient } from '../../src/chair/model-client.js';
import type { Verdict } from '../../src/chair/types.js';

function buildSystemPrompt(): string {
  return [
    'You are an impartial judge scoring a Sidebar verdict on ACTIONABILITY.',
    'Rubric: is there a concrete recommendation? Are conditions attached? Are the',
    '"what would change our mind" items genuinely testable, not vague ("if circumstances change")?',
    '',
    'Score 1 (poor) to 5 (excellent).',
    '',
    'Respond with ONLY a single JSON object matching exactly this shape (no markdown fences, no commentary):',
    '{ "score": number 1-5, "justification": string (one sentence) }',
  ].join('\n');
}

function buildUserPrompt(verdict: Verdict): string {
  return `Verdict:\n${JSON.stringify(verdict, null, 2)}`;
}

export function buildActionabilityPrompt(verdict: Verdict): { system: string; user: string } {
  return { system: buildSystemPrompt(), user: buildUserPrompt(verdict) };
}

export async function scoreActionability(
  modelClient: ModelClient,
  verdict: Verdict,
): Promise<JudgeScore> {
  const { system, user } = buildActionabilityPrompt(verdict);
  return modelClient.generateStructured({ system, user, schema: JudgeScoreSchema });
}
