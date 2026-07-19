# 08 — Evaluation & KPIs — P1

Grading has two halves — is the *deliberation* real, and is the *output* useful — plus ops. Targets are pre-registered; changing one requires a logged rationale in this file.

## Benchmark set (`eval/benchmark-dilemmas.json`)

20 fixed dilemmas: 8 business (pricing, hiring, vendor, pivot), 5 career, 3 money/purchase, 3 personal, 1 absurd (charm check). Each entry: `{ id, dilemma, context?, decisionType }`. Frozen once written — additions append, never replace (regression comparability).

## Deliberation-quality KPIs (computed from session data, no judge needed)

| Metric | Definition | Target |
|---|---|---|
| Council diversity | `baselineRatio` from `casting_done` | ≥ 1.3× on every benchmark dilemma |
| Genuine-dissent rate | % sessions with ≥2 distinct `stance.recommendation` values before rebuttal (string-normalized, judge-assisted equivalence check) | ≥ 75% |
| Stance-update rate | `stance_updated` events / total rebuttals | 10–40% band (0% = theater; >40% = sycophancy) |

## Output-quality KPIs (LLM judge — `claude-opus-4-8`, temperature 0, rubric prompts in `eval/rubrics/`)

| Metric | Rubric core | Target |
|---|---|---|
| Verdict fidelity (1–5) | Does the ruling honestly reflect the vote split? Is the dissent present, correctly attributed, and steelmanned (would the dissenter endorse the summary)? | mean ≥ 4.0 |
| Actionability (1–5) | Concrete recommendation? Conditions attached? `whatWouldChangeOurMind` items testable? | mean ≥ 4.0 |
| Groundedness | % of jurors per session citing ≥1 real `tool_result` in their statement | ≥ 50% |

Judge rules: sees full transcript + verdict, never the KPI targets; one score + one-sentence justification per metric; justifications are logged (they're the debugging signal).

## Ops KPIs (from `OpsMetrics` in `session_done`, captured by P4)

| Metric | Target |
|---|---|
| Time to first `persona_cast` | < 5s |
| Time to first `statement_delta` | < 10s |
| `verdict_done` (p90) | < 90s |
| Completion rate (no recusals) | ≥ 95% |
| Cost per session | < $0.50 hard cap |

## Harness (`eval/run-eval.ts`)

1. Run all 20 benchmark dilemmas through the real pipeline (serially or 2-wide — respect rate limits).
2. Compute deliberation + ops metrics from the event logs; run the judge on each transcript.
3. Emit `eval/runs/<timestamp>.json`: per-dilemma scores + aggregates + config snapshot (prompts hash, λ, model tiers).
4. Print a delta table vs. the previous run — this is the prompt regression suite. **Run before every integration checkpoint and before the demo freeze.**

Cost per full run ≈ 20 sessions ≈ $10 ceiling — cheap enough to run after every meaningful prompt change.
