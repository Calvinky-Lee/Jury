# The Council

The Council automates the work of getting a well-rounded opinion on a hard decision. You submit a dilemma in plain text. The Chair (an orchestrator agent) reads it, sizes a council of 3 to 6 AI members chosen for maximal relevant disagreement, and runs them through a structured deliberation: opening statements, one round of rebuttal, closing pitches, and a final verdict. The verdict is not an average of opinions. It is a direct ruling, a solution plan synthesized from the strongest points across members, and the dissenting position stated fairly rather than dropped. Finished sessions are saved and replayable.

Built for the Phoebe prize track: AI to Coordinate the Real World.

## How a deliberation works

1. **Intake.** The dilemma is parsed into the real axes of tension it contains (not "pros vs cons") and a council size is chosen.
2. **Casting.** A 4 (default) to 6 member council is selected from a persona library using vector retrieval plus MMR, so the cast is both relevant to the dilemma and measurably diverse.
3. **Opening statements.** Each member argues independently, in character, with optional tool use (search, calculator).
4. **Rebuttal.** Each member responds to the other three and may revise its position if genuinely persuaded.
5. **Closing.** Each member delivers a short final pitch to the Chair. Positions lock.
6. **Verdict.** The Chair rules: a direct answer, a synthesized solution plan, the vote split, the steelmanned dissent, and the conditions that would change the outcome.

Every step streams as a typed event so a client can render the deliberation live or replay it later from storage.

## Repository layout

| Path | Owns | Description |
|---|---|---|
| `apps/web` | Frontend | Next.js UI: intake form, live session view, replay, memory orb field |
| `apps/council-service` | Backend | Hono service: the Chair's prompts and orchestration, persona casting, tools, event persistence/SSE, demo mode |
| `packages/contract` | Shared | Zod schemas for every event, persona, stance, and verdict shape used across the stack |
| `seed/` | Persona pipeline | Generates, embeds, and loads the persona library into MongoDB Atlas |
| `apps/council-service/eval` | Evaluation | Benchmark dilemma set, deliberation-quality metrics, LLM-judge rubrics |
| `specs/` | Design docs | The full technical spec, one file per subsystem. Start at `specs/00-overview.md` |
| `tasks/` | Team reference | Per-person task breakdown for the four subsystems above |

## Getting started

Requirements: Node 22+, pnpm.

```bash
pnpm install
cp .env.example .env
```

Fill in `.env` at the repo root:

- `GEMINI_API_KEY` (required): Google AI Studio, used for every model call.
- `VOYAGE_API_KEY` and `MONGODB_URI` (required for casting): persona embeddings and storage.
- Everything else in `.env.example` is optional and documented inline.

One-time, once the three keys above are set: seed the persona library.

```bash
pnpm seed
```

Run the app (web on :3000, council service on :8787):

```bash
pnpm dev
```

`pnpm demo` runs the same thing in offline demo mode, replaying a recorded golden session instead of making live model calls. Useful with no network or no API budget.

## Testing

```bash
pnpm test        # unit + e2e tests across the workspace
pnpm typecheck    # tsc --noEmit at the workspace root
```

`apps/council-service` also has `pnpm eval` (runs the benchmark dilemma set through the real pipeline and scores it) and `pnpm test:e2e` (the service's end-to-end suite alone).

## Current status

The deliberation engine, event pipeline (persistence, SSE, replay), contract package, and casting math are implemented and covered by unit and end-to-end tests. Live model calls, real casting, and the persona library seed are gated behind the API keys above. The frontend has the core character/orb system in place; several routes (live session view, replay, decision theater) are still scaffolding. See `tasks/` for the exact per-subsystem breakdown and `specs/00-overview.md` for the full product spec.
