import { ContractEventSchema, type ContractEvent } from "@sidebar/contract";
import { events as eventsCollection } from "../db/collections.js";
import { persistEvent } from "./persist.js";
import { publish } from "./bus.js";

/** Distributes over the ContractEvent union so each variant's `type` still narrows
 *  its `payload` — plain `Omit` does not distribute over a union of object types. */
type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;

export type EmitInput = DistributiveOmit<ContractEvent, "seq" | "sessionId" | "ts">;

/** The interface P1's `runDeliberation` is handed — one call per emitted event. */
export type Emit = (input: EmitInput) => Promise<void>;

/**
 * Per-session emitter: assigns the monotonic `seq`, validates the event against the
 * contract schema (parse failures fail loudly), persists it, and fans it out to any
 * live SSE subscribers (spec 02 §Guarantees, spec 04 §Orchestration).
 */
export async function createEmitter(sessionId: string): Promise<Emit> {
  let nextSeq = await recoverNextSeq(sessionId);

  return async function emit(input: EmitInput): Promise<void> {
    const seq = nextSeq++;
    const event = ContractEventSchema.parse({
      seq,
      sessionId,
      ts: new Date().toISOString(),
      ...input,
    }) as ContractEvent;
    await persistEvent(event);
    publish(event);
  };
}

async function recoverNextSeq(sessionId: string): Promise<number> {
  const col = await eventsCollection();
  const last = await col.find({ sessionId }).sort({ seq: -1 }).limit(1).next();
  return last ? last.seq + 1 : 0;
}
