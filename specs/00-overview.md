# Jury Hopps — Design Spec

*(working title; internally the system is still "the Council" — code and schema names don't churn with branding)*

**Date:** 2026-07-18
**Status:** Draft for team review — spec only, nothing implemented
**Team:** 4 people
**Prize track:** Phoebe — "AI to Coordinate the Real World" (AI teammates that automate repetitive work and help businesses operate more efficiently; build an AI agent that solves a real-world problem by automating workflows, improving productivity, or helping people make better decisions)

---

## 1. Pitch

Every consequential decision means chasing multiple people's opinions, doing background research, and writing up a recommendation. **Jury Hopps automates that entire workflow — as an animal courtroom.** Give it any real decision, and the rabbit Judge empanels the right jury: four AI jurors selected for *maximal relevant disagreement*, each a tool-using agent that researches before it argues, each an original 2D animal character whose species matches its temperament. They give opening statements, rebut each other once, and the Judge issues a verdict that preserves the split — majority ruling, named dissent, and "what would change our mind" — exported as a shareable decision brief.

**Theme & IP guardrail:** the name is a pun; the art is NOT. All characters are original anthropomorphic animal designs in a warm flat-2D animated-film style — no Zootopia/Disney assets, no traced character designs, no Disney names in the app. Internal system names stay theme-neutral (Chair/council in code; Judge/jury in UI copy).

**One-liner:** better decisions through engineered disagreement.

**Phoebe framing:** The Council is an AI *teammate panel* you convene on demand. It automates the repetitive work of decision-making (perspective-gathering, research, synthesis) and turns a week of Slack threads into a structured decision memo in ~90 seconds.

**Novelty claim (say this explicitly in the pitch):** multi-persona LLM deliberation is a known pattern. Our differentiation is (1) situation-tailored persona *casting* instead of hardcoded characters, (2) *measured* diversity enforcement — a number on screen, not vibes, and (3) *preserved disagreement* — the verdict celebrates the dissent instead of averaging it away.

## 2. Product definition

- **Scope: general-purpose.** Any real decision — business, career, purchases, personal. The demo script should skew toward business/work decisions to land the Phoebe framing (e.g., "should our startup switch to annual billing?"), with one funny dilemma for charm.
- **Input:** free-text dilemma plus optional context (constraints, background, links).
- **Output:** a live-streamed deliberation ending in a structured verdict, persisted with a shareable replay URL and an exportable decision brief (Markdown).
- **Non-goals (v1):** auth/accounts, voice, mobile-native, multi-council sessions, persona fine-tuning, more than 4 council members.

## 3. Architecture

Three deployable pieces, one shared contract. Single-language TypeScript monorepo.

| Piece | Tech | Hosting | Purpose |
|---|---|---|---|
| Frontend | Next.js + Tailwind + Framer Motion | Vercel | The council chamber UI |
| Council service | Node + Hono, SSE | Fly.io or Railway | Runs deliberations, streams events; lives outside serverless so 90s sessions never fight timeouts |
| Database | Supabase (Postgres + pgvector) | Supabase | Persona library, session persistence, event replay |
| `packages/contract` | TypeScript + zod | shared package | Every SSE event, stance, verdict, and persona shape. **Hour-0 deliverable, co-signed by all four.** |

Council members are Anthropic SDK tool-runner loops (Sonnet-tier for speed/cost) with two tools: **web search** and **calculator**. The Chair (orchestrator) uses a higher-capability model for intake and the verdict.

## 4. Deliberation pipeline (the Chair)

Five phases, all streamed as SSE events:

1. **Intake** — parse the dilemma; extract the axes of tension (risk vs. reward, principle vs. pragmatism, short vs. long term).
2. **Casting** — embed the dilemma → retrieve top-25 relevant personas from pgvector → **MMR selection** (λ≈0.6) picks 4 that are relevant *and* mutually distant. The Chair writes each a **situation brief**: same core identity, specialized to this dilemma. This satisfies "traits tailored to the situation" without giving up a persistent library.
3. **Opening statements** — 4 council agents run in parallel. Each emits a structured stance `{recommendation, confidence, key_reasons}` plus a spoken answer in its voice. Tool calls stream to the UI ("🔍 The Actuary is searching: SaaS annual billing churn rates").
4. **Rebuttal round** — each agent sees the other three stances and gives one rebuttal; may update its stance (updates are tracked — see KPIs).
5. **Verdict** — the Chair rules: `{ruling, vote_split, majority_reasoning, dissent: {who, position, why_it_matters}, confidence, what_would_change_our_mind}`. Disagreement is never averaged away; the dissent is a first-class field. The verdict renders as an exportable decision brief.

**Guardrails:** 45s hard timeout per agent, max 3 tool iterations per statement. If an agent fails, deliberation proceeds with three and the Chair notes the recusal.

## 5. Persona system

- **Library:** ~200 personas seeded offline by a generation script. Record: name, archetype, core values, biases, decision style, voice, domains, **species** (from the fixed art-set list, chosen to match temperament), avatar seed.
- **Embedding:** computed from the **stance profile only** (values + biases + decision style — not names or flavor text). Rationale: bio embeddings measure topical similarity, not behavioral divergence; embedding the stance profile is the closest cheap proxy for "will these two give different advice."
- **Casting:** pgvector similarity (HNSW index) for relevance, then MMR / farthest-point selection for diversity. Relevance and diversity are in tension; MMR resolves it and makes the vector DB load-bearing rather than decorative.
- **Diversity score:** mean pairwise embedding distance of the cast, normalized against a random-cast baseline. Shown live in the UI during casting.
- **Stretch (not core scope):** output-diversity gate — embed the four opening statements; if two converge, flag or recast.

## 6. Event contract (SSE)

The single interface the whole team codes against. Events (zod-schema'd in `packages/contract`):

`session_started` · `dilemma_parsed` · `casting_started` · `persona_cast` (×4, card data + running diversity score) · `statement_started` / `statement_delta` / `statement_done` (per persona, token streaming) · `tool_call` / `tool_result` (per persona) · `rebuttal_started` / `rebuttal_delta` / `rebuttal_done` · `stance_updated` · `verdict_started` / `verdict_delta` / `verdict_done` · `agent_recused` · `session_done` · `error`

Every event persists to the DB with a sequence number → SSE reconnect resumes from `Last-Event-ID`; finished sessions replay from the DB for share links and demo mode.

## 7. Data model (Supabase)

- `personas(id, name, archetype, profile jsonb, stance_profile text, embedding vector)`
- `sessions(id, dilemma, context, status, created_at)`
- `castings(session_id, persona_id, situation_brief, mmr_score, diversity_score)`
- `statements(session_id, persona_id, phase enum[opening,rebuttal], stance jsonb, text, tool_calls jsonb)`
- `verdicts(session_id, verdict jsonb, brief_md text)`
- `events(session_id, seq, type, payload jsonb)` — the replay log

## 8. Frontend (2D animal courtroom)

A flat-2D animated courtroom scene: the rabbit **Judge** at the bench, four **juror** seats in the jury box. Casting is *empaneling* theater: juror characters hop/walk into their seats with archetype nameplates and the diversity meter climbing. Speech bubbles stream token-by-token with simple talk animations (ear twitches, blinks — sprite states, not rigged animation); tool-use chips appear beneath a juror while its agent researches ("🔍 the Owl is searching…"). Rebuttals visually quote the target juror's words. Verdict is the theater beat: gavel slam, vote-split bar, dissenting juror spotlighted, "what would change our mind," then the decision-brief export button. Intake is framed as *filing a case*. Shareable replay pages. Built against **recorded event streams** from day one so frontend never blocks on backend.

**Character art:** original animal designs only (§1 IP guardrail). Each persona archetype maps to a species whose folk temperament matches its decision style (owl = analyst, fox = cynic, tortoise = traditionalist, retriever = optimist, etc.). The species mapping lives in the persona record (P2) so casting emits it; art assets are a fixed set of ~10–15 species with 2–3 sprite states each (idle, talking, dissent), sourced by generating original character art offline (image-gen with a consistent style prompt) or commissioning/drawing — decided by P3 in hour 1, documented here.

## 9. KPIs & evaluation

Two halves — is the *deliberation* real, and is the *output* useful — plus ops. Targets are pre-registered guesses; tune during build, but write down why when changing one.

### Deliberation quality (is disagreement engineered, not performed)
| Metric | Definition | Target |
|---|---|---|
| Council diversity score | Mean pairwise embedding distance of cast vs. random-cast baseline | ≥ 1.3× baseline |
| Genuine-dissent rate | % of sessions with ≥1 differing recommendation before rebuttal | ≥ 75% |
| Stance-update rate | % of rebuttals producing a stance change | 10–40% band (0% = theater; higher = sycophancy) |

### Output quality (LLM-judge rubric over a fixed ~20-dilemma benchmark set)
| Metric | Definition | Target |
|---|---|---|
| Verdict fidelity | Judge: does the ruling honestly reflect the vote split and preserve dissent? (1–5) | ≥ 4.0 mean |
| Actionability | Judge: concrete recommendation + conditions + "what would change our mind" present? (1–5) | ≥ 4.0 mean |
| Groundedness | % of councillors citing ≥1 real tool result per session | ≥ 50% |

### Ops
| Metric | Target |
|---|---|
| Time to first persona cast | < 5s |
| Time to first statement token | < 10s |
| Full verdict (p90) | < 90s |
| Session completion rate (no recusals) | ≥ 95% |
| Cost per session | < $0.50 hard cap (revisit if model tiers change) |

**Eval harness:** fixed benchmark set of ~20 dilemmas spanning decision types; run on prompt/pipeline changes; LLM-judge scoring against the rubric; results logged per run for regression tracking. (Same pattern as the team's Ember benchmark harness.)

## 10. Error handling & demo hardening

- SSE reconnect with replay from last event ID — a mid-deliberation refresh loses nothing.
- Per-agent timeout + recusal path (§4) — one dead agent never kills a session.
- **Demo mode:** a recorded golden session replayable fully offline. Mandatory hackathon insurance for dead wifi.
- Per-session cost cap; simple bearer token on the council service.

## 11. Testing (hackathon-weight)

- Zod contract schemas as the source of truth; parse failures fail loudly.
- Deterministic unit tests for MMR selection using fixed embeddings.
- Frontend developed and tested against recorded event-stream fixtures.
- One golden end-to-end session exercised before every integration checkpoint.
- Eval harness (§9) doubles as the prompt regression suite.

## 12. Team split

### P1 — Deliberation Engine (the Chair)
1. Deliberation state machine: phases, transitions, failure states (typed in contract package)
2. Intake prompt: dilemma parsing + axes-of-tension extraction, structured output
3. Situation-brief generation (specializing P2's cast personas to the dilemma)
4. Opening-statement agent prompt template: persona injection, stance schema, tool-use guidance
5. Rebuttal round: context packing, rebuttal prompt, stance-update rules
6. **Verdict prompt — built first, not last.** If it blands out the disagreement, the product thesis dies
7. Orchestration loop: parallel agents, timeouts, recusal handling
8. Eval harness + LLM-judge rubrics (§9); per-session cost/latency budget and model-tier choices

### P2 — Persona System
1. Persona schema: identity fields vs. stance-profile fields (only the latter embedded)
2. Library generation script (~200 general-purpose personas across decision domains) + quality rubric
3. Embedding strategy: stance-profile canonical text; default Voyage `voyage-3` (P2 may swap with a one-line rationale in this doc)
4. pgvector table + HNSW index + similarity queries
5. MMR casting (λ≈0.6) with deterministic tests on fixed embeddings
6. Council diversity score + random-baseline normalization
7. Casting API surface consumed by P1
8. *Stretch:* output-diversity gate

### P3 — Frontend
1. SSE client with reconnect/replay + state store
2. Recorded-stream dev harness from day one (fixtures from P4)
3. Chamber layout: four-card arc + Chair
4. Casting theater: card flip-ins, diversity meter
5. Streaming speech bubbles + live tool-use chips
6. Rebuttal visualization with quoted snippets
7. Verdict theater: gavel, vote-split bar, dissent spotlight, decision-brief export
8. Intake form + shareable replay pages

### P4 — Platform & Runtime
1. **Hour-0:** monorepo + `packages/contract` zod schemas — all four sign off
2. Council service (Hono): `POST /sessions`, `GET /sessions/:id/stream`
3. Event persistence + resume-from-last-event-id
4. Tool implementations: web search + calculator, typed result schemas
5. Supabase schema/migrations (§7)
6. Deploys (Vercel + Fly/Railway), secrets, CORS
7. Demo mode: golden-session recorder + offline replay switch
8. Metrics capture + logging for the KPI dashboard (§9); rate/cost caps

### Seams & checkpoints
- P1↔P2 meet at the casting API; P1↔P4 at tool interfaces and the event emitter; P3 touches only the contract.
- **Hour ~6:** P3 renders a fake recorded stream end-to-end.
- **Hour ~12:** a real skeleton deliberation flows through the whole stack.
- Everything after is depth, eval-driven prompt tuning, and polish.

## 13. Risk register

1. **Pattern familiarity.** Multi-persona deliberation is well-trodden; judges may have seen several. Mitigation: lead the pitch with casting + measured diversity + preserved dissent, and show the diversity score on screen.
2. **Latency kills demos.** 60–90s of deliberation is dead air unless streamed. Mitigation: streaming *is* the show (tool-use chips, live rebuttals); demo mode is the backstop.
3. **The verdict prompt is the highest-skill prompt in the system.** If it averages away disagreement, the product is an expensive single-model answer. Mitigation: P1 builds it first; verdict-fidelity KPI gates it.
4. **Embedding distinctness is a proxy.** Stance-profile embeddings approximate behavioral divergence but don't guarantee it. Mitigation: genuine-dissent-rate KPI measures the real thing; output-diversity gate is the stretch fix.
5. **Tool flakiness on stage.** Web search can fail or be slow live. Mitigation: timeouts + recusal path + demo mode.
