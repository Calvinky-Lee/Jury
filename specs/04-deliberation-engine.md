# 04 — Deliberation Engine (the Chair) — P1

## State machine

```
created → intake → casting → statements → rebuttal → verdict → done
                       ↘ (any phase, fatal error) → failed
```

- Transitions are explicit functions; each emits its phase's events through the emitter (spec 02) and persists status to `sessions.status`.
- **Non-fatal degradation:** a juror timeout/error in `statements` or `rebuttal` emits `agent_recused` and continues with the remaining jurors (minimum 2; below that ⇒ fatal `error`).
- The state machine is a plain data-first TS module in `chair/state-machine.ts` — no framework.

## Model tiers

| Role | Model | Rationale |
|---|---|---|
| Intake, situation briefs | `claude-sonnet-5` | structured extraction, cheap |
| Jurors (statements + rebuttals) | `claude-sonnet-5` | 4× parallel × 2 phases — speed and cost dominate |
| Verdict | `claude-opus-4-8` | the highest-skill prompt; one call per session justifies the tier |

Upgrade/downgrade is a per-role constant in one config file. The $0.50/session cap (spec 09) is checked against running token usage; breach ⇒ kill-switch `error` event.

## Prompts (all in `chair/prompts/`, each a typed function → messages array)

### 1. `intake.ts`
- **Input:** raw dilemma + optional context.
- **Output (structured):** `{ summary, axesOfTension: string[2-4], decisionType }`.
- Axes must be *tensions* ("job security vs. growth ceiling"), never generic ("pros vs cons"). Acceptance: ≥18/20 benchmark dilemmas produce non-trivial axes.

### 2. `brief.ts` — situation brief
- **Input:** one cast persona (full record) + parsed dilemma.
- **Output:** ≤120-word brief that maps the persona's values/biases onto THIS dilemma. Must not contradict or dilute the core identity — the persona argues *from* its values, specialized, not replaced.

### 3. `statement.ts` — opening statement (per juror, parallel)
- **System prompt assembled from:** persona identity + stance profile + situation brief + voice direction + tool-use guidance.
- **Tool-use guidance:** "Search or calculate when a verifiable fact would strengthen your argument; max 3 tool iterations; cite what you found." Tools per spec 06.
- **Output:** streamed prose in-voice, then a structured `Stance` (contract). Implementation shape: tool-runner loop with a final forced structured output.
- Length budget: 120–200 words of prose. Personality lives in word choice, not length.

### 4. `rebuttal.ts` — one round (per juror, parallel)
- **Context packing:** the juror's own statement + the other three jurors' `{name, archetype, stance, fullText}`. No tool access in rebuttals (keeps the round fast; facts were for openings).
- **Instruction:** address the strongest opposing argument by name and quote; you MAY update your stance — do so only if genuinely moved (sycophancy warning in-prompt).
- **Output:** streamed rebuttal + final `Stance` (same or updated → `stance_updated` event when `recommendation` changes).

### 5. `verdict.ts` — **built first, against hand-authored fake stances**
- **Input:** parsed dilemma + all four post-rebuttal stances + statement/rebuttal texts.
- **Output:** `Verdict` (contract) + `briefMd` (the exportable decision brief: dilemma, jury, vote, ruling, dissent, conditions — ~1 page of Markdown).
- **Hard requirements enforced by prompt + schema:** vote split derived from actual stances (not invented); when not unanimous, `dissent` is non-null and *steelmanned*; `whatWouldChangeOurMind` items are concrete and testable ("if churn data shows >3% monthly" — not "if circumstances change").
- Acceptance test (pre-pipeline): given 4 fabricated stances with a 3–1 split, the verdict names the dissenter, states their position fairly, and produces non-generic conditions.

## Orchestration (`chair/orchestrator.ts`)

- Statements and rebuttals: `Promise.allSettled` over 4 juror runs; each run wrapped in a 45s `AbortController` timeout; rejection/timeout → `agent_recused`.
- Streaming: each juror run receives an `emit(event)` callback; the emitter serializes (assigns `seq`, persists, fans out to SSE). Interleaved deltas from parallel jurors are expected and correct — the UI demuxes by `personaId`.
- The orchestrator consumes P2's casting API (spec 05 §API) and P4's tool implementations (spec 06); it imports neither module's internals.

## Interface provided to P4

```ts
runDeliberation(sessionId: string, dilemma: string, context: string | undefined,
                emit: (e: Event) => Promise<void>): Promise<void>
```

One call per session; all effects flow through `emit` and the DB writes owned by the emitter.
