import { z } from "zod";

/** Calculator tool (spec 06 §2) — mathjs evaluate() in restricted scope, never eval(). */
export const CalculatorInputSchema = z.object({
  expression: z.string().min(1).max(500),
  note: z.string().optional(), // what this computes, shown in the chip
});
export type CalculatorInput = z.infer<typeof CalculatorInputSchema>;

export const CalculatorOutputSchema = z.union([
  z.object({ result: z.string() }),
  z.object({ error: z.string() }),
]);
export type CalculatorOutput = z.infer<typeof CalculatorOutputSchema>;

/** Web search tool (spec 06 §1) — Gemini Google Search grounding, translated from groundingMetadata. */
export const WebSearchInputSchema = z.object({
  queries: z.array(z.string()).min(1),
});
export type WebSearchInput = z.infer<typeof WebSearchInputSchema>;

export const WebSearchSourceSchema = z.object({
  title: z.string(),
  uri: z.string().optional(),
});

export const WebSearchOutputSchema = z.union([
  z.object({ sources: z.array(WebSearchSourceSchema) }),
  z.object({ error: z.string() }),
]);
export type WebSearchOutput = z.infer<typeof WebSearchOutputSchema>;
