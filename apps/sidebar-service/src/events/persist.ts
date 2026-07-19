import type { ContractEvent, SessionStatus, Stance } from "@sidebar/contract";
import {
  castings,
  events as eventsCollection,
  sessions,
  statements,
  verdicts,
} from "../db/collections.js";

/** Append the raw event to the replay log — the one mechanism that powers reconnect,
 *  replay pages, fixtures, and demo mode (spec 03 §Notes). */
export async function persistEvent(event: ContractEvent): Promise<void> {
  const col = await eventsCollection();
  await col.insertOne({
    sessionId: event.sessionId,
    seq: event.seq,
    type: event.type,
    payload: event.payload,
    ts: new Date(event.ts),
  });
  await projectIntoTypedCollections(event);
}

/**
 * Typed collections exist for queries, eval, and replay *pages* (spec 03 §Notes) —
 * `events` alone remains the source of truth for ordering/replay.
 */
async function projectIntoTypedCollections(event: ContractEvent): Promise<void> {
  switch (event.type) {
    case "dilemma_parsed": {
      const col = await sessions();
      await col.updateOne(
        { _id: event.sessionId },
        {
          $set: {
            status: "casting",
            sidebarSize: event.payload.sidebarSize,
          },
        },
      );
      return;
    }
    case "casting_started": {
      await setSessionStatus(event.sessionId, "casting");
      return;
    }
    case "persona_cast": {
      const col = await castings();
      await col.updateOne(
        { sessionId: event.sessionId, seat: event.payload.seat },
        {
          $set: {
            sessionId: event.sessionId,
            personaId: event.payload.member.id,
            seat: event.payload.seat,
            hue: event.payload.member.avatar.hue,
            situationBrief: event.payload.member.situationBrief ?? "",
            mmrScore: event.payload.member.mmrScore,
            diversityScore: event.payload.runningDiversityScore,
          },
        },
        { upsert: true },
      );
      return;
    }
    case "casting_done": {
      await setSessionStatus(event.sessionId, "statements");
      return;
    }
    case "statement_done": {
      await upsertStatement(event.sessionId, event.payload.personaId, "opening", {
        stance: event.payload.stance,
        text: event.payload.fullText,
      });
      await setSessionStatus(event.sessionId, "rebuttal");
      return;
    }
    case "rebuttal_done": {
      await upsertStatement(event.sessionId, event.payload.personaId, "rebuttal", {
        text: event.payload.fullText,
      });
      return;
    }
    case "closing_done": {
      await upsertStatement(event.sessionId, event.payload.personaId, "closing", {
        stance: event.payload.finalStance,
        text: event.payload.fullText,
      });
      await setSessionStatus(event.sessionId, "verdict");
      return;
    }
    case "verdict_done": {
      const col = await verdicts();
      await col.updateOne(
        { sessionId: event.sessionId },
        {
          $set: {
            sessionId: event.sessionId,
            verdict: event.payload.verdict,
            briefMd: event.payload.briefMd,
          },
        },
        { upsert: true },
      );
      return;
    }
    case "session_done": {
      await setSessionStatus(event.sessionId, "done");
      return;
    }
    case "error": {
      if (event.payload.fatal) await setSessionStatus(event.sessionId, "failed");
      return;
    }
    default:
      return;
  }
}

async function setSessionStatus(sessionId: string, status: SessionStatus): Promise<void> {
  const col = await sessions();
  await col.updateOne({ _id: sessionId }, { $set: { status } });
}

async function upsertStatement(
  sessionId: string,
  personaId: string,
  phase: "opening" | "rebuttal" | "closing",
  fields: { stance?: Stance; text: string },
): Promise<void> {
  const col = await statements();
  await col.updateOne(
    { sessionId, personaId, phase },
    { $set: { sessionId, personaId, phase, toolCalls: [], ...fields } },
    { upsert: true },
  );
}
