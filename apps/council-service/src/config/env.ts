import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
// One `.env` at the repo root, loaded by both apps (spec 09) — resolved relative to this
// file rather than `process.cwd()`, since `pnpm --filter` runs with cwd set to the package.
config({ path: path.join(dir, "..", "..", "..", "..", ".env") });

function optional(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

function requiredForLiveMode(name: string): string | undefined {
  // Not thrown eagerly: demo mode and unit tests must run without real keys.
  return optional(name);
}

export const env = {
  geminiApiKey: requiredForLiveMode("GEMINI_API_KEY"),
  voyageApiKey: requiredForLiveMode("VOYAGE_API_KEY"),
  mongodbUri: requiredForLiveMode("MONGODB_URI"),
  councilServiceToken: optional("COUNCIL_SERVICE_TOKEN"),
  tavilyApiKey: optional("TAVILY_API_KEY"),
  costCapUsd: Number(optional("COST_CAP_USD") ?? "0.50"),
  demoMode: optional("DEMO_MODE") === "1",
  port: Number(optional("PORT") ?? "8787"),
  corsOrigin: optional("WEB_ORIGIN") ?? "http://localhost:3000",
};

export function assertLiveModeConfigured(): void {
  const missing = [
    ["GEMINI_API_KEY", env.geminiApiKey],
    ["MONGODB_URI", env.mongodbUri],
  ].filter(([, v]) => !v);
  if (missing.length > 0) {
    throw new Error(
      `Missing required env vars for a live session: ${missing.map(([k]) => k).join(", ")}. ` +
        `Set them in .env, or run with DEMO_MODE=1 / pnpm demo.`,
    );
  }
}
