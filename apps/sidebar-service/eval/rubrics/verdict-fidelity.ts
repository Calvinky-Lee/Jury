import { JudgeScoreSchema, type JudgeScore } from './schema.js';
import type { ModelClient } from '../../src/chair/model-client.js';
import type { Verdict } from '../../src/chair/types.js';

// Spec 08: judge sees the full transcript + verdict, never the KPI targets.

function buildSystemPrompt(): string {
  return [
    'You are an impartial judge scoring a Sidebar deliberation on VERDICT FIDELITY.',
    'Rubric: does the ruling honestly reflect the vote split? Is the dissent present, correctly',
    'attributed, and steelmanned — would the dissenting member recognize the summary as fair?',
    '',
    'Score 1 (poor) to 5 (excellent).',
    '',
    'Respond with ONLY a single JSON object matching exactly this shape (no markdown fences, no commentary):',
    '{ "score": number 1-5, "justification": string (one sentence) }',
  ].join('\n');
}

function buildUserPrompt(transcript: string, verdict: Verdict): string {
  return [`Transcript:\n${transcript}`, '', `Verdict:\n${JSON.stringify(verdict, null, 2)}`].join('\n');
}

export function buildVerdictFidelityPrompt(
  transcript: string,
  verdict: Verdict,
): { system: string; user: string } {
  return { system: buildSystemPrompt(), user: buildUserPrompt(transcript, verdict) };
}

export async function scoreVerdictFidelity(
  modelClient: ModelClient,
  transcript: string,
  verdict: Verdict,
): Promise<JudgeScore> {
  const { system, user } = buildVerdictFidelityPrompt(transcript, verdict);
  return modelClient.generateStructured({ system, user, schema: JudgeScoreSchema });
}
