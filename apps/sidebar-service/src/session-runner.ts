import { randomUUID } from "node:crypto";
import { sessions } from "./db/collections.js";
import { createEmitter } from "./events/emitter.js";
import { runDeliberation } from "./chair/index.js";
import { buildLiveDeliberationClients } from "./live-deps.js";
import { replayFixtureThroughEmitter } from "./demo/replay-fixture.js";
import { assertLiveModeConfigured, env } from "./config/env.js";

/** 3 concurrent sessions max; excess returns 429 (spec 09 §6 concurrency cap). */
export const MAX_CONCURRENT_SESSIONS = 3;
const activeSessions = new Set<string>();

export function atConcurrencyCap(): boolean {
  return activeSessions.size >= MAX_CONCURRENT_SESSIONS;
}

/** Thrown by `startSession` when the concurrency cap is already full. */
export class ConcurrencyCapError extends Error {}

export async function startSession(
  dilemma: string,
  context: string | undefined,
  demo: boolean,
): Promise<string> {
  // Check-and-reserve in one synchronous step (no `await` between them) — this
  // is the only way to close the race: two concurrent calls can't interleave
  // between a check and a Set insert that have no suspension point between
  // them, whereas checking here and only inserting after later `await`s (the
  // DB insert below) lets N simultaneous requests all see capacity free before
  // any of them has registered, defeating the cap entirely.
  if (activeSessions.size >= MAX_CONCURRENT_SESSIONS) {
    throw new ConcurrencyCapError("the sidebar is in session — try again shortly");
  }
  const id = randomUUID();
  activeSessions.add(id);

  try {
    const col = await sessions();
    await col.insertOne({
      _id: id,
      dilemma,
      context,
      sidebarSize: 0,
      status: "created",
      createdAt: new Date(),
    });

    if (!demo) assertLiveModeConfigured();
  } catch (err) {
    activeSessions.delete(id); // release the reservation — this session never started
    throw err;
  }

  const emit = await createEmitter(id);
  const run = demo
    ? replayFixtureThroughEmitter(emit, { speed: env.demoSpeed })
    : (() => {
        const { modelClient, verdictModelClient, castingProvider, toolExecutor, emitter, costTracker } =
          buildLiveDeliberationClients(env.geminiApiKey!, emit, env.costCapUsd);
        return runDeliberation(id, dilemma, context, {
          modelClient,
          verdictModelClient,
          castingProvider,
          toolExecutor,
          emitter,
          costTracker,
        });
      })();

  run
    .catch(async (err) => {
      console.error(`[session ${id}] failed`, err);
      try {
        await emit({
          type: "error",
          payload: {
            message: err instanceof Error ? err.message : String(err),
            fatal: true,
          },
        });
      } catch {
        // already failing — best effort only
      }
    })
    .finally(() => {
      activeSessions.delete(id);
    });

  return id;
}
