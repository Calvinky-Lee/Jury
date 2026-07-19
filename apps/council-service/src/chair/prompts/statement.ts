import { MemberPhaseOutputSchema, type MemberPhaseOutput, type PersonaForBrief, type SituationBrief } from '../types.js';
import type { ModelClient } from '../model-client.js';

// Spec 06 describes a two-call pattern for real Gemini grounding (a grounded
// prose call, then a tiny schema-forced call to extract the Stance) plus a live
// tool-calling loop (max 3 iterations). Without a real key or P4's tool
// implementations, this builds the prompt and does a single structured
// call/parse — the two-call split and live tool invocation get wired when
// GeminiModelClient is exercised for real (the ToolExecutor seam in ports.ts
// is ready but unused until then).

const STATEMENT_JSON_SHAPE = `{
  "fullText": string,          // 120-200 words, in character, your opening statement
  "recommendation": string,    // one imperative sentence
  "confidence": number,        // 0-1
  "keyReasons": string[2-4],
  "bubble": string              // <=140 chars, first-person summary of your position
}`;

function buildSystemPrompt(persona: PersonaForBrief, brief: SituationBrief): string {
  return [
    `You are ${persona.name} (${persona.archetype}), a council member giving your opening statement.`,
    '',
    `Core values: ${persona.coreValues.join(', ')}`,
    `Biases: ${persona.biases.join(', ')}`,
    `Decision style: ${persona.decisionStyle}`,
    `Voice: ${persona.voice}`,
    `Your situation brief for this case: ${brief.brief}`,
    '',
    'Tool-use guidance: search or calculate when a verifiable fact would strengthen your argument;',
    'max 3 tool iterations; cite what you found. Do not use a tool just to use one.',
    '',
    'Write 120-200 words of prose in your voice — personality lives in word choice, not length.',
    '',
    'Respond with ONLY a single JSON object matching exactly this shape (no markdown fences, no commentary):',
    STATEMENT_JSON_SHAPE,
  ].join('\n');
}

function buildUserPrompt(dilemma: string): string {
  return `Dilemma: ${dilemma}`;
}

export function buildStatementPrompt(
  persona: PersonaForBrief,
  brief: SituationBrief,
  dilemma: string,
): { system: string; user: string } {
  return { system: buildSystemPrompt(persona, brief), user: buildUserPrompt(dilemma) };
}

export async function runStatement(
  modelClient: ModelClient,
  persona: PersonaForBrief,
  brief: SituationBrief,
  dilemma: string,
): Promise<MemberPhaseOutput> {
  const { system, user } = buildStatementPrompt(persona, brief, dilemma);
  return modelClient.generateStructured({ system, user, schema: MemberPhaseOutputSchema });
}
