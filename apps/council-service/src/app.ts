import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./config/env.js";
import { bearerAuth } from "./auth.js";
import { sessionRoutes } from "./routes/sessions.js";

/**
 * The Hono app, with no side effects on import (no `serve()` call) — this is
 * what `index.ts` binds to a real port, and what e2e tests exercise directly
 * via `app.request(...)` without ever opening a socket.
 */
export const app = new Hono();

app.use(
  "*",
  cors({
    origin: env.corsOrigin,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Last-Event-ID"],
  }),
);
app.use("*", bearerAuth);

app.get("/health", (c) => c.json({ ok: true, demoMode: env.demoMode }));
app.route("/", sessionRoutes);
