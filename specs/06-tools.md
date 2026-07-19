# 06 — Tools

Two tools, available to sidebar members only during **opening statements** (max 3 iterations; rebuttals and closings are tool-free per spec 04). Every use emits `tool_call` / `tool_result` events — tool use on screen is the "agents coordinate the real world" pitch moment, so results are never silent.

## 1. Web search — **Gemini Google Search grounding**

- Built into the Gemini API: pass the `google_search` tool in the member call's config; Google executes the search server-side and the response comes back grounded with `groundingMetadata` (queries used + source URIs). Zero extra API key, zero scraping code.
- **Event mapping:** the member-runner translates `groundingMetadata` into contract events — `tool_call` (`input`: the search queries Gemini issued) and `tool_result` (`summary`: top source titles, ≤140 chars) — keyed by `callId`. Emitted when the grounded response lands (grounding is not step-streamed; acceptable — the chip appears with the statement).
- Note: grounding + `responseSchema` cannot always be combined in one call — the member runner does the grounded prose call first, then a tiny schema-forced call to extract the `Stance`. Verify the interaction at hour 0 and record the outcome here.
- **Non-Gemini members (multi-model routing, spec 04) always search via Tavily** (`TAVILY_API_KEY`), declared as a function tool — the search *tool layer* is provider-agnostic even though the mechanism differs; both paths emit identical `tool_call`/`tool_result` events. Tavily is also the fallback if grounding is unavailable on the team's tier — verify at hour 0, record the outcome here.

## 2. Calculator — Gemini function calling

- Declared as a function tool; evaluated service-side with **mathjs** `evaluate()` in restricted scope (no assignment, no function definition — parse-tree check before eval). Never `eval()`.
- Schema:

```ts
input:  { expression: string, note?: string }   // note = what this computes, shown in the chip
output: { result: string } | { error: string }  // errors return to the model, not the user
```

- 1s timeout; oversized expressions (>500 chars) rejected.

## Shared tool rules

1. **Typed results:** every tool result parses through a contract schema before reaching the model or the event stream.
2. **Timeouts are per-call** (grounded call: 15s; calc: 1s) and *inside* the member's 45s budget — a slow tool degrades one statement, never the session.
3. **Failure shape:** a failed tool call returns `{ error }` to the model (which is told to proceed without it) and emits a `tool_result` with an error summary — the chip shows the attempt; honesty is part of the theater.
4. **Cost:** Google Search grounding is included in the Gemini API (free-tier limits apply; verify current quota at hour 0 — see spec 09).
