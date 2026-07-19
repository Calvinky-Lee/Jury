import type { ContractEvent } from "@council/contract";
import { events as eventsCollection, type EventDoc } from "../db/collections.js";

function toContractEvent(doc: EventDoc): ContractEvent {
  return {
    seq: doc.seq,
    sessionId: doc.sessionId,
    ts: doc.ts.toISOString(),
    type: doc.type,
    payload: doc.payload,
  } as ContractEvent;
}

/** All events for a session, ordered by `seq`, optionally resuming after `afterSeq`
 *  (the `Last-Event-ID` a reconnecting client sends — spec 02 §Guarantees). */
export async function getEventsSince(
  sessionId: string,
  afterSeq = -1,
): Promise<ContractEvent[]> {
  const col = await eventsCollection();
  const docs = await col
    .find({ sessionId, seq: { $gt: afterSeq } })
    .sort({ seq: 1 })
    .toArray();
  return docs.map(toContractEvent);
}
