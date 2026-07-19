/**
 * CLI wrapper for the golden-session recorder (spec 09 §2).
 * Usage: pnpm --filter @sidebar/service record-demo <sessionId> [outPath]
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { recordSessionToFixture } from "../src/demo/record.js";

const dir = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const [sessionId, outPath] = process.argv.slice(2);
  if (!sessionId) {
    console.error("Usage: record-demo <sessionId> [outPath]");
    process.exit(1);
  }
  const target = outPath ?? path.join(dir, "..", "..", "..", "fixtures", `${sessionId}.jsonl`);
  const count = await recordSessionToFixture(sessionId, target);
  console.log(`[record-demo] wrote ${count} events → ${target}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
