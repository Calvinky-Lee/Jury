import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import {
  CreateSessionRequestSchema,
  type SessionSummary,
  type BlobHue,
} from "@sidebar/contract";
import { sessions, castings, verdicts } from "../db/collections.js";
import { getEventsSince } from "../events/replay.js";
import { subscribe } from "../events/bus.js";
import { startSession, ConcurrencyCapError } from "../session-runner.js";
import { env } from "../config/env.js";

export const sessionRoutes = new Hono();

sessionRoutes.post("/sessions", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = CreateSessionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid request", details: parsed.error.flatten() }, 400);
  }

  const demo = parsed.data.demo ?? env.demoMode;
  try {
    const id = await startSession(parsed.data.dilemma, parsed.data.context, demo);
    return c.json({ id }, 201);
  } catch (err) {
    if (err instanceof ConcurrencyCapError) {
      return c.json({ error: "the sidebar is in session — try again shortly" }, 429);
    }
    throw err;
  }
});

sessionRoutes.get("/sessions", async (c) => {
  const q = c.req.query("q");
  const limit = Math.min(Number(c.req.query("limit") ?? "25"), 100);

  const col = await sessions();
  const filter = q ? { $text: { $search: q } } : {};
  const docs = await col.find(filter).sort({ createdAt: -1 }).limit(limit).toArray();

  const items: SessionSummary[] = await Promise.all(
    docs.map(async (doc) => {
      const castingCol = await castings();
      const verdictCol = await verdicts();
      const seats = await castingCol.find({ sessionId: doc._id }).sort({ seat: 1 }).toArray();
      const verdict = await verdictCol.findOne({ sessionId: doc._id });
      return {
        id: doc._id,
        dilemma: doc.dilemma,
        createdAt: doc.createdAt.toISOString(),
        status: doc.status,
        orb: {
          hues: seats.map((s) => s.hue) as BlobHue[],
          voteSplit: verdict?.verdict.voteSplit,
        },
      };
    }),
  );

  return c.json({ sessions: items });
});

sessionRoutes.get("/sessions/:id", async (c) => {
  const id = c.req.param("id");
  const col = await sessions();
  const doc = await col.findOne({ _id: id });
  if (!doc) return c.json({ error: "not found" }, 404);

  return c.json({
    id: doc._id,
    dilemma: doc.dilemma,
    context: doc.context,
    sidebarSize: doc.sidebarSize || undefined,
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
  });
});

sessionRoutes.get("/sessions/:id/events", async (c) => {
  const id = c.req.param("id");
  const events = await getEventsSince(id, -1);
  return c.json({ events });
});

sessionRoutes.get("/sessions/:id/stream", (c) => {
  const id = c.req.param("id");
  const lastEventId = c.req.header("last-event-id");
  const afterSeq = lastEventId ? Number(lastEventId) : -1;

  return streamSSE(c, async (stream) => {
    const backlog = await getEventsSince(id, afterSeq);
    for (const event of backlog) {
      await stream.writeSSE({ id: String(event.seq), event: event.type, data: JSON.stringify(event) });
    }

    let closed = false;
    const unsubscribe = subscribe(id, (event) => {
      if (closed) return;
      void stream.writeSSE({ id: String(event.seq), event: event.type, data: JSON.stringify(event) });
    });

    await new Promise<void>((resolve) => {
      stream.onAbort(() => {
        closed = true;
        unsubscribe();
        resolve();
      });
    });
  });
});
