import { z } from 'zod';

// Mirrors specs/02-contract.md §stance.ts / §verdict.ts.
// packages/contract does not exist yet (P4's hour-0 deliverable) — this is a
// deliberate, clearly-labeled stand-in so P1 isn't blocked. Reconcile field-for-field
// with packages/contract at hour 0; do not let this silently diverge.

export const StanceSchema = z.object({
  recommendation: z.string().min(1),
  confidence: z.number().min(0).max(1),
  keyReasons: z.array(z.string().min(1)).min(2).max(4),
});
export type Stance = z.infer<typeof StanceSchema>;

export const VerdictSchema = z.object({
  ruling: z.string().min(1),
  solutionPlan: z.array(z.string().min(1)).min(3).max(6),
  voteSplit: z.object({
    for: z.array(z.string()),
    against: z.array(z.string()),
    abstain: z.array(z.string()),
  }),
  majorityReasoning: z.string().min(1),
  dissent: z
    .object({
      who: z.string(),
      position: z.string().min(1),
      whyItMatters: z.string().min(1),
    })
    .nullable(),
  confidence: z.number().min(0).max(1),
  whatWouldChangeOurMind: z.array(z.string().min(1)).min(2).max(3),
});
export type Verdict = z.infer<typeof VerdictSchema>;

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

// Mirrors specs/02-contract.md §phases.ts.
export const PHASES = ['intake', 'casting', 'statements', 'rebuttal', 'closing', 'verdict'] as const;
export type Phase = (typeof PHASES)[number];
export type SessionStatus = 'created' | Phase | 'done' | 'failed';

// Intake output (spec 04 §intake.ts). Note: the contract's `dilemma_parsed` SSE
// payload (spec 02) only carries `summary`/`axesOfTension`/`councilSize` —
// `decisionType` is used internally (eval-set categorization) and isn't emitted.
// Flag for hour-0 reconciliation if that changes.
export const IntakeResultSchema = z.object({
  summary: z.string().min(1),
  axesOfTension: z.array(z.string().min(1)).min(2).max(6),
  decisionType: z.string().min(1),
  councilSize: z.number().int().min(3).max(6),
});
export type IntakeResult = z.infer<typeof IntakeResultSchema>;
