import { z } from "zod";
import { PersonaCastPayloadSchema, VectorPointSchema } from "./persona";
import { StanceSchema } from "./stance";
import { VerdictSchema } from "./verdict";

export const OpsMetricsSchema = z.object({
  firstCastMs: z.number(),
  firstTokenMs: z.number(),
  verdictMs: z.number(),
  totalCostUsd: z.number(),
  recusals: z.number(),
});
export type OpsMetrics = z.infer<typeof OpsMetricsSchema>;

// `Type extends string` (rather than a bare `type: string` parameter) so each call
// site infers its own literal instead of widening to `string` — otherwise every
// event variant ends up typed with `type: string` and `ContractEvent` stops being a
// real discriminated union (switch/case narrowing on `.type` silently breaks).
function envelope<Type extends string, T extends z.ZodTypeAny>(type: Type, payload: T) {
  return z.object({
    seq: z.number().int(),
    sessionId: z.string(),
    ts: z.string(),
    type: z.literal(type),
    payload,
  });
}

export const SessionStartedEvent = envelope(
  "session_started",
  z.object({ dilemma: z.string(), context: z.string().optional() }),
);

export const DilemmaParsedEvent = envelope(
  "dilemma_parsed",
  z.object({
    summary: z.string(),
    axesOfTension: z.array(z.string()),
    councilSize: z.number().int().min(3).max(6),
    capabilityWeights: z.record(z.string(), z.number()).optional(),
  }),
);

export const CastingStartedEvent = envelope(
  "casting_started",
  z.object({ poolSize: z.number().int(), councilSize: z.number().int().min(3).max(6) }),
);

// reuses P2's persona_cast payload shape (spec 02 / packages/contract/src/persona.ts)
export const PersonaCastEvent = envelope("persona_cast", PersonaCastPayloadSchema);

export const CastingDoneEvent = envelope(
  "casting_done",
  z.object({
    diversityScore: z.number(),
    baselineRatio: z.number(),
    vectorMap: z.array(VectorPointSchema),
  }),
);

export const StatementStartedEvent = envelope(
  "statement_started",
  z.object({ personaId: z.string(), phase: z.literal("opening") }),
);

export const StatementDeltaEvent = envelope(
  "statement_delta",
  z.object({ personaId: z.string(), text: z.string() }),
);

export const StatementDoneEvent = envelope(
  "statement_done",
  z.object({
    personaId: z.string(),
    stance: StanceSchema,
    fullText: z.string(),
    bubble: z.string().max(140),
  }),
);

export const ToolCallEvent = envelope(
  "tool_call",
  z.object({
    personaId: z.string(),
    tool: z.enum(["web_search", "calculator"]),
    input: z.unknown(),
    callId: z.string(),
  }),
);

export const ToolResultEvent = envelope(
  "tool_result",
  z.object({ personaId: z.string(), callId: z.string(), summary: z.string().max(140) }),
);

export const RebuttalStartedEvent = envelope(
  "rebuttal_started",
  z.object({ personaId: z.string() }),
);

export const RebuttalDeltaEvent = envelope(
  "rebuttal_delta",
  z.object({ personaId: z.string(), text: z.string() }),
);

export const RebuttalDoneEvent = envelope(
  "rebuttal_done",
  z.object({
    personaId: z.string(),
    quotedPersonaId: z.string().optional(),
    fullText: z.string(),
    bubble: z.string().max(140),
  }),
);

export const StanceUpdatedEvent = envelope(
  "stance_updated",
  z.object({ personaId: z.string(), from: StanceSchema, to: StanceSchema }),
);

export const ClosingStartedEvent = envelope(
  "closing_started",
  z.object({ personaId: z.string() }),
);

export const ClosingDeltaEvent = envelope(
  "closing_delta",
  z.object({ personaId: z.string(), text: z.string() }),
);

export const ClosingDoneEvent = envelope(
  "closing_done",
  z.object({
    personaId: z.string(),
    finalStance: StanceSchema,
    fullText: z.string(),
    bubble: z.string().max(140),
  }),
);

export const VerdictStartedEvent = envelope("verdict_started", z.object({}));

export const VerdictDeltaEvent = envelope("verdict_delta", z.object({ text: z.string() }));

export const VerdictDoneEvent = envelope(
  "verdict_done",
  z.object({ verdict: VerdictSchema, briefMd: z.string() }),
);

export const AgentRecusedEvent = envelope(
  "agent_recused",
  z.object({ personaId: z.string(), reason: z.enum(["timeout", "error"]) }),
);

export const SessionDoneEvent = envelope(
  "session_done",
  z.object({ status: z.literal("done"), metrics: OpsMetricsSchema }),
);

export const ErrorEvent = envelope(
  "error",
  z.object({ message: z.string(), fatal: z.boolean() }),
);

export const ContractEventSchema = z.discriminatedUnion("type", [
  SessionStartedEvent,
  DilemmaParsedEvent,
  CastingStartedEvent,
  PersonaCastEvent,
  CastingDoneEvent,
  StatementStartedEvent,
  StatementDeltaEvent,
  StatementDoneEvent,
  ToolCallEvent,
  ToolResultEvent,
  RebuttalStartedEvent,
  RebuttalDeltaEvent,
  RebuttalDoneEvent,
  StanceUpdatedEvent,
  ClosingStartedEvent,
  ClosingDeltaEvent,
  ClosingDoneEvent,
  VerdictStartedEvent,
  VerdictDeltaEvent,
  VerdictDoneEvent,
  AgentRecusedEvent,
  SessionDoneEvent,
  ErrorEvent,
]);
export type ContractEvent = z.infer<typeof ContractEventSchema>;
