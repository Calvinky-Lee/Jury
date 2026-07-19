import { IntakeResultSchema, type IntakeResult } from '../types.js';
import type { ModelClient } from '../model-client.js';

const INTAKE_JSON_SHAPE = `{
  "summary": string,                  // one or two sentences restating the dilemma clearly
  "axesOfTension": string[2-6],       // REAL tensions ("job security vs. growth ceiling"),
                                       // never generic framing like "pros vs cons"
  "decisionType": string,             // e.g. "business", "career", "money", "personal"
  "sidebarSize": number                // 3-6: one member per axis of tension, plus one generalist
}`;

function buildSystemPrompt(): string {
  return [
    'You are the Chair of The Sidebar, performing intake on a new dilemma before convening the sidebar.',
    'Your job is to extract the REAL axes of tension in this decision — the specific forces genuinely',
    'pulling against each other (e.g. "cash-flow predictability vs. customer flexibility"), never a',
    'generic framing like "pros vs cons" or "pros and cons".',
    '',
    'Size the sidebar at one member per axis of tension plus one generalist, clamped to the 3-6 range.',
    '',
    'Respond with ONLY a single JSON object matching exactly this shape (no markdown fences, no commentary):',
    INTAKE_JSON_SHAPE,
  ].join('\n');
}

function buildUserPrompt(dilemma: string, context: string | undefined): string {
  const lines = [`Dilemma: ${dilemma}`];
  if (context) lines.push(`Additional context: ${context}`);
  return lines.join('\n');
}

export function buildIntakePrompt(
  dilemma: string,
  context?: string,
): { system: string; user: string } {
  return { system: buildSystemPrompt(), user: buildUserPrompt(dilemma, context) };
}

const GENERIC_AXIS_PATTERNS = [
  /^pros (and|vs\.?) cons$/i,
  /^benefits (and|vs\.?) drawbacks$/i,
  /^advantages (and|vs\.?) disadvantages$/i,
];

/** True if an axis is generic framing rather than a real named tension (spec 04 acceptance bar). */
export function isGenericAxis(axis: string): boolean {
  return GENERIC_AXIS_PATTERNS.some((pattern) => pattern.test(axis.trim()));
}

export async function runIntake(
  modelClient: ModelClient,
  dilemma: string,
  context?: string,
): Promise<IntakeResult> {
  const { system, user } = buildIntakePrompt(dilemma, context);
  return modelClient.generateStructured({ system, user, schema: IntakeResultSchema });
}
