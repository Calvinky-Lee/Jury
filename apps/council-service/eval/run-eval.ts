// Spec 08 benchmark harness. Run with: pnpm --filter @council/service eval
//
// A live run needs three things: GEMINI_API_KEY (model calls), VOYAGE_API_KEY
// (embedding the dilemma for casting), and MONGODB_URI with a seeded persona
// library (P2, spec 05 — casting fails on an empty `personas` collection).
// Until all three are present, this reports what's missing and exits cleanly.
//
// The harness logic itself (metrics.ts, the rubric prompt builders, the
// schemas) is unit-tested independently — see metrics.test.ts and
// rubrics/rubrics.test.ts. run-eval.test.ts exercises the wiring below
// end-to-end against Fakes, so this file's own plumbing is covered without
// needing real keys either.

import { config } from "dotenv";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GeminiModelClient, type ModelClient } from "../src/chair/model-client.js";
import { MEMBER_MODEL, VERDICT_MODEL } from "../src/chair/model-config.js";
import { InMemoryEmitter, type CastingProvider, type ToolExecutor } from "../src/chair/ports.js";
import { runDeliberation } from "../src/chair/orchestrator.js";
import type { Verdict } from "../src/chair/types.js";
import { RealCastingProvider, RealToolExecutor } from "../src/live-deps.js";
import {
  diversityRatio,
  genuineDissentRate,
  hasGenuineDissent,
  stanceUpdateRate,
  type CastingDoneEventPayload,
  type StatementDoneEventPayload,
} from "./metrics.js";
import { scoreVerdictFidelity } from "./rubrics/verdict-fidelity.js";
import { scoreActionability } from "./rubrics/actionability.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Repo root .env regardless of invocation cwd (same pattern as seed/*.ts).
config({ path: path.join(__dirname, "..", "..", "..", ".env") });

export interface BenchmarkDilemma {
  id: string;
  dilemma: string;
  context?: string;
  decisionType: string;
}

export interface SessionResult {
  id: string;
  dilemma: string;
  diversityRatio: number;
  hadGenuineDissent: boolean;
  stanceUpdateRate: number;
  verdict?: Verdict;
  verdictFidelity?: number;
  actionability?: number;
  error?: string;
}

export interface EvalDeps {
  modelClient: ModelClient;
  verdictModelClient: ModelClient;
  castingProvider: CastingProvider;
  toolExecutor: ToolExecutor;
}

/** Runs one benchmark dilemma through the real orchestrator and computes its
 *  deliberation + output-quality KPIs (spec 08) straight from the emitted events. */
export async function runOneDilemma(entry: BenchmarkDilemma, deps: EvalDeps): Promise<SessionResult> {
  const emitter = new InMemoryEmitter();
  await runDeliberation(entry.id, entry.dilemma, entry.context, { ...deps, emitter });

  const events = emitter.events;
  const errorEvent = events.find((e) => e.type === "error");
  if (errorEvent) {
    const payload = errorEvent.payload as { message: string };
    return {
      id: entry.id,
      dilemma: entry.dilemma,
      diversityRatio: 0,
      hadGenuineDissent: false,
      stanceUpdateRate: 0,
      error: payload.message,
    };
  }

  const castingDone = events.find((e) => e.type === "casting_done")?.payload as
    | CastingDoneEventPayload
    | undefined;
  const statementDones = events
    .filter((e) => e.type === "statement_done")
    .map((e) => e.payload as StatementDoneEventPayload);
  const rebuttalDoneCount = events.filter((e) => e.type === "rebuttal_done").length;
  const stanceUpdatedCount = events.filter((e) => e.type === "stance_updated").length;
  const verdictDone = events.find((e) => e.type === "verdict_done")?.payload as
    | { verdict: Verdict; briefMd: string }
    | undefined;

  const result: SessionResult = {
    id: entry.id,
    dilemma: entry.dilemma,
    diversityRatio: castingDone ? diversityRatio(castingDone) : 0,
    hadGenuineDissent: hasGenuineDissent(statementDones),
    stanceUpdateRate: stanceUpdateRate(stanceUpdatedCount, rebuttalDoneCount),
  };

  if (verdictDone) {
    result.verdict = verdictDone.verdict;
    // Judge sees the full transcript + verdict, never the KPI targets (spec 08).
    const transcript = events
      .filter((e) => e.type === "statement_done" || e.type === "rebuttal_done" || e.type === "closing_done")
      .map((e) => `[${e.type}] ${JSON.stringify(e.payload)}`)
      .join("\n");
    const [fidelity, actionability] = await Promise.all([
      scoreVerdictFidelity(deps.verdictModelClient, transcript, verdictDone.verdict),
      scoreActionability(deps.verdictModelClient, verdictDone.verdict),
    ]);
    result.verdictFidelity = fidelity.score;
    result.actionability = actionability.score;
  }

  return result;
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

export function aggregate(results: SessionResult[]) {
  const succeeded = results.filter((r) => !r.error);
  return {
    sessions: results.length,
    errors: results.length - succeeded.length,
    diversityRatioMean: mean(succeeded.map((r) => r.diversityRatio)),
    genuineDissentRate: genuineDissentRate(succeeded.map((r) => r.hadGenuineDissent)),
    stanceUpdateRateMean: mean(succeeded.map((r) => r.stanceUpdateRate)),
    verdictFidelityMean: mean(succeeded.filter((r) => r.verdictFidelity != null).map((r) => r.verdictFidelity!)),
    actionabilityMean: mean(succeeded.filter((r) => r.actionability != null).map((r) => r.actionability!)),
  };
}

function loadBenchmarkSet(): BenchmarkDilemma[] {
  const raw = readFileSync(path.join(__dirname, "benchmark-dilemmas.json"), "utf-8");
  return JSON.parse(raw) as BenchmarkDilemma[];
}

async function main() {
  const benchmarkSet = loadBenchmarkSet();
  console.log(`Loaded ${benchmarkSet.length} benchmark dilemmas.`);

  const missing: string[] = [];
  if (!process.env.GEMINI_API_KEY) missing.push("GEMINI_API_KEY");
  if (!process.env.VOYAGE_API_KEY) missing.push("VOYAGE_API_KEY (embeds the dilemma for casting)");
  if (!process.env.MONGODB_URI) missing.push("MONGODB_URI (casting + the seeded persona library)");
  if (missing.length > 0) {
    console.log("Cannot run the live benchmark yet — missing:");
    for (const reason of missing) console.log(`  - ${reason}`);
    console.log(
      "Skipping — exiting 0. See metrics.test.ts, rubrics/rubrics.test.ts, and run-eval.test.ts for the tested plumbing.",
    );
    return;
  }

  const results: SessionResult[] = [];
  for (const entry of benchmarkSet) {
    console.log(`Running ${entry.id}: ${entry.dilemma}`);
    try {
      const result = await runOneDilemma(entry, {
        modelClient: new GeminiModelClient(process.env.GEMINI_API_KEY, MEMBER_MODEL),
        verdictModelClient: new GeminiModelClient(process.env.GEMINI_API_KEY, VERDICT_MODEL),
        castingProvider: new RealCastingProvider(),
        toolExecutor: new RealToolExecutor(),
      });
      results.push(result);
      if (result.error) console.log(`  failed: ${result.error}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`  failed: ${message}`);
      results.push({
        id: entry.id,
        dilemma: entry.dilemma,
        diversityRatio: 0,
        hadGenuineDissent: false,
        stanceUpdateRate: 0,
        error: message,
      });
    }
  }

  const summary = aggregate(results);
  console.log("\nAggregate:", summary);

  const runsDir = path.join(__dirname, "runs");
  mkdirSync(runsDir, { recursive: true });
  const outPath = path.join(runsDir, `${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(outPath, JSON.stringify({ timestamp: new Date().toISOString(), summary, results }, null, 2));
  console.log(`Written -> ${outPath}`);
}

// Only run when executed directly (`tsx eval/run-eval.ts`), never as an import
// side effect — run-eval.test.ts imports `runOneDilemma`/`aggregate` from this
// same file, and without this guard that import would also kick off a full
// (potentially paid, real-API) benchmark run every time the test suite runs.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
