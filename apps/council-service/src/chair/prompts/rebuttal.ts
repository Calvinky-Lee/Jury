import { MemberPhaseOutputSchema, type MemberPhaseOutput, type PersonaForBrief, type Stance } from '../types.js';
import type { ModelClient } from '../model-client.js';

export interface OtherMemberContext {
  name: string;
  archetype: string;
  stance: Stance;
  fullText: string;
}

// No tool access in rebuttals (spec 04 §rebuttal.ts) — facts were for openings;
// this round is about reacting to what the others actually said.

const REBUTTAL_JSON_SHAPE = `{
  "fullText": string,          // your rebuttal, addressing the strongest opposing argument by name
  "recommendation": string,    // your CURRENT recommendation — same as before unless genuinely moved
  "confidence": number,        // 0-1
  "keyReasons": string[2-4],
  "bubble": string              // <=140 chars, first-person read of the others' positions
}`;

function buildSystemPrompt(persona: PersonaForBrief, ownStatement: string): string {
  return [
    `You are ${persona.name} (${persona.archetype}). You already gave your opening statement:`,
    `"${ownStatement}"`,
    '',
    'Now address the strongest opposing argument from the other council members, by name and quote.',
    'You MAY update your recommendation — but only if you are genuinely moved by what you heard, not',
    'to be agreeable. If your view has not changed, keep the same recommendation. Sycophantic',
    'stance-flipping defeats the entire point of this deliberation.',
    '',
    'You have no tools this round — argue from what has already been said.',
    '',
    'Respond with ONLY a single JSON object matching exactly this shape (no markdown fences, no commentary):',
    REBUTTAL_JSON_SHAPE,
  ].join('\n');
}

function buildUserPrompt(others: OtherMemberContext[]): string {
  const lines = ['The other council members said:'];
  for (const other of others) {
    lines.push('');
    lines.push(`${other.name} (${other.archetype}): "${other.fullText}"`);
    lines.push(`Their recommendation: ${other.stance.recommendation}`);
  }
  return lines.join('\n');
}

export function buildRebuttalPrompt(
  persona: PersonaForBrief,
  ownStatement: string,
  others: OtherMemberContext[],
): { system: string; user: string } {
  return { system: buildSystemPrompt(persona, ownStatement), user: buildUserPrompt(others) };
}

export async function runRebuttal(
  modelClient: ModelClient,
  persona: PersonaForBrief,
  ownStatement: string,
  others: OtherMemberContext[],
): Promise<MemberPhaseOutput> {
  const { system, user } = buildRebuttalPrompt(persona, ownStatement, others);
  return modelClient.generateStructured({ system, user, schema: MemberPhaseOutputSchema });
}

/** Normalized comparison — the trigger for a stance_updated event (spec 02/04). */
export function didStanceChange(oldStance: Stance, newStance: Stance): boolean {
  const normalize = (s: string) => s.trim().toLowerCase();
  return normalize(oldStance.recommendation) !== normalize(newStance.recommendation);
}
