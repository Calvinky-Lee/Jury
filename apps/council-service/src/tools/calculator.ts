import { parse, type MathNode } from "mathjs";
import {
  CalculatorInputSchema,
  CalculatorOutputSchema,
  type CalculatorInput,
  type CalculatorOutput,
} from "@council/contract";
import { withTimeout } from "../util/timeout.js";

const TIMEOUT_MS = 1000;
const FORBIDDEN_NODE_TYPES = new Set([
  "AssignmentNode",
  "FunctionAssignmentNode",
]);

/** Rejects assignment/function-definition before eval — restricted scope, never eval() (spec 06). */
function assertSafeExpression(expression: string): void {
  let root: MathNode;
  try {
    root = parse(expression);
  } catch {
    throw new Error("could not parse expression");
  }
  root.traverse((node) => {
    if (FORBIDDEN_NODE_TYPES.has(node.type)) {
      throw new Error(`"${node.type}" is not allowed in calculator expressions`);
    }
  });
}

/** Evaluated service-side with mathjs in restricted (empty) scope — spec 06 §2. */
export async function runCalculator(rawInput: unknown): Promise<CalculatorOutput> {
  let input: CalculatorInput;
  try {
    input = CalculatorInputSchema.parse(rawInput);
  } catch {
    return CalculatorOutputSchema.parse({ error: "invalid calculator input" });
  }

  try {
    assertSafeExpression(input.expression);
    const value = await withTimeout(() => {
      const root = parse(input.expression);
      return root.evaluate({}); // empty scope — no access to outer variables/functions
    }, TIMEOUT_MS, "calculator");
    return CalculatorOutputSchema.parse({ result: String(value) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "calculator error";
    return CalculatorOutputSchema.parse({ error: message });
  }
}
