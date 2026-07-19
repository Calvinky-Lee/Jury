# 09 — Infra, Environments & API Keys — platform owner

**Local-first (spec 01):** both apps run on the demo laptop via `pnpm dev`. The only cloud dependencies are MongoDB Atlas and the model/embedding APIs. No web hosting, no deploy platforms.

## Accounts needed (one per team, created before hour 0)

| Account | For | Free tier OK? |
|---|---|---|
| Google AI Studio | Gemini API — intake, members, Google Search grounding | yes — generous free tier; rate limits (RPM/TPM) are the real constraint, verify at hour 0 |
| Anthropic / OpenAI *(≥1 recommended)* | non-Google council members — the multi-model claim needs ≥2 providers (spec 04) | needs a few dollars of credits; the registry auto-disables models with no key |
| Voyage AI | `voyage-3` embeddings (MongoDB-owned — natural pairing with Atlas) | yes — seed is one batch; queries are tiny |
| MongoDB Atlas | documents + Atlas Vector Search | yes — M0 free tier supports vector search |
| Tavily *(only if grounding fallback triggers, spec 06)* | web search fallback | yes |

## API keys & env vars — the complete list (`.env.example` mirrors this)

One local `.env` at the repo root, loaded by both apps. Gitignored from commit 1; `.env.example` carries names + comments, never values.

| Var | Used by | What |
|---|---|---|
| `GEMINI_API_KEY` | council-service, seed, eval | Gemini models + Google Search grounding (AI Studio) — **required** |
| `ANTHROPIC_API_KEY` | council-service, eval | *optional* — enables Claude models in the multi-model registry (spec 04) |
| `OPENAI_API_KEY` | council-service, eval | *optional* — enables GPT models in the registry |
| `VOYAGE_API_KEY` | council-service, seed | voyage-3 embeddings (seed batch + per-session dilemma query) |
| `MONGODB_URI` | council-service, seed | Atlas SRV connection string — never imported by `apps/web` |
| `COUNCIL_SERVICE_URL` | web | proxy route target, `http://localhost:8787` |
| `COUNCIL_SERVICE_TOKEN` | both (optional) | bearer auth, **off by default locally**; middleware exists so hosting later is one env var |
| `TAVILY_API_KEY` | council-service (optional) | only if Google Search grounding is unavailable on the team's tier |
| `COST_CAP_USD` (=0.50) | council-service | per-session kill-switch (matters only on a paid key) |
| `DEMO_MODE` (=0/1) | council-service | 1 = stream the golden fixture instead of a live deliberation |

**Key-safety rules:** the browser receives zero credentials — all reads and streams go through the Next.js proxy to the council service. `MONGODB_URI` and `GEMINI_API_KEY` are imported only in `apps/council-service` and `seed`/`eval` scripts (enforce with a lint rule or grep in CI-of-one). Atlas network access: allow-list team laptops (or 0.0.0.0/0 with a strong password for hackathon speed — note it and rotate after). **Any credential ever pasted into a chat, screenshot, or shared doc is burned — rotate it after the event.**

## Running it

- `pnpm dev` — starts `apps/web` (:3000) and `apps/council-service` (:8787) concurrently with hot reload.
- `pnpm demo` — same, with `DEMO_MODE=1` (golden fixture, wifi-proof).
- `pnpm seed` — generate → embed → load personas + create indexes (one-time, needs all three keys).
- `pnpm eval` — the spec-08 benchmark harness.
- CORS: council service allows `localhost:3000` only.

## Demo hardening

1. **Demo mode:** `DEMO_MODE=1` (or per-session `?demo=1`) streams `fixtures/golden-session.jsonl` through the real SSE path with realistic pacing — indistinguishable from live, zero network needed. Rehearse the pitch through it at least once.
2. **Golden-session recorder:** any live session can be flagged and dumped from the `events` collection to a fixture file (one script — spec'd, trivial).
3. **Offline DB fallback:** Atlas CLI local deployment (`atlas deployments setup`) supports vector search on-laptop if venue wifi can't reach Atlas.
4. **Rate-limit resilience:** Gemini free-tier 429s ⇒ orchestrator backs off and serializes member calls; the UI just sees slower phases, never errors.
5. **Cost cap:** running token cost tracked per session on paid keys; breach ⇒ clean fatal `error` event, never a hung UI.
6. **Concurrency cap:** 3 concurrent sessions max; excess returns 429 with a friendly "the council is in session" page.

## Budget sanity (per session)

On the AI Studio **free tier: $0** — the constraint is requests/minute, not dollars (3–6 members × 3 phases + Chair calls ≈ 12–25 requests/session; fits free-tier RPM with the orchestrator's backoff). On a paid key: Flash-tier tokens + one Pro-tier verdict ≈ **well under $0.10/session**; grounded search is included with the API (quota applies). Voyage query embedding <$0.001. The $0.50 cap is now deep margin rather than a real ceiling — keep it as the kill-switch anyway.
