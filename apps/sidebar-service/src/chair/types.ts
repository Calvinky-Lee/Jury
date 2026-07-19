import { z } from 'zod';
import {
  StanceSchema,
  VerdictSchema,
  type Stance,
  type Verdict,
  type Phase,
  type SessionStatus,
  type Avatar,
} from '@sidebar/contract';

// Stance/Verdict/Phase/SessionStatus now come from @sidebar/contract (P4's hour-0
// deliverable, landed after this file was first written as a stand-in — reconciled
// here rather than left to silently diverge, per this file's own original warning).
export { StanceSchema, VerdictSchema };
export type { Stance, Verdict, Phase, SessionStatus };

// Just enough persona shape to build prompts without depending on P2's full
// persona/casting system (spec 05 owns the real thing).
export const CastMemberLiteSchema = z.object({
  id: z.string(),
  name: z.string(),
  archetype: z.string(),
});
export type CastMemberLite = z.infer<typeof CastMemberLiteSchema>;

export interface MemberTranscript {
  statement: string;
  rebuttal: string;
  closing: string;
}

// Mirrors specs/02-contract.md §phases.ts (kept local as a plain array for
// state-machine.ts's iteration; the `Phase`/`SessionStatus` *types* above are the
// contract's real ones).
export const PHASES = ['intake', 'casting', 'statements', 'rebuttal', 'closing', 'verdict'] as const;

// Intake output (spec 04 §intake.ts). Note: the contract's `dilemma_parsed` SSE
// payload (spec 02) only carries `summary`/`axesOfTension`/`sidebarSize` —
// `decisionType` is used internally (eval-set categorization) and isn't emitted.
export const IntakeResultSchema = z.object({
  summary: z.string().min(1),
  axesOfTension: z.array(z.string().min(1)).min(2).max(6),
  decisionType: z.string().min(1),
  sidebarSize: z.number().int().min(3).max(6),
});
export type IntakeResult = z.infer<typeof IntakeResultSchema>;

// Full-enough persona shape for the situation-brief prompt: identity fields
// (CastMemberLite) plus the stance-profile fields spec 05 owns for real
// (P2's persona/casting system). This is a local stand-in, same caveat as
// CastMemberLite above.
//
// `avatar`/`domains` are optional here (existing Fakes/tests don't set them)
// but the orchestrator spreads this shape straight into the `persona_cast`
// wire event, whose `CastMember` (spec 02, packages/contract/src/persona.ts)
// requires both — the real CastingProvider adapter always populates them.
export interface PersonaForBrief extends CastMemberLite {
  voice: string;
  coreValues: string[];
  biases: string[];
  decisionStyle: string;
  avatar?: Avatar;
  domains?: string[];
}

// Situation-brief output (spec 04 §brief.ts).
export const SituationBriefSchema = z.object({
  brief: z.string().min(1),
  // "Bubble rule": every member phase's structured output includes a first-person,
  // in-voice ≤140-char summary — for the brief, this becomes the member's very
  // first thinking bubble (persona_cast.initialRead).
  initialRead: z.string().min(1).max(140),
});
export type SituationBrief = z.infer<typeof SituationBriefSchema>;

// Shared structured output for statement/rebuttal/closing — mirrors the
// statement_done/rebuttal_done/closing_done event payloads (spec 02): the full
// in-voice prose, the structured Stance, and spec 04's "bubble rule" — a
// first-person ≤140-char summary for the UI's thinking bubble.
export const MemberPhaseOutputSchema = StanceSchema.extend({
  fullText: z.string().min(1),
  bubble: z.string().min(1).max(140),
});
export type MemberPhaseOutput = z.infer<typeof MemberPhaseOutputSchema>;
