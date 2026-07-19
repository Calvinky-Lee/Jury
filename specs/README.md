# Jury Hopps — Technical Specs

Spec-first project: **nothing is implemented until the team signs off on these documents.**

## Reading order

| # | Spec | Owner | Covers |
|---|------|-------|--------|
| 00 | [Overview](00-overview.md) | all | Pitch, product definition, design decisions, risk register, KPIs summary |
| 01 | [Architecture & repo layout](01-architecture-and-repo.md) | P4 | Deployment topology, full monorepo folder structure |
| 02 | [Contract](02-contract.md) | P4 (pen), all (sign-off) | Every SSE event, stance/verdict/persona types |
| 03 | [Data model](03-data-model.md) | P4 + P2 | MongoDB collections, Atlas Vector Search, indexes |
| 04 | [Deliberation engine](04-deliberation-engine.md) | P1 | State machine, prompts, orchestration, timeouts |
| 05 | [Persona system](05-persona-system.md) | P2 | Library generation, embeddings, MMR, diversity score |
| 06 | [Tools](06-tools.md) | P4 | Google Search grounding + calculator tool specs |
| 07 | [Frontend](07-frontend.md) | P3 | Sidebar HQ UI, blob characters, memory orbs, search, SSE client |
| 08 | [Evaluation](08-evaluation.md) | P1 | KPIs, eval harness, LLM-judge rubrics |
| 09 | [Infra, env & API keys](09-infra-and-keys.md) | P4 | Local-first run, every env var and API key, demo mode, rate limits |

Per-person task breakdowns live in [`../tasks/`](../tasks/).

## Change protocol

Specs are the source of truth. If implementation needs to deviate, update the spec in the same PR with a one-line rationale. The contract (02) and data model (03) require all four teammates' sign-off to change after hour 0.
