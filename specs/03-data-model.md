# 03 — Data Model (MongoDB Atlas)

MongoDB Atlas (free M0 tier) with **Atlas Vector Search** for the persona library. Document shapes are validated at the application boundary by the contract's zod schemas — the DB stores what the contract already guarantees. Index/collection setup lives in `seed/setup-indexes.ts` (idempotent), run by P4.

## Collections

```js
// personas — seeded offline (spec 05)
{
  _id: ObjectId,
  name: string,                 // original character name — never a Pixar/Disney name
  archetype: string,
  avatar: { hue: string, form: string },   // fixed palette + SVG form set (spec 07)
  profile: {                    // PersonaIdentity remainder
    voice: string, domains: [string]
  },
  stanceProfile: {              // what gets embedded
    coreValues: [string], biases: [string], decisionStyle: string
  },
  stanceProfileText: string,    // the exact canonical text that was embedded
  embedding: [number]           // 1024 floats, voyage-3
}

// sessions
{ _id: uuid, dilemma: string, context?: string, councilSize: int,
  status: string,               // SessionStatus enum (contract)
  createdAt: Date }

// castings — one doc per seat
{ sessionId: uuid, personaId: ObjectId, seat: int,   // 0..councilSize-1
  situationBrief: string, mmrScore: number,
  diversityScore?: number, vectorPoint?: { x: number, y: number } }

// statements
{ sessionId: uuid, personaId: ObjectId,
  phase: 'opening' | 'rebuttal' | 'closing',
  stance?: Stance,              // contract shape; locked final stance on closing
  text: string, toolCalls: [object] }

// verdicts
{ sessionId: uuid, verdict: Verdict, briefMd: string }   // contract shapes

// events — the replay log; powers stream resume, share links, fixtures, demo mode
{ sessionId: uuid, seq: int, type: string, payload: object, ts: Date }
```

## Indexes

```js
// Atlas Vector Search index (created via Atlas UI/CLI, definition checked into seed/)
{ name: 'personas_vector', collection: 'personas',
  fields: [{ type: 'vector', path: 'embedding', numDimensions: 1024, similarity: 'cosine' }] }

// Standard indexes
events:     { sessionId: 1, seq: 1 }  (unique)   // replay cursor
castings:   { sessionId: 1, seat: 1 } (unique)
statements: { sessionId: 1 }
sessions:   { createdAt: -1 }
sessions:   { dilemma: 'text' }                  // powers the past-conversation search bar
```

Retrieval query (spec 05) uses the `$vectorSearch` aggregation stage: `{ index: 'personas_vector', queryVector, path: 'embedding', numCandidates: 100, limit: 25 }`.

## Access policy

- **Only the council service talks to Atlas** (`MONGODB_URI` lives solely in the council service's local `.env`). There is no browser-safe read credential in MongoDB's model — so, unlike a Supabase/RLS design, the frontend NEVER reads the DB directly.
- Finished sessions are served by read endpoints on the council service: `GET /sessions/:id/events`, `GET /sessions/:id`, and `GET /sessions?q=` (list/search — text index above — powering the memory-orb field and search bar), consumed via the Next.js proxy. Replay pages and the golden-session recorder use the same endpoints.
- No user accounts in v1. Session ids are unguessable uuids; a share link is possession-based access. Acceptable for a hackathon; noted as a non-goal.

## Notes

- `events` is intentionally generic (`payload` object): the replay log is the product's backbone and schema churn there is the most expensive kind. The typed collections (`statements`, `verdicts`, `castings`) exist for queries, eval, and replay *pages*.
- Statement text is duplicated between `events` and `statements` — accepted; storage is trivial at hackathon scale and both read paths stay simple.
- Expected scale: tens of sessions, ~500 events/session. M0 free tier is ample; no TTL/cleanup jobs.
- **Why Mongo here:** Atlas Vector Search covers pgvector's job; documents fit the event log naturally; and Voyage AI (our embedding provider, spec 05) is MongoDB-owned — the pairing is first-class. Cost of the swap: the extra read endpoint above.
