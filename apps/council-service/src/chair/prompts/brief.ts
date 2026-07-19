import { SituationBriefSchema, type SituationBrief, type PersonaForBrief, type IntakeResult } from '../types.js';
import type { ModelClient } from '../model-client.js';

const BRIEF_JSON_SHAPE = `{
  "brief": string,        // <=120 words, maps the persona's values/biases onto THIS dilemma
  "initialRead": string   // <=140 chars, first-person distillation ("Risky. I'd want churn
                           // data before touching pricing.") — becomes the member's first
                           // thinking bubble
}`;

function buildSystemPrompt(persona: PersonaForBrief): string {
  return [
    `You are writing a situation brief for ${persona.name} (${persona.archetype}), one of the`,
    'four council members about to deliberate on a dilemma.',
    '',
    `Core values: ${persona.coreValues.join(', ')}`,
    `Biases: ${persona.biases.join(', ')}`,
    `Decision style: ${persona.decisionStyle}`,
    `Voice: ${persona.voice}`,
    '',
    "Write a brief that maps this persona's values and biases onto the specific dilemma below.",
    'The persona must argue FROM its identity, specialized to this case — never contradict or',
    'dilute its core values, and never replace them with a generic take.',
    '',
    'Respond with ONLY a single JSON object matching exactly this shape (no markdown fences, no commentary):',
    BRIEF_JSON_SHAPE,
  ].join('\n');
}

function buildUserPrompt(intake: IntakeResult): string {
  return [
    `Dilemma summary: ${intake.summary}`,
    `Axes of tension: ${intake.axesOfTension.join(' | ')}`,
    `Decision type: ${intake.decisionType}`,
  ].join('\n');
}

export function buildBriefPrompt(
  persona: PersonaForBrief,
  intake: IntakeResult,
): { system: string; user: string } {
  return { system: buildSystemPrompt(persona), user: buildUserPrompt(intake) };
}

/**
 * Structural smoke test only — cannot verify "doesn't contradict the persona's
 * identity" without a real model. This just checks the brief actually engages
 * with at least one of the persona's stated values/biases rather than being
 * generic filler.
 */
export function mentionsPersonaIdentity(brief: string, persona: PersonaForBrief): boolean {
  const haystack = brief.toLowerCase();
  const keywords = [...persona.coreValues, ...persona.biases]
    .flatMap((phrase) => phrase.toLowerCase().split(/\s+/))
    .filter((word) => word.length > 4);
  return keywords.some((word) => haystack.includes(word));
}

export async function runBrief(
  modelClient: ModelClient,
  persona: PersonaForBrief,
  intake: IntakeResult,
): Promise<SituationBrief> {
  const { system, user } = buildBriefPrompt(persona, intake);
  return modelClient.generateStructured({ system, user, schema: SituationBriefSchema });
}
