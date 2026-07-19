import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ContractEventSchema, type ContractEvent } from "@sidebar/contract";
import type { Emit, EmitInput } from "../events/emitter.js";

const dir = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_FIXTURE_PATH = path.join(
  dir,
  "..",
  "..",
  "..",
  "..",
  "fixtures",
  "golden-session.jsonl",
);

/** Parses the fixture's `.jsonl` through the real contract schema — a malformed fixture
 *  fails loudly here rather than confusing the frontend mid-demo. */
export async function loadFixtureEvents(
  fixturePath: string = DEFAULT_FIXTURE_PATH,
): Promise<ContractEvent[]> {
  const raw = await readFile(fixturePath, "utf-8");
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ContractEventSchema.parse(JSON.parse(line)));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

/**
 * Streams a recorded fixture through the SAME emitter a live session uses (spec 09
 * §Demo mode) — same `seq` assignment, same persistence, same SSE fan-out. Demo mode is
 * "indistinguishable from live" because it IS the live path, just fed canned payloads.
 */
export async function replayFixtureThroughEmitter(
  emit: Emit,
  { speed = 1, fixturePath = DEFAULT_FIXTURE_PATH }: { speed?: number; fixturePath?: string } = {},
): Promise<void> {
  const events = await loadFixtureEvents(fixturePath);
  if (events.length === 0) return;

  const firstTs = new Date(events[0]!.ts).getTime();
  let previousOffset = 0;

  for (const event of events) {
    const offset = (new Date(event.ts).getTime() - firstTs) / speed;
    await sleep(offset - previousOffset);
    previousOffset = offset;
    await emit({ type: event.type, payload: event.payload } as EmitInput);
  }
}
