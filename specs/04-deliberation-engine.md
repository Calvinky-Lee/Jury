# 04 — Deliberation Engine (the Chair) — P1

## State machine

```
created → intake → casting → statements → rebuttal → closing → verdict → done
                       ↘ (any phase, fatal error) → failed
```

- Transitions are explicit functions; each emits its phase's events through the emitter (spec 02) and persists status to `sessions.status`.
- **Non-fatal degradation:** a member timeout/error in `statements` or `rebuttal` emits `agent_recused` and continues with the remaining members (minimum 2; below that ⇒ fatal `error`).
- The state machine is a plain data-first TS module in `chair/state-machine.ts` — no framework.

## Models — multi-model council with capability routing

**Thesis upgrade: member diversity comes from personas AND models.** Different LLMs argue differently — putting council members on different models adds behavioral diversity a persona prompt can't fake, and each seat gets the model *measured* best for what that seat needs.

### Model registry (`chair/models.ts`)

One config file listing every usable model behind a common adapter interface (adapters are P4's, spec 01):

```ts
ModelEntry {
  id: string                  // e.g. 'gemini-3-flash', 'claude-sonnet-5', 'gpt-5-mini' — pinned at hour 0
  provider: 'google' | 'anthropic' | 'openai'
  capabilities: {             // 1–5 scores, produced by the capability benchmark (spec 08) — never hand-typed
    empathy: number           // emotional intelligence: reading stakes, feelings, human context
    rigor: number             // analytical/quantitative reasoning
    creativity: number        // novel options, reframing
    groundedness: number      // uses/cites real facts well
    voiceFidelity: number     // stays in persona without breaking character
  }
  supportsNativeSearch: boolean   // Gemini grounding; others search via Tavily (spec 06)
  costTier: 'free' | 'cheap' | 'premium'
}
```

Only models whose API key is present in the env are enabled (spec 09). Minimum viable set: two Gemini tiers + one non-Google model — the multi-model claim requires ≥2 providers.

### Assignment (Chair-side, at casting)

1. Intake additionally outputs `capabilityWeights` — how much this dilemma demands each capability (an emotionally charged dilemma weights `empathy` up; a pricing decision weights `rigor`).
2. For each cast persona, the Chair derives the seat's capability emphasis from its archetype/decision style, blends it with the dilemma's weights, and picks the highest-scoring enabled model from the registry.
3. **Provider-spread constraint:** when scores are within 0.3, prefer the assignment that keeps ≥2 providers on the council — model diversity is part of the product.
4. The assignment is logged per seat (`castings.modelId`), emitted in `persona_cast` (`member.model`), and shown in the UI as a model chip — transparency is part of the demo.

### Fixed roles

| Role | Model | Rationale |
|---|---|---|
| Intake, situation briefs | cheapest fast tier (Gemini Flash class) | structured extraction, cheap/free |
| Members | **routed per seat** (above) | the whole point |
| Verdict + LLM judge | strongest reasoning model in the registry | highest-skill prompt; one call per session |

Exact model IDs verified at hour 0 and pinned in the registry. Free-tier rate limits (per provider) are the real constraint — the orchestrator serializes phases per provider on 429s. The $0.50/session cap (spec 09) stays as the kill-switch on paid keys.

## Prompts (all in `chair/prompts/`, each a typed function → messages array)

### 1. `intake.ts`
- **Input:** raw dilemma + optional context.
- **Output (structured):** `{ summary, axesOfTension: string[2-6], decisionType, councilSize, capabilityWeights }`. Council size = one member per axis of tension plus one generalist, clamped 3–6 (default 4) — the council is as big as the case demands, no bigger. `capabilityWeights` = the dilemma's demand for each capability dimension (drives model routing, §Models).
- Axes must be *tensions* ("job security vs. growth ceiling"), never generic ("pros vs cons"). Acceptance: ≥18/20 benchmark dilemmas produce non-trivial axes.

### 2. `brief.ts` — situation brief
- **Input:** one cast persona (full record) + parsed dilemma.
- **Output:** ≤120-word brief that maps the persona's values/biases onto THIS dilemma, **plus `initialRead`** — a ≤140-char first-person distillation ("Risky. I'd want churn data before touching pricing.") emitted in `persona_cast` as the member's first thinking bubble. Must not contradict or dilute the core identity — the persona argues *from* its values, specialized, not replaced.

**Bubble rule (applies to prompts 3–5):** every member phase's structured output includes a `bubble` field — a first-person, in-voice summary of that phase's position in ≤140 characters. The UI renders bubbles at a fixed size; the model writes to fit, the schema enforces the cap (an over-length `bubble` regenerates that field only, never the statement).

### 3. `statement.ts` — opening statement (per member, parallel)
- **System prompt assembled from:** persona identity + stance profile + situation brief + voice direction + tool-use guidance.
- **Tool-use guidance:** "Search or calculate when a verifiable fact would strengthen your argument; max 3 tool iterations; cite what you found." Tools per spec 06.
- **Output:** streamed prose in-voice, then a structured `Stance` (contract). Implementation shape: Gemini function-calling/grounding loop with a final `responseSchema`-forced structured output.
- Length budget: 120–200 words of prose. Personality lives in word choice, not length.

### 4. `rebuttal.ts` — one round (per member, parallel)
- **Context packing:** the member's own statement + the other members' `{name, archetype, stance, fullText}`. No tool access in rebuttals (keeps the round fast; facts were for openings).
- **Instruction:** address the strongest opposing argument by name and quote; you MAY update your stance — do so only if genuinely moved (sycophancy warning in-prompt).
- **Output:** streamed rebuttal + final `Stance` (same or updated → `stance_updated` event when `recommendation` changes).

### 5. `closing.ts` — closing pitch (per member, parallel)
- **Input:** the member's own post-rebuttal stance + a one-line reminder of the strongest opposing point.
- **Instruction:** address the Chair directly; ≤60 words; state your final recommendation and the single strongest reason it should win. Stance is **locked** after closing (`closing_done.finalStance`).
- No tools; tiny fast calls (~2–3s). This is the "pitch your solution to the orchestrator" beat the UI renders as members turning to the Chair.

### 6. `verdict.ts` — **built first, against hand-authored fake stances**
- **Input:** parsed dilemma + all locked final stances + statement/rebuttal/closing texts.
- **Output:** `Verdict` (contract) + `briefMd` (the exportable decision brief: dilemma, council, vote, ruling, solution plan, dissent, conditions — ~1 page of Markdown).
- **The verdict is two distinct products, and the prompt treats them separately:**
  1. `ruling` — the Chair's direct, personal answer to the user's question (1–3 sentences, no hedging).
  2. `solutionPlan` — 3–6 concrete steps: a *devised* optimal solution that mixes the strongest elements across members (e.g., the Gambler's move with the Actuary's safeguard attached) — synthesis, not side-picking.
- **Hard requirements enforced by prompt + schema:** vote split derived from actual locked stances (not invented); when not unanimous, `dissent` is non-null and *steelmanned*; `whatWouldChangeOurMind` items are concrete and testable ("if churn data shows >3% monthly" — not "if circumstances change"); every `solutionPlan` step is attributable to at least one member's argument.
- Acceptance test (pre-pipeline): given 4 fabricated stances with a 3–1 split, the verdict names the dissenter, states their position fairly, produces non-generic conditions, and produces a solution plan that demonstrably borrows from more than one member.

## Orchestration (`chair/orchestrator.ts`)

- Statements, rebuttals, and closings: `Promise.allSettled` over the N member runs; statements/rebuttals wrapped in a 45s `AbortController` timeout (closings: 15s); rejection/timeout → `agent_recused`.
- Streaming: each member run receives an `emit(event)` callback; the emitter serializes (assigns `seq`, persists, fans out to SSE). Interleaved deltas from parallel members are expected and correct — the UI demuxes by `personaId`.
- The orchestrator consumes P2's casting API (spec 05 §API) and P4's tool implementations (spec 06); it imports neither module's internals.

## Interface provided to P4

```ts
runDeliberation(sessionId: string, dilemma: string, context: string | undefined,
                emit: (e: Event) => Promise<void>): Promise<void>
```

One call per session; all effects flow through `emit` and the DB writes owned by the emitter.
