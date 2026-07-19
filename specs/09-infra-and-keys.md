# 09 — Infra, Environments & API Keys — P4

## Accounts needed (one per team, created before hour 0)

| Account | For | Free tier OK? |
|---|---|---|
| Anthropic Console | Chair + jurors + LLM judge + web search tool | needs credits (~$25 covers build + eval + demo) |
| Voyage AI | `voyage-3` embeddings | yes — seed is one batch; queries are tiny |
| Supabase | Postgres + pgvector + RLS | yes |
| Vercel | `apps/web` | yes |
| Fly.io (fallback Railway) | `apps/council-service` | yes/near-free |
| Tavily *(only if fallback triggers, spec 06)* | web search fallback | yes |

## API keys & env vars — the complete list (`.env.example` mirrors this)

### `apps/council-service` (Fly.io secrets)

| Var | What | Source |
|---|---|---|
| `ANTHROPIC_API_KEY` | all model calls + server-side web search | Anthropic Console |
| `VOYAGE_API_KEY` | dilemma embeddings at query time | Voyage dashboard |
| `SUPABASE_URL` | project URL | Supabase settings |
| `SUPABASE_SERVICE_ROLE_KEY` | full DB read/write — **never** leaves the service | Supabase settings |
| `COUNCIL_SERVICE_TOKEN` | self-issued bearer token (random 32 bytes); frontend proxy must present it | generated once, shared to Vercel |
| `TAVILY_API_KEY` *(optional)* | search fallback only | Tavily |
| `COST_CAP_USD` (=0.50) | per-session kill-switch | config |
| `DEMO_MODE` (=0/1) | serve golden fixture instead of live deliberation | config |

### `apps/web` (Vercel)

| Var | What | Exposure |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | replay-page reads | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | read-only under RLS (spec 03) | public — safe by design |
| `COUNCIL_SERVICE_URL` | service base URL | server-only (proxy route) |
| `COUNCIL_SERVICE_TOKEN` | bearer for the proxy | server-only — **no `NEXT_PUBLIC_` prefix, ever** |

### `seed/` + `eval/` (developer laptops only)

`ANTHROPIC_API_KEY` (persona generation, eval judge), `VOYAGE_API_KEY` (seed embeddings), `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (loading). Local `.env`, gitignored.

**Key-safety rules:** service-role key and service token exist in exactly two places (Fly secrets, Vercel server env). Browser receives only the two `NEXT_PUBLIC_` Supabase values. `.env` in `.gitignore` from commit 1; `.env.example` carries names + comments, never values.

## Deploys

- **Vercel:** auto-deploy `apps/web` on push to `main` (monorepo root directory setting). Preview deploys per PR for free frontend review.
- **Fly.io:** `fly deploy` from `apps/council-service` (fly.toml checked in). Single `shared-cpu-1x` instance; SSE = plain HTTP streaming, no special config; `min_machines_running = 1` to dodge cold starts during demo hours.
- **Supabase:** migrations applied via CLI (`supabase db push`) by P4 only.
- **CORS:** council service allows only the Vercel prod + preview origins; bearer token required on every route.

## Demo hardening

1. **Demo mode:** `DEMO_MODE=1` (or per-session `?demo=1`) streams `fixtures/golden-session.jsonl` through the real SSE path with realistic pacing — the app is indistinguishable from live, with wifi only needed for the initial page load (and `/dev/replay` works fully offline as the last resort). Rehearse the pitch through it at least once.
2. **Golden-session recorder:** any live session can be flagged and dumped from the `events` table to a fixture file (one SQL query + jq — spec'd, trivial).
3. **Cost caps:** running token+search cost tracked per session; breach ⇒ clean fatal `error` event, session `failed`, never a hung UI.
4. **Rate limit:** 3 concurrent sessions max (hackathon floor traffic + judges); excess returns 429 with a friendly "court is in session" page.

## Budget sanity (per session, worst case)

| Item | Est. |
|---|---|
| 4 jurors × (statement + rebuttal), Sonnet | ~$0.15 |
| Intake + 4 briefs, Sonnet | ~$0.03 |
| Verdict, Opus | ~$0.10 |
| Web searches (≤12) | ~$0.12 |
| Voyage query embedding | <$0.001 |
| **Total** | **~$0.40** → cap $0.50 ✓ |

(Verify current per-search and per-token pricing at hour 0; adjust the table, not the cap.)
