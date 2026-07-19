import {
  VerdictSchema,
  type Verdict,
  type Stance,
  type CastMemberLite,
  type MemberTranscript,
} from '../types.js';
import type { ModelClient } from '../model-client.js';

export interface VerdictPromptInput {
  dilemma: string;
  axesOfTension?: string[];
  members: CastMemberLite[];
  /** personaId -> locked final stance (post-closing) */
  lockedStances: Record<string, Stance>;
  /** personaId -> opening/rebuttal/closing text excerpts */
  transcripts: Record<string, MemberTranscript>;
}

const VERDICT_JSON_SHAPE = `{
  "ruling": string,                          // 1-3 sentences, the Chair's direct personal answer — no hedging
  "solutionPlan": string[3-6],                // devised synthesis mixing the strongest elements across members —
                                               // NOT just picking the majority side; every step must be traceable
                                               // to a specific member's argument
  "voteSplit": { "for": string[], "against": string[], "abstain": string[] },  // persona ids, from the ACTUAL locked stances below
  "majorityReasoning": string,
  "dissent": { "who": string, "position": string, "whyItMatters": string } | null,
                                               // REQUIRED (non-null) whenever voteSplit is not unanimous;
                                               // "position" and "whyItMatters" must be steelmanned — written so
                                               // the dissenter would recognize it as a fair statement of their view
  "confidence": number,                        // 0-1
  "whatWouldChangeOurMind": string[2-3]        // concrete, testable conditions — never "if circumstances change"
}`;

function buildSystemPrompt(): string {
  return [
    'You are the Chair of The Sidebar, delivering the final verdict on a deliberation.',
    'The verdict is two distinct products, and you must treat them separately:',
    '1. `ruling` — your own direct, personal answer to the dilemma. No hedging, no "it depends."',
    '2. `solutionPlan` — a devised OPTIMAL SOLUTION that synthesizes the strongest elements across',
    '   multiple sidebar members (e.g. one member\'s bold move combined with another member\'s safeguard).',
    '   This is synthesis, not side-picking: a plan that only reflects the majority\'s view is a failure.',
    '',
    'Hard requirements:',
    '- `voteSplit` must be derived strictly from the locked stances you are given below — never invented.',
    '- If the vote is not unanimous, `dissent` MUST be non-null, and must steelman the dissenting position —',
    '  write it so the dissenting member would agree it is a fair statement of their view, not a dismissal.',
    '- `whatWouldChangeOurMind` items must be concrete and testable (e.g. "if churn exceeds 3%/month"),',
    '  never generic (e.g. "if circumstances change").',
    '- Every step in `solutionPlan` must be attributable to at least one specific member\'s argument.',
    '',
    'Respond with ONLY a single JSON object matching exactly this shape (no markdown fences, no commentary):',
    VERDICT_JSON_SHAPE,
  ].join('\n');
}

function buildUserPrompt(input: VerdictPromptInput): string {
  const lines: string[] = [];
  lines.push(`Dilemma: ${input.dilemma}`);
  if (input.axesOfTension?.length) {
    lines.push(`Axes of tension: ${input.axesOfTension.join(' | ')}`);
  }
  lines.push('');
  lines.push('Sidebar members and their locked final stances:');
  for (const member of input.members) {
    const stance = input.lockedStances[member.id];
    const transcript = input.transcripts[member.id];
    lines.push('');
    lines.push(`### ${member.name} (${member.archetype}) — id: ${member.id}`);
    if (stance) {
      lines.push(`Final recommendation: ${stance.recommendation}`);
      lines.push(`Confidence: ${stance.confidence}`);
      lines.push(`Key reasons: ${stance.keyReasons.join('; ')}`);
    }
    if (transcript) {
      lines.push(`Opening statement: ${transcript.statement}`);
      lines.push(`Rebuttal: ${transcript.rebuttal}`);
      lines.push(`Closing pitch: ${transcript.closing}`);
    }
  }
  return lines.join('\n');
}

export function buildVerdictPrompt(input: VerdictPromptInput): { system: string; user: string } {
  return { system: buildSystemPrompt(), user: buildUserPrompt(input) };
}

/** Zod-parses a raw model (or fixture) response into a Verdict. Fails loudly on mismatch. */
export function parseVerdictResponse(raw: unknown): Verdict {
  return VerdictSchema.parse(raw);
}

export function renderBriefMarkdown(
  dilemma: string,
  members: CastMemberLite[],
  verdict: Verdict,
): string {
  const memberById = new Map(members.map((m) => [m.id, m]));
  const nameOf = (id: string) => memberById.get(id)?.name ?? id;

  const lines: string[] = [];
  lines.push('# Decision Brief', '');
  lines.push('## Dilemma', dilemma, '');
  lines.push('## Sidebar');
  for (const m of members) lines.push(`- **${m.name}** (${m.archetype})`);
  lines.push('');
  lines.push('## Vote');
  lines.push(`- For: ${verdict.voteSplit.for.map(nameOf).join(', ') || 'none'}`);
  lines.push(`- Against: ${verdict.voteSplit.against.map(nameOf).join(', ') || 'none'}`);
  lines.push(`- Abstain: ${verdict.voteSplit.abstain.map(nameOf).join(', ') || 'none'}`);
  lines.push('');
  lines.push('## Ruling', verdict.ruling, '');
  lines.push('## Solution Plan');
  verdict.solutionPlan.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
  lines.push('');
  lines.push('## Majority Reasoning', verdict.majorityReasoning, '');
  if (verdict.dissent) {
    lines.push(`## Dissent — ${nameOf(verdict.dissent.who)}`);
    lines.push(verdict.dissent.position, '');
    lines.push(`**Why it matters:** ${verdict.dissent.whyItMatters}`, '');
  }
  lines.push('## What Would Change Our Mind');
  verdict.whatWouldChangeOurMind.forEach((cond) => lines.push(`- ${cond}`));
  lines.push('');
  lines.push(`_Confidence: ${Math.round(verdict.confidence * 100)}%_`);
  return lines.join('\n');
}

export async function runVerdict(
  modelClient: ModelClient,
  input: VerdictPromptInput,
): Promise<{ verdict: Verdict; briefMd: string }> {
  const { system, user } = buildVerdictPrompt(input);
  const verdict = await modelClient.generateStructured({ system, user, schema: VerdictSchema });
  const briefMd = renderBriefMarkdown(input.dilemma, input.members, verdict);
  return { verdict, briefMd };
}
