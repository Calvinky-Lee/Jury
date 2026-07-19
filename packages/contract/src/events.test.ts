import { describe, expect, it } from "vitest";
import { ContractEventSchema } from "./events.js";

const fields = { seq: 1, sessionId: "s1", ts: new Date().toISOString() };

describe("contract events", () => {
  it("parses a valid event", () => {
    const event = ContractEventSchema.parse({
      ...fields,
      type: "session_started",
      payload: { dilemma: "should we switch to annual billing?" },
    });
    expect(event.type).toBe("session_started");
  });

  it("fails loudly on payload mismatch", () => {
    expect(() =>
      ContractEventSchema.parse({ ...fields, type: "session_started", payload: { wrong: true } }),
    ).toThrow();
  });

  it("rejects an unknown event type", () => {
    expect(() =>
      ContractEventSchema.parse({ ...fields, type: "not_a_real_event", payload: {} }),
    ).toThrow();
  });
});
