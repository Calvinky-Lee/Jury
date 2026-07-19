import { z } from "zod";
import { SessionStatusSchema } from "./phases";
import { VoteSplitSchema } from "./verdict";

export const SessionSummarySchema = z.object({
  id: z.string(),
  dilemma: z.string(),
  createdAt: z.string(),
  status: z.string(),
  orb: z.object({
    hues: z.array(z.string()),
    // reuses the real persona-id VoteSplit shape (verdict.ts) rather than counts —
    // undefined until the session has a verdict (spec 02 §REST).
    voteSplit: VoteSplitSchema.optional(),
  }),
});
export type SessionSummary = z.infer<typeof SessionSummarySchema>;

export const SessionListResponseSchema = z.object({
  sessions: z.array(SessionSummarySchema),
});
export type SessionListResponse = z.infer<typeof SessionListResponseSchema>;

/** POST /sessions request/response (spec 01, 02) — P4's stake. */
export const CreateSessionRequestSchema = z.object({
  dilemma: z.string().min(1),
  context: z.string().optional(),
  demo: z.boolean().optional(), // ?demo=1 equivalent — force demo/fixture replay for this session
});
export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;

export const CreateSessionResponseSchema = z.object({
  id: z.string(),
});
export type CreateSessionResponse = z.infer<typeof CreateSessionResponseSchema>;

/** GET /sessions/:id metadata (spec 03). */
export const SessionMetadataSchema = z.object({
  id: z.string(),
  dilemma: z.string(),
  context: z.string().optional(),
  councilSize: z.number().int().min(3).max(6).optional(),
  status: SessionStatusSchema,
  createdAt: z.string(),
});
export type SessionMetadata = z.infer<typeof SessionMetadataSchema>;
