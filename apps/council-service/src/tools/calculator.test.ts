import { describe, expect, it } from "vitest";
import { runCalculator } from "./calculator.js";

describe("calculator tool", () => {
  it("evaluates a basic expression", async () => {
    const out = await runCalculator({ expression: "12 * (3 + 4)" });
    expect(out).toEqual({ result: "84" });
  });

  it("rejects assignment", async () => {
    const out = await runCalculator({ expression: "x = 5" });
    expect("error" in out).toBe(true);
  });

  it("rejects function definition", async () => {
    const out = await runCalculator({ expression: "f(x) = x^2" });
    expect("error" in out).toBe(true);
  });

  it("rejects oversized expressions", async () => {
    const out = await runCalculator({ expression: "1+".repeat(300) + "1" });
    expect("error" in out).toBe(true);
  });

  it("returns an error object, never throws, on bad input", async () => {
    const out = await runCalculator({ expression: "not(a(valid" });
    expect("error" in out).toBe(true);
  });
});
