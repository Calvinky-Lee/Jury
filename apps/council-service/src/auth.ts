import type { Context, Next } from "hono";
import { env } from "./config/env.js";

/**
 * Bearer token check — off by default locally (spec 09). The middleware exists so
 * hosting this service later is a matter of setting COUNCIL_SERVICE_TOKEN, not writing
 * new auth code.
 */
export async function bearerAuth(c: Context, next: Next) {
  if (!env.councilServiceToken) return next();

  const header = c.req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
  if (token !== env.councilServiceToken) {
    return c.json({ error: "unauthorized" }, 401);
  }
  return next();
}
