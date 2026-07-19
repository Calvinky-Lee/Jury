# P4 — Platform & Runtime

**Mission:** Own everything that hosts, the shared contract, and demo survival. You go first (hour-0 contract) and you're the safety net last (demo mode, cost caps). If the wifi dies on stage, your work is why the demo still runs.

**Spec:** `../specs/00-overview.md` (§3 architecture, §6 events, §7 data model, §10 hardening)

## What you provide / what you consume

- **Provide:** the monorepo, `packages/contract`, the council service (hosting P1's runner), SSE infra, tools, Atlas setup, local run scripts, demo mode, metrics capture.
- **Consume:** P1's deliberation runner as a library; everyone's contract sign-off.
- **Contract ownership:** you hold the pen on `packages/contract`; P1–P3 co-sign at hour 0.

## Ordered tasks

1. **Hour 0 — monorepo + `packages/contract`.** pnpm workspace: `apps/web` (Next.js), `apps/council-service` (Hono), `packages/contract` (zod schemas for every SSE event, stance, verdict, persona — §6). Get all three teammates to sign off before anyone writes feature code. Schema parse failures fail loudly everywhere.
2. **Council service scaffold.** Hono, run locally (`pnpm dev` alongside the web app — no cloud hosting in v1). `POST /sessions` → id; `GET /sessions/:id/stream` → SSE; `GET /sessions/:id` + `GET /sessions/:id/events` → replay reads; `GET /sessions?q=` → list/search for the memory-orb field and search bar (Mongo text index, orb payload per contract §REST). Frontend never touches Mongo directly. Bearer token optional locally (off by default; the middleware exists so hosting later is one env var).
3. **Event persistence + replay.** Every emitted event lands in the `events` collection (`{sessionId, seq, type, payload}`); SSE resumes from `Last-Event-ID`; finished sessions replay via the read endpoints. This one mechanism powers reconnect, replay pages, P3's fixtures, AND demo mode.
4. **Fixture generator.** Hand-author (then later record) a golden session's event log and hand it to P3 before hour 6 — P3's entire early workstream depends on this.
5. **Provider adapters (`models/`).** One `generate(messages, opts)` interface over Gemini (`@google/genai`), Anthropic, and OpenAI SDKs — streaming, structured output, and function calling normalized so P1's runner is provider-blind (spec 04). Models with no API key are auto-disabled.
6. **Tool implementations.** Web search via **Gemini Google Search grounding** for Gemini members and **Tavily** for non-Gemini members (identical `tool_call`/`tool_result` events from both paths; verify grounding + `responseSchema` interaction at hour 0 — spec 06) + calculator (mathjs, restricted scope). Typed result schemas in the contract; per-call timeouts.
7. **MongoDB Atlas setup.** Free M0 cluster, `seed/setup-indexes.ts` (vector search index + standard indexes per spec 03), network allow-list, connection helper in `db/`. Coordinate the `personas` shape with P2. Offline fallback documented: Atlas CLI local deployment (`atlas deployments setup`) supports vector search on-laptop.
8. **Local run experience.** One command (`pnpm dev`) brings up web + council service with hot reload; `.env` loading; a `pnpm demo` script that starts everything in demo mode. Working end-to-end skeleton by hour ~12 — integration happens on the actual demo laptop.
9. **Demo mode.** Golden-session recorder (flag a live session → saved as fixture) + an offline replay switch in the app. With local hosting + Atlas local fallback + demo mode, the demo survives total wifi loss. Rehearse through it at least once.
10. **Metrics capture (§9 ops KPIs).** Per-session: time-to-first-cast, time-to-first-token, verdict latency, completion/recusal, token cost. Simple logging + a summary script is fine — P1's eval harness reads this too.
11. **Cost/rate caps.** <$0.50 hard cap per session; kill-switch that ends a runaway session with a clean `error` event.

## Checkpoints

- **Hour ~6:** contract signed, service scaffold streaming a hand-authored fixture, P3 unblocked with fixtures.
- **Hour ~12:** real skeleton deliberation (P1's runner + P2's casting) flowing through the locally running service into P3's UI on the demo laptop.
- **After:** demo mode, metrics, caps, and a full offline rehearsal.

## Definition of done

`pnpm dev` on a fresh clone (plus `.env`) runs a full session end-to-end; the same demo runs with wifi off via demo mode; no session can exceed the cost cap; P3 never had to mock an event shape you didn't provide.
