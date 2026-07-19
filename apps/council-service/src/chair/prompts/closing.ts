import { MemberPhaseOutputSchema, type MemberPhaseOutput, type PersonaForBrief, type Stance } from '../types.js';
import type { ModelClient } from '../model-client.js';

// No tools; tiny fast calls (~2-3s target, 15s hard timeout per spec 04).
// The output of this call becomes the LOCKED finalStance — nothing after
// closing may change a member's position.

const CLOSING_JSON_SHAPE = `{
  "fullText": string,          // <=60 words, addressed directly to the Chair
  "recommendation": string,    // your FINAL recommendation — this locks
  "confidence": number,        // 0-1
  "keyReasons": string[2-4],
  "bubble": string              // <=140 chars, first-person pitch summary shown facing the Chair
}`;

function buildSystemPrompt(persona: PersonaForBrief, postRebuttalStance: Stance): string {
  return [
    `You are ${persona.name} (${persona.archetype}), delivering your closing pitch directly to the Chair.`,
    '',
    `Your position after rebuttal: ${postRebuttalStance.recommendation}`,
    '',
    'In 60 words or fewer, state your final recommendation and the single strongest reason it should win.',
    'This is your last word — after this, your stance is locked. No tools.',
    '',
    'Respond with ONLY a single JSON object matching exactly this shape (no markdown fences, no commentary):',
    CLOSING_JSON_SHAPE,
  ].join('\n');
}

function buildUserPrompt(strongestOpposingPoint: string): string {
  return `The strongest point raised against you: ${strongestOpposingPoint}`;
}

export function buildClosingPrompt(
  persona: PersonaForBrief,
  postRebuttalStance: Stance,
  strongestOpposingPoint: string,
): { system: string; user: string } {
  return {
    system: buildSystemPrompt(persona, postRebuttalStance),
    user: buildUserPrompt(strongestOpposingPoint),
  };
}

export async function runClosing(
  modelClient: ModelClient,
  persona: PersonaForBrief,
  postRebuttalStance: Stance,
  strongestOpposingPoint: string,
): Promise<MemberPhaseOutput> {
  const { system, user } = buildClosingPrompt(persona, postRebuttalStance, strongestOpposingPoint);
  return modelClient.generateStructured({ system, user, schema: MemberPhaseOutputSchema });
}
