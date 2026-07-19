/**
 * Ops KPI summary (spec 08/09 task 9) — reads every `session_done` event's metrics
 * and prints aggregates against the pre-registered targets. Simple logging + a summary
 * script, per spec: P1's eval harness reads the same `events` collection.
 * Usage: pnpm --filter @council/service metrics:summary
 */
import { getDb, closeDb } from "../src/db/client.js";
import type { OpsMetrics } from "@council/contract";

const TARGETS = {
  firstCastMs: 5000,
  firstTokenMs: 10000,
  verdictMs: 90000,
};

async function main() {
  const db = await getDb();
  const docs = await db
    .collection("events")
    .find({ type: "session_done" })
    .sort({ ts: 1 })
    .toArray();

  if (docs.length === 0) {
    console.log("No completed sessions yet.");
    return;
  }

  const metricsList: OpsMetrics[] = docs.map(
    (d) => (d.payload as { metrics: OpsMetrics }).metrics,
  );

  const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
  const p90 = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.9)] ?? sorted[sorted.length - 1] ?? 0;
  };

  const completed = metricsList.filter((m) => m.recusals === 0).length;

  console.log(`Sessions: ${metricsList.length}`);
  console.log(
    `Time to first persona_cast (mean): ${mean(metricsList.map((m) => m.firstCastMs)).toFixed(0)}ms (target < ${TARGETS.firstCastMs}ms)`,
  );
  console.log(
    `Time to first statement token (mean): ${mean(metricsList.map((m) => m.firstTokenMs)).toFixed(0)}ms (target < ${TARGETS.firstTokenMs}ms)`,
  );
  console.log(
    `Verdict latency (p90): ${p90(metricsList.map((m) => m.verdictMs)).toFixed(0)}ms (target < ${TARGETS.verdictMs}ms)`,
  );
  console.log(
    `Completion rate (no recusals): ${((completed / metricsList.length) * 100).toFixed(1)}% (target >= 95%)`,
  );
  console.log(
    `Cost per session (mean): $${mean(metricsList.map((m) => m.totalCostUsd)).toFixed(4)} (hard cap $0.50)`,
  );

  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
