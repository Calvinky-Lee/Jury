import { z } from 'zod';

// Spec 08: "one score + one-sentence justification per metric; justifications
// are logged (they're the debugging signal)."
export const JudgeScoreSchema = z.object({
  score: z.number().int().min(1).max(5),
  justification: z.string().min(1),
});
export type JudgeScore = z.infer<typeof JudgeScoreSchema>;
