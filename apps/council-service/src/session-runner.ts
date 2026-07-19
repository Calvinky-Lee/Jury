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

export async function startSession(
  dilemma: string,
  context: string | undefined,
  demo: boolean,
): Promise<string> {
  const id = randomUUID();
  const col = await sessions();
  await col.insertOne({
    _id: id,
    dilemma,
    context,
    councilSize: 0,
    status: "created",
    createdAt: new Date(),
  });

  if (!demo) assertLiveModeConfigured();

  activeSessions.add(id);
  const emit = await createEmitter(id);
  const run = demo
    ? replayFixtureThroughEmitter(emit)
    : (() => {
        const { modelClient, verdictModelClient, castingProvider, toolExecutor, emitter } =
          buildLiveDeliberationClients(env.geminiApiKey!, emit, env.costCapUsd);
        return runDeliberation(id, dilemma, context, {
          modelClient,
          verdictModelClient,
          castingProvider,
          toolExecutor,
          emitter,
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
