# P4 — Platform & Runtime

**Mission:** Own everything that hosts, the shared contract, and demo survival. You go first (hour-0 contract) and you're the safety net last (demo mode, cost caps). If the wifi dies on stage, your work is why the demo still runs.

**Spec:** `../specs/00-overview.md` (§3 architecture, §6 events, §7 data model, §10 hardening)

## What you provide / what you consume

- **Provide:** the monorepo, `packages/contract`, the council service (hosting P1's runner), SSE infra, tools, DB migrations, deploys, demo mode, metrics capture.
- **Consume:** P1's deliberation runner as a library; everyone's contract sign-off.
- **Contract ownership:** you hold the pen on `packages/contract`; P1–P3 co-sign at hour 0.

## Ordered tasks

1. **Hour 0 — monorepo + `packages/contract`.** pnpm workspace: `apps/web` (Next.js), `apps/council-service` (Hono), `packages/contract` (zod schemas for every SSE event, stance, verdict, persona — §6). Get all three teammates to sign off before anyone writes feature code. Schema parse failures fail loudly everywhere.
2. **Council service scaffold.** Hono on Fly.io or Railway (pick by fastest deploy, document choice). `POST /sessions` → id; `GET /sessions/:id/stream` → SSE. Simple bearer token.
3. **Event persistence + replay.** Every emitted event lands in `events(session_id, seq, type, payload)`; SSE resumes from `Last-Event-ID`; finished sessions replay from the DB. This one mechanism powers reconnect, share links, P3's fixtures, AND demo mode.
4. **Fixture generator.** Hand-author (then later record) a golden session's event log and hand it to P3 before hour 6 — P3's entire early workstream depends on this.
5. **Tool implementations.** Web search (Anthropic server-side web search tool if available on the account, else Brave/Tavily — document choice) + calculator. Typed result schemas in the contract; per-call timeout; results emitted as `tool_call`/`tool_result` events.
6. **Supabase schema/migrations.** All §7 tables including P2's `personas` (coordinate — P2 designs it, you migrate it).
7. **Deploys.** Vercel (web) + Fly/Railway (service), secrets management, CORS. Deployed skeleton by hour ~12 — integration happens on real infra, not laptops.
8. **Demo mode.** Golden-session recorder (flag a live session → saved as fixture) + an offline replay switch in the app. Rehearse the demo through it at least once.
9. **Metrics capture (§9 ops KPIs).** Per-session: time-to-first-cast, time-to-first-token, verdict latency, completion/recusal, token cost. Simple logging + a summary script is fine — P1's eval harness reads this too.
10. **Cost/rate caps.** <$0.50 hard cap per session; kill-switch that ends a runaway session with a clean `error` event.

## Checkpoints

- **Hour ~6:** contract signed, service scaffold streaming a hand-authored fixture, P3 unblocked with fixtures.
- **Hour ~12:** real skeleton deliberation (P1's runner + P2's casting) flowing through the deployed service into P3's UI.
- **After:** demo mode, metrics, caps, and a full offline rehearsal.

## Definition of done

A stranger can open the deployed URL and run a full session; the same demo runs with wifi off via demo mode; no session can exceed the cost cap; P3 never had to mock an event shape you didn't provide.
