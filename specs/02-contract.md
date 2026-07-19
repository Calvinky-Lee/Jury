# 02 — The Contract (`packages/contract`)

Zod schemas in TypeScript; every boundary (SSE, DB payloads, tool results) parses through them and **fails loudly** on mismatch. This file is the human-readable form; the package is the executable form. Hour-0 deliverable — all four sign.

## Core types

```ts
// persona.ts
PersonaIdentity {
  id: string            // uuid
  name: string          // original character name — never a Pixar/Disney name
  archetype: string     // "The Actuary", "The Gambler", …
  avatar: {             // original blob-character look (spec 07): signature color + simple form
    hue: string         //   from the fixed 12-color palette; doubles as the member's identity color everywhere
    form: BlobForm      //   'round' | 'tall' | 'squat' | 'spiky' | … (fixed SVG shape set)
  }
  voice: string         // 1-sentence speech-style direction
  domains: string[]     // e.g. ["finance", "career"]
}

StanceProfile {         // ONLY this block is embedded (spec 05)
  coreValues: string[]
  biases: string[]      // at least one explicit bias required
  decisionStyle: string
}

Persona = PersonaIdentity & { stanceProfile: StanceProfile }

CastMember = Persona & {
  situationBrief: string   // Chair-written specialization for this dilemma
  mmrScore: number
  model: {                 // which LLM powers this seat (capability routing, spec 04)
    id: string             //   e.g. 'gemini-3-flash', 'claude-sonnet-5'
    provider: string
    reason: string         //   ≤80 chars: why this model for this seat ("highest empathy for the emotional axis")
  }
}
```

```ts
// stance.ts
Stance {
  recommendation: string   // one imperative sentence
  confidence: number       // 0–1
  keyReasons: string[]     // 2–4
}
```

```ts
// verdict.ts
Verdict {
  ruling: string                    // the Chair's direct, personal answer to the user's question, 1–3 sentences
  solutionPlan: string[]            // 3–6 concrete steps — the Chair's devised OPTIMAL SOLUTION,
                                    // mixing the strongest elements across members, not just picking a side
  voteSplit: { for: string[], against: string[], abstain: string[] }  // persona ids
  majorityReasoning: string
  dissent: {                        // REQUIRED when voteSplit is not unanimous
    who: string                     // persona id
    position: string
    whyItMatters: string            // steelmanned, not dismissed
  } | null
  confidence: number                // 0–1
  whatWouldChangeOurMind: string[]  // 2–3 concrete conditions
}
```

```ts
// phases.ts
Phase = 'intake' | 'casting' | 'statements' | 'rebuttal' | 'closing' | 'verdict'
SessionStatus = 'created' | Phase | 'done' | 'failed'
```

## SSE events (`events.ts`)

Envelope for every event:

```ts
Event<T> { seq: number, sessionId: string, ts: string, type: string, payload: T }
```

`seq` is a per-session monotonic integer assigned by the emitter — it is the SSE `id:` field and the replay cursor.

| type | payload | notes |
|---|---|---|
| `session_started` | `{ dilemma, context? }` | |
| `dilemma_parsed` | `{ summary, axesOfTension: string[], sidebarSize: number, capabilityWeights }` | from intake; N clamped 3–6, default 4; weights drive model routing |
| `casting_started` | `{ poolSize, sidebarSize }` | |
| `persona_cast` | `{ member: CastMember, seat: number, runningDiversityScore, initialRead: string }` | ×N (sidebarSize), seat 0..N-1; `initialRead` = ≤140-char first take on the problem (distilled from the situation brief) → the member's first thinking bubble |
| `casting_done` | `{ diversityScore, baselineRatio, vectorMap: VectorPoint[] }` | ratio is the ≥1.3× KPI number; vectorMap feeds the sidebar graph |
| `statement_started` | `{ personaId, phase: 'opening' }` | |
| `statement_delta` | `{ personaId, text }` | token/chunk streaming |
| `statement_done` | `{ personaId, stance: Stance, fullText, bubble: string }` | `bubble` = model-written ≤140-char summary for the thinking bubble |
| `tool_call` | `{ personaId, tool: 'web_search'\|'calculator', input, callId }` | renders as chip |
| `tool_result` | `{ personaId, callId, summary }` | summary ≤140 chars for the chip |
| `rebuttal_started` | `{ personaId }` | |
| `rebuttal_delta` | `{ personaId, text }` | |
| `rebuttal_done` | `{ personaId, quotedPersonaId?, fullText, bubble: string }` | `bubble` = ≤140-char read of the others' positions; quoted target drives the quote highlight |
| `stance_updated` | `{ personaId, from: Stance, to: Stance }` | the "member changed their mind" beat |
| `closing_started` | `{ personaId }` | member turns to address the Chair |
| `closing_delta` | `{ personaId, text }` | |
| `closing_done` | `{ personaId, finalStance: Stance, fullText, bubble: string }` | `bubble` = ≤140-char pitch summary shown facing the Chair; stance LOCKED |
| `verdict_started` | `{}` | gavel raise |
| `verdict_delta` | `{ text }` | |
| `verdict_done` | `{ verdict: Verdict, briefMd: string }` | briefMd = exportable decision brief |
| `agent_recused` | `{ personaId, reason: 'timeout'\|'error' }` | empty-seat state |
| `session_done` | `{ status: 'done', metrics: OpsMetrics }` | UI: session crystallizes into a memory orb |
| `error` | `{ message, fatal: boolean }` | fatal ⇒ session `failed` |

```ts
OpsMetrics { firstCastMs, firstTokenMs, verdictMs, totalCostUsd, recusals: number }

VectorPoint {              // 2D projection of a member's stance-profile embedding (spec 05 §Projection)
  personaId: string
  x: number, y: number     // PCA coords normalized to [-1, 1]
  seat: number             // 0..N-1; color assignment is by seat (spec 07)
}
```

## REST endpoints (also contract-typed)

- `GET /sessions?q=<text>&limit=25` → `{ sessions: [{ id, dilemma, createdAt, status, orb: { hues: string[], voteSplit } }] }` — powers the memory-orb field and the past-conversation search bar (text search on dilemma, spec 03).
- `GET /sessions/:id` (metadata) and `GET /sessions/:id/events` (replay log) — spec 03 §Access policy.

## Guarantees

1. **Ordering:** events arrive strictly by `seq`; a client resuming with `Last-Event-ID: n` receives everything with `seq > n`.
2. **Replay equivalence:** a finished session replayed from the DB produces the byte-identical event sequence the live client saw. One rendering path serves live, replay, fixtures, and demo mode.
3. **Additive changes only** after hour 0: new optional fields and new event types are allowed; renaming/removing requires all-four sign-off.
4. Every `statement_started` is eventually closed by `statement_done` or `agent_recused` — the UI never waits forever.
