# P1 — Deliberation Engine (the Chair)

**Mission:** Own every prompt and the orchestration logic. You are responsible for the product thesis surviving contact with the model: the Council must *actually disagree*, and the verdict must *preserve* that disagreement.

**Spec:** `../specs/00-overview.md` (§4 pipeline, §9 KPIs)

## What you provide / what you consume

- **Provide:** the deliberation runner — a function/service P4's council service invokes per session, emitting contract events.
- **Consume:** P2's casting API (`castCouncil(parsedDilemma, size) → N personas + diversity score`), P4's tool interfaces (web search, calculator) and event emitter.
- **Contract ownership:** stance, verdict, and phase-transition schemas in `packages/contract` (co-authored with P4 at hour 0).

## Ordered tasks

1. **Hour 0 — co-sign the event contract.** Your stake: stance schema `{recommendation, confidence, key_reasons}`, verdict schema `{ruling, solution_plan, vote_split, majority_reasoning, dissent: {who, position, why_it_matters}, confidence, what_would_change_our_mind}`, phase enum (incl. `closing`), `stance_updated`, `closing_*`, and `agent_recused` events.
2. **Verdict prompt — FIRST, not last.** Write it against hand-authored fake statements before any pipeline exists. The verdict is two products: the `ruling` (the Chair's direct personal answer) and the `solutionPlan` (3–6 concrete steps *devised by mixing the strongest elements across members* — synthesis, not side-picking; every step attributable to a member's argument). Acceptance: given 4 fabricated stances with a 3–1 split, the verdict names the dissenter, states their position fairly, includes a non-generic "what would change our mind," and a solution plan that demonstrably borrows from more than one member. If the verdict blands out disagreement, nothing else matters.
3. **Deliberation state machine.** Phases (intake → casting → statements → rebuttal → closing → verdict), transitions, failure states. Typed in the contract package; documented as a diagram in this folder.
4. **Intake prompt.** Dilemma parsing + axes-of-tension extraction + **council sizing** (N = one member per axis + one generalist, clamped 3–6, default 4), structured output. Acceptance: on the 20-dilemma benchmark set, axes are non-trivial (not "pros vs cons") for ≥18.
5. **Situation-brief generation.** Takes P2's cast persona (core identity) + parsed dilemma → a brief that specializes the persona without erasing its identity. Acceptance: brief never contradicts the persona's core values.
6. **Opening-statement agent template.** Persona injection + stance schema + tool-use guidance (when to search, when to calculate, max 3 tool iterations). Gemini Flash tier; grounding + `responseSchema` interaction per spec 06.
7. **Rebuttal round.** Context packing (each agent sees the other three stances + statements), rebuttal prompt, stance-update rules. Emit `stance_updated` when a recommendation changes.
8. **Closing-pitch prompt.** Each member addresses the Chair directly: ≤60 words, final recommendation + single strongest reason; stance LOCKED after closing. Tiny parallel calls, 15s timeout (spec 04).
9. **Orchestration loop.** Parallel execution of the N agents across statements/rebuttals/closings, 45s hard timeout each (closings 15s), recusal path (proceed with 3, Chair notes it). Integrates P4's emitter so every step streams.
10. **Eval harness + LLM-judge rubrics (§9).** Fixed 20-dilemma benchmark spanning decision types; judge rubrics for verdict fidelity (≥4.0) and actionability (≥4.0); runnable on demand; results logged per run. This doubles as the prompt regression suite — run it before every checkpoint.
11. **Model-tier + rate-limit decisions.** Pin exact Gemini model IDs at hour 0 (Flash for members, Pro for verdict — spec 04); verify free-tier RPM/TPM against ~20 requests/session and design the backoff. Document choices in the spec.

## Checkpoints

- **Hour ~6:** verdict prompt passing its fake-stance acceptance test; state machine typed.
- **Hour ~12:** a real skeleton deliberation (even 2 personas, no rebuttal) flows end-to-end through P4's service.
- **After:** eval-driven prompt tuning against KPIs — genuine-dissent rate ≥75%, stance-update rate in the 10–40% band.

## Definition of done

A benchmark run where the eval harness reports all §9 deliberation-quality and output-quality targets met, and a live session streams every phase without a schema violation.
