// Spec 08 benchmark harness. Run with: npx tsx eval/run-eval.ts
//
// A real run needs TWO things this repo doesn't have yet:
//   1. GEMINI_API_KEY (a fake client can't demonstrate genuine dissent — it
//      returns the same canned response regardless of persona).
//   2. A real CastingProvider (P2, spec 05) — without it there's no live
//      4-persona council to deliberate with, key or no key.
//
// Until both exist, this script reports what's missing and exits cleanly.
// The harness logic itself (metrics.ts, the rubric prompt builders, the
// schemas) is unit-tested independently — see metrics.test.ts and
// rubrics/rubrics.test.ts.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface BenchmarkDilemma {
  id: string;
  dilemma: string;
  context?: string;
  decisionType: string;
}

function loadBenchmarkSet(): BenchmarkDilemma[] {
  const raw = readFileSync(path.join(__dirname, 'benchmark-dilemmas.json'), 'utf-8');
  return JSON.parse(raw) as BenchmarkDilemma[];
}

async function main() {
  const benchmarkSet = loadBenchmarkSet();
  console.log(`Loaded ${benchmarkSet.length} benchmark dilemmas.`);

  const missing: string[] = [];
  if (!process.env.GEMINI_API_KEY) missing.push('GEMINI_API_KEY (no real model calls possible)');
  // No real CastingProvider wired yet — P2's castCouncil() doesn't exist. When
  // it lands, import it here and pass it through DeliberationDeps below.
  missing.push('a real CastingProvider (P2, spec 05) — not wired yet');

  console.log('Cannot run the live benchmark yet:');
  for (const reason of missing) console.log(`  - ${reason}`);
  console.log('Skipping — exiting 0. See metrics.test.ts and rubrics/rubrics.test.ts for the tested plumbing.');
}

main();
