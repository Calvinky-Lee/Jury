# The Sidebar — Design Spec

*(product and code share the name now; UI copy uses "the Chair" and "sidebar members")*

**Date:** 2026-07-18
**Status:** Draft for team review — spec only, nothing implemented
**Team:** 4 people
**Prize track:** Phoebe — "AI to Coordinate the Real World" (AI teammates that automate repetitive work and help businesses operate more efficiently; build an AI agent that solves a real-world problem by automating workflows, improving productivity, or helping people make better decisions)

---

## 1. Pitch

Every consequential decision means chasing multiple people's opinions, doing background research, and writing up a recommendation. **The Sidebar automates that entire workflow — as a mind headquarters.** Give it any real decision, and the Chair convenes the right sidebar — sized to the case, 3–6 AI members — selected for *maximal relevant disagreement*, each a tool-using agent that researches before it argues, each an original little blob character in its own signature color. They give opening statements, rebut each other once, pitch the Chair, and the Chair issues a decision that preserves the split — ruling, devised solution plan, named dissent, and "what would change our mind" — exported as a shareable decision brief. Every finished case crystallizes into a **memory orb** that orbits overhead; a search bar recalls any past deliberation.

**Theme & IP guardrail:** the vibe is Inside-Out-*inspired*; the art is NOT Pixar's. All characters are original simple blob designs (rounded mascot style, pure SVG/CSS — think "little robot/creature," not any Pixar emotion's silhouette), with original names and colors chosen by us. No Pixar/Disney assets, no traced designs, no emotion-character names (Joy, Sadness, …), no "Inside Out" branding in the app. Memory orbs are rendered as generic glowing spheres. Internal system names stay theme-neutral (Chair/sidebar in code and UI).

**One-liner:** better decisions through engineered disagreement.

**Phoebe framing:** The Sidebar is an AI *teammate panel* you convene on demand. It automates the repetitive work of decision-making (perspective-gathering, research, synthesis) and turns a week of Slack threads into a structured decision memo in ~90 seconds.

**Novelty claim (say this explicitly in the pitch):** multi-persona LLM deliberation is a known pattern. Our differentiation is (1) situation-tailored persona *casting* instead of hardcoded characters, (2) *measured* diversity enforcement — a number on screen, not vibes, (3) *preserved disagreement* — the verdict celebrates the dissent instead of averaging it away, and (4) **multi-model capability routing** — sidebar seats run on *different LLMs*, each chosen from a benchmarked capability matrix (empathy, rigor, creativity, groundedness, voice fidelity) to fit what this dilemma demands (specs 04 + 08).

## 2. Product definition

### Scope — what Jury Hopps is for

**Consequential, arguable decisions with no single right answer** — the decisions people currently resolve by polling friends, colleagues, or their own anxiety at 2am. In scope: business calls (pricing, hiring, vendor, pivot), career moves (offers, quit-or-stay, negotiation), money (rent vs. buy, big purchases), and personal crossroads. Out of scope: questions with one checkable answer (that's a search engine), professional-advice domains requiring licensure (medical, legal, tax — intake politely declines and says why), and pure taste.

### The solution it provides

Getting a well-rounded read on a hard decision today means chasing several people's opinions, doing background research, and synthesizing it yourself — slow, biased toward whoever you happened to ask, and prone to echo chambers. Jury Hopps replaces that with an on-demand deliberation: a jury *cast for engineered disagreement* (not friends who agree with you), agents that *verify facts with real tools* (not vibes), positions that must *survive rebuttal and be pitched to a Judge*, and a final output that is not a summary but a **decision package** — a direct answer, a devised optimal solution plan mixing the jury's strongest elements, the preserved dissent, and the concrete conditions that would change the answer.

- **Dilemma scope: general-purpose** within the above. The demo script should skew toward business/work decisions to land the Phoebe framing (e.g., "should our startup switch to annual billing?"), with one funny dilemma for charm.
- **Input:** free-text dilemma plus optional context (constraints, background, links).
- **Output:** a live-streamed deliberation ending in a structured verdict, persisted with a replay URL and an exportable decision brief (Markdown). Finished sessions appear as **memory orbs** on the home screen and are searchable by their dilemma text.
- **Non-goals (v1):** auth/accounts, voice, mobile-native, multi-sidebar sessions, persona fine-tuning, sidebars larger than 6.

## 3. Architecture

Three deployable pieces, one shared contract. Single-language TypeScript monorepo.

| Piece | Tech | Hosting | Purpose |
|---|---|---|---|
| Frontend | Next.js + Tailwind + Framer Motion | local (`pnpm dev`) | The Sidebar HQ UI |
| Sidebar service | Node + Hono, SSE | local (`pnpm dev`) | Runs deliberations, streams events, serves replay reads; separate process so 90s streams never fight the web app |
| Database | MongoDB Atlas (+ Atlas Vector Search) | Atlas | Persona library, session persistence, event replay. Voyage AI (our embedding provider) is MongoDB-owned — first-class pairing |
| `packages/contract` | TypeScript + zod | shared package | Every SSE event, stance, verdict, and persona shape. **Hour-0 deliverable, co-signed by all four.** |

Sidebar members are Gemini function-calling/grounding loops (Flash tier for speed) with two tools: **Google Search grounding** and a **calculator**. The Chair (orchestrator) uses the Pro tier for the verdict. Exact model IDs pinned at hour 0 (spec 04).

## 4. Deliberation pipeline (the Chair)

Six phases, all streamed as SSE events and all individually visible in the UI's phase tracker (spec 07):

1. **Intake** — parse the dilemma; extract the axes of tension (risk vs. reward, principle vs. pragmatism, short vs. long term). UI: *"understanding the case."*
2. **Casting** — embed the dilemma → retrieve top-25 relevant personas via Atlas Vector Search → **MMR selection** (λ≈0.6) picks N that are relevant *and* mutually distant (N = sidebar size the Chair chose at intake from the axes of tension, clamped 3–6, default 4). Members pop onto screen one by one as they're decided; hover/click any member for their personality card. The Chair writes each a **situation brief**: same core identity, specialized to this dilemma. This satisfies "traits tailored to the situation" without giving up a persistent library.
3. **Opening statements** — the N sidebar agents run in parallel. Each emits a structured stance `{recommendation, confidence, key_reasons}` plus a spoken answer in its voice. Tool calls stream to the UI ("🔍 The Actuary is searching: SaaS annual billing churn rates"). UI: *"forming opinions."*
4. **Rebuttal round** — each agent sees the other three stances and gives one rebuttal; may update its stance (updates are tracked — see KPIs). UI: *"deliberating — ingesting each other's opinions."*
5. **Closing pitches** — each member addresses the Chair directly with a ≤60-word closing argument and its final, locked stance. N small parallel calls — cheap, fast, and the beat that makes "pitching your solution to the orchestrator" visible.
6. **Verdict** — the Chair rules: `{ruling, solution_plan, vote_split, majority_reasoning, dissent, confidence, what_would_change_our_mind}`. The **ruling** is the Chair's direct personal answer to the question; the **solution plan** is a devised optimal solution mixing the strongest elements across members — not just picking a side. Disagreement is never averaged away. The verdict renders as an exportable decision brief.

**Guardrails:** 45s hard timeout per agent, max 3 tool iterations per statement. If an agent fails, deliberation proceeds with three and the Chair notes the recusal.

## 5. Persona system

- **Library:** ~200 personas seeded offline by a generation script. Record: name, archetype, core values, biases, decision style, voice, domains, **avatar** `{hue, form}` (from the fixed palette/shape set — the character's signature color doubles as its identity color everywhere in the UI).
- **Embedding:** computed from the **stance profile only** (values + biases + decision style — not names or flavor text). Rationale: bio embeddings measure topical similarity, not behavioral divergence; embedding the stance profile is the closest cheap proxy for "will these two give different advice."
- **Casting:** pgvector similarity (HNSW index) for relevance, then MMR / farthest-point selection for diversity. Relevance and diversity are in tension; MMR resolves it and makes the vector DB load-bearing rather than decorative.
- **Diversity score:** mean pairwise embedding distance of the cast, normalized against a random-cast baseline. Shown live in the UI during casting.
- **Stretch (not core scope):** output-diversity gate — embed the four opening statements; if two converge, flag or recast.

## 6. Event contract (SSE)

The single interface the whole team codes against. Events (zod-schema'd in `packages/contract`):

`session_started` · `dilemma_parsed` · `casting_started` · `persona_cast` (×N, card data + running diversity score) · `casting_done` (diversity ratio + 2D vector map for the sidebar graph) · `statement_started` / `statement_delta` / `statement_done` (per persona, token streaming) · `tool_call` / `tool_result` (per persona) · `rebuttal_started` / `rebuttal_delta` / `rebuttal_done` · `stance_updated` · `closing_started` / `closing_delta` / `closing_done` · `verdict_started` / `verdict_delta` / `verdict_done` · `agent_recused` · `session_done` · `error`

Every event persists to the DB with a sequence number → SSE reconnect resumes from `Last-Event-ID`; finished sessions replay from the DB for share links and demo mode. Full payloads: spec 02.

## 7. Data model (MongoDB Atlas)

Collections: `personas` (with `embedding` + Atlas Vector Search index), `sessions`, `castings`, `statements` (phase ∈ opening/rebuttal/closing), `verdicts`, `events` (the replay log, `{session_id, seq, type, payload}`). Full shapes and indexes: spec 03. Frontend never reads Atlas directly — finished sessions are served by a read endpoint on the sidebar service.

## 8. Frontend (Sidebar HQ)

A flat-2D **mind-headquarters** scene: the **Chair** on a center-back platform, the sidebar's blob characters (3–6, sized to the case) ringed around it, and a field of **memory orbs** (past cases) orbiting above, with a **search bar over past conversations** at the top. A **phase tracker** makes each stage of thinking legible: understanding the case → convening the sidebar → forming opinions → deliberating (ingesting each other's views) → pitches to the Chair → decision. Convening is theater: members pop onto screen one by one as they're decided, and **hovering or clicking any member opens their personality card** (archetype, values, biases, decision style, situation brief). Speech bubbles stream token-by-token with simple state animations; tool-use chips appear beneath a member while its agent researches. Rebuttals visually quote the target member's words. Pitches turn each member toward the Chair. The decision is the theater beat: vote-split bar in member hues, the Chair's answer + step-by-step solution plan, dissenting member spotlighted, "what would change our mind," decision-brief export — then the **crystallization**: the case condenses into a new memory orb that floats up to join the field. A **sidebar toggle opens the vector graph**: each member's personality embedding projected to 2D in its signature hue, visually showing how far apart the cast personalities sit — hover a vector for that personality's summary. Built against **recorded event streams** from day one so frontend never blocks on backend.

**Character art:** original blob characters only (§1 IP guardrail) — pure SVG/CSS (12 hues × ~4 forms, states: idle/talking/dissent), no image assets, no art pipeline. A member's hue is its identity color everywhere: body, nameplate, bubbles, vector graph, and its share of a memory orb. Full detail: spec 07.

## 9. KPIs & evaluation

Two halves — is the *deliberation* real, and is the *output* useful — plus ops. Targets are pre-registered guesses; tune during build, but write down why when changing one.

### Deliberation quality (is disagreement engineered, not performed)
| Metric | Definition | Target |
|---|---|---|
| Sidebar diversity score | Mean pairwise embedding distance of cast vs. random-cast baseline | ≥ 1.3× baseline |
| Genuine-dissent rate | % of sessions with ≥1 differing recommendation before rebuttal | ≥ 75% |
| Stance-update rate | % of rebuttals producing a stance change | 10–40% band (0% = theater; higher = sycophancy) |

### Output quality (LLM-judge rubric over a fixed ~20-dilemma benchmark set)
| Metric | Definition | Target |
|---|---|---|
| Verdict fidelity | Judge: does the ruling honestly reflect the vote split and preserve dissent? (1–5) | ≥ 4.0 mean |
| Actionability | Judge: concrete recommendation + conditions + "what would change our mind" present? (1–5) | ≥ 4.0 mean |
| Groundedness | % of sidebarlors citing ≥1 real tool result per session | ≥ 50% |

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
- Per-session cost cap; simple bearer token on the sidebar service.

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
4. Atlas Vector Search index + similarity queries; 2D PCA projection for the sidebar vector graph
5. MMR casting (λ≈0.6) with deterministic tests on fixed embeddings
6. Sidebar diversity score + random-baseline normalization
7. Casting API surface consumed by P1
8. *Stretch:* output-diversity gate

### P3 — Frontend
1. SSE client with reconnect/replay + state store
2. Recorded-stream dev harness from day one (fixtures from P4)
3. HQ layout + phase tracker (six visible phases); SVG blob character system
4. Convening theater: members pop in as cast, diversity meter; hover/click personality cards
5. Streaming speech bubbles + live tool-use chips
6. Rebuttal visualization with quoted snippets; pitch-to-the-Chair beat
7. Decision theater: vote-split bar, solution plan, dissent spotlight, brief export, orb crystallization
8. Memory-orb field + past-conversation search bar
9. Vector-graph sidebar (2D personality embeddings, hover summaries)
10. Intake form + replay pages

### P4 — Platform & Runtime
1. **Hour-0:** monorepo + `packages/contract` zod schemas — all four sign off
2. Sidebar service (Hono): `POST /sessions`, `GET /sessions/:id/stream`
3. Event persistence + resume-from-last-event-id
4. Tool implementations: web search + calculator, typed result schemas
5. MongoDB Atlas collections, indexes, and the session read endpoint (§7)
6. Local run scripts (`pnpm dev` / `pnpm demo` / `pnpm seed`), env loading, CORS
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
