import { writeFile } from "node:fs/promises";
import { getEventsSince } from "../events/replay.js";

/** Golden-session recorder (spec 09 §2): dump any finished session's `events` collection
 *  rows to a fixture `.jsonl` file, in order. */
export async function recordSessionToFixture(sessionId: string, outPath: string): Promise<number> {
  const events = await getEventsSince(sessionId, -1);
  if (events.length === 0) {
    throw new Error(`No events found for session ${sessionId}`);
  }
  const lines = events.map((e) => JSON.stringify(e)).join("\n") + "\n";
  await writeFile(outPath, lines);
  return events.length;
}
