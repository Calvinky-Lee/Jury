import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { env } from "./config/env.js";
import { bearerAuth } from "./auth.js";
import { sessionRoutes } from "./routes/sessions.js";

const app = new Hono();

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

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(
    `[council-service] listening on http://localhost:${info.port}${env.demoMode ? " (DEMO_MODE=1)" : ""}`,
  );
});
