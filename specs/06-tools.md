# 06 — Tools — P4

Two tools, available to jurors only during **opening statements** (max 3 iterations; rebuttals are tool-free per spec 04). Every call emits `tool_call` / `tool_result` events — tool use on screen is the "agents coordinate the real world" pitch moment, so results are never silent.

## 1. Web search

- **Primary: Anthropic's server-side `web_search` tool** — passed in the juror call's `tools` array; Anthropic executes the search server-side. Zero extra API key, zero scraping code, citations come back structured. Billed per search on the Anthropic key (§ cost note below).
- **Fallback: Tavily** (`TAVILY_API_KEY`), as a client-side tool in the tool-runner loop, only if the account/model combination doesn't support the server tool — verify at hour 0, record the outcome here.
- Config: `max_uses: 3` per juror per session.
- **Event mapping:** the server tool's search begins/results are translated by the juror-runner into contract `tool_call` (`input: query`) and `tool_result` (`summary`: top result titles, ≤140 chars) events, keyed by `callId`.

## 2. Calculator

- Client-side tool in the tool-runner loop; evaluated with **mathjs** `evaluate()` in restricted scope (no assignment, no function definition — parse-tree check before eval). Never `eval()`.
- Schema:

```ts
input:  { expression: string, note?: string }   // note = what this computes, shown in the chip
output: { result: string } | { error: string }  // errors return to the model, not the user
```

- 1s timeout; oversized expressions (>500 chars) rejected.

## Shared tool rules

1. **Typed results:** every tool result parses through a contract schema before reaching the model or the event stream.
2. **Timeouts are per-call** (search: 10s; calc: 1s) and *inside* the juror's 45s budget — a slow tool degrades one statement, never the session.
3. **Failure shape:** a failed tool call returns `{ error }` to the model (which is told to proceed without it) and emits a `tool_result` with an error summary — the chip shows the attempt; honesty is part of the theater.
4. **Cost note:** Anthropic web search bills per search (verify current pricing at hour 0 — see spec 09 budget table). Worst case 4 jurors × 3 searches = 12 searches/session; the $0.50 cap accounts for it.
