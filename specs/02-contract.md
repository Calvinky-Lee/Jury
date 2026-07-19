# 02 — The Contract (`packages/contract`)

Zod schemas in TypeScript; every boundary (SSE, DB payloads, tool results) parses through them and **fails loudly** on mismatch. This file is the human-readable form; the package is the executable form. Hour-0 deliverable — all four sign.

## Core types

```ts
// persona.ts
PersonaIdentity {
  id: string            // uuid
  name: string          // original character name — never a Disney name
  archetype: string     // "The Actuary", "The Gambler", …
  species: Species      // enum from the fixed art set (spec 07), e.g. 'owl' | 'fox' | 'tortoise' | …
  voice: string         // 1-sentence speech-style direction
  avatarSeed: string
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
  ruling: string                    // the Judge's recommendation, 1–3 sentences
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
Phase = 'intake' | 'casting' | 'statements' | 'rebuttal' | 'verdict'
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
| `dilemma_parsed` | `{ summary, axesOfTension: string[] }` | from intake |
| `casting_started` | `{ poolSize }` | |
| `persona_cast` | `{ member: CastMember, seat: 0-3, runningDiversityScore }` | ×4; UI empanels on each |
| `casting_done` | `{ diversityScore, baselineRatio }` | ratio is the ≥1.3× KPI number |
| `statement_started` | `{ personaId, phase: 'opening' }` | |
| `statement_delta` | `{ personaId, text }` | token/chunk streaming |
| `statement_done` | `{ personaId, stance: Stance, fullText }` | |
| `tool_call` | `{ personaId, tool: 'web_search'\|'calculator', input, callId }` | renders as chip |
| `tool_result` | `{ personaId, callId, summary }` | summary ≤140 chars for the chip |
| `rebuttal_started` | `{ personaId }` | |
| `rebuttal_delta` | `{ personaId, text }` | |
| `rebuttal_done` | `{ personaId, quotedPersonaId?, fullText }` | quoted target drives the quote highlight |
| `stance_updated` | `{ personaId, from: Stance, to: Stance }` | the "juror changed their mind" beat |
| `verdict_started` | `{}` | gavel raise |
| `verdict_delta` | `{ text }` | |
| `verdict_done` | `{ verdict: Verdict, briefMd: string }` | briefMd = exportable decision brief |
| `agent_recused` | `{ personaId, reason: 'timeout'\|'error' }` | empty-seat state |
| `session_done` | `{ status: 'done', metrics: OpsMetrics }` | |
| `error` | `{ message, fatal: boolean }` | fatal ⇒ session `failed` |

```ts
OpsMetrics { firstCastMs, firstTokenMs, verdictMs, totalCostUsd, recusals: number }
```

## Guarantees

1. **Ordering:** events arrive strictly by `seq`; a client resuming with `Last-Event-ID: n` receives everything with `seq > n`.
2. **Replay equivalence:** a finished session replayed from the DB produces the byte-identical event sequence the live client saw. One rendering path serves live, replay, fixtures, and demo mode.
3. **Additive changes only** after hour 0: new optional fields and new event types are allowed; renaming/removing requires all-four sign-off.
4. Every `statement_started` is eventually closed by `statement_done` or `agent_recused` — the UI never waits forever.
