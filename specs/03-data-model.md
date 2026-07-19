# 03 — Data Model (Supabase)

Postgres + pgvector. Migrations live in `supabase/migrations/`, applied by P4; the `personas` table is co-designed with P2.

## Tables

```sql
create extension if not exists vector;

create table personas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  archetype text not null,
  species text not null,              -- from the fixed art-set enum (spec 07)
  profile jsonb not null,             -- PersonaIdentity fields (voice, domains, avatarSeed)
  stance_profile text not null,       -- canonical text that was embedded (spec 05)
  embedding vector(1024) not null     -- voyage-3
);
create index personas_embedding_idx on personas
  using hnsw (embedding vector_cosine_ops);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  dilemma text not null,
  context text,
  status text not null default 'created',   -- SessionStatus enum (contract)
  created_at timestamptz not null default now()
);

create table castings (
  session_id uuid references sessions(id),
  persona_id uuid references personas(id),
  seat int not null check (seat between 0 and 3),
  situation_brief text not null,
  mmr_score real not null,
  diversity_score real,               -- populated on casting_done
  primary key (session_id, seat)
);

create table statements (
  id bigint generated always as identity primary key,
  session_id uuid references sessions(id),
  persona_id uuid references personas(id),
  phase text not null check (phase in ('opening','rebuttal')),
  stance jsonb,                       -- Stance (contract); null for pure rebuttal text
  text text not null,
  tool_calls jsonb not null default '[]'
);

create table verdicts (
  session_id uuid primary key references sessions(id),
  verdict jsonb not null,             -- Verdict (contract)
  brief_md text not null
);

create table events (                 -- the replay log; powers everything (spec 02 §Guarantees)
  session_id uuid references sessions(id),
  seq int not null,
  type text not null,
  payload jsonb not null,
  ts timestamptz not null default now(),
  primary key (session_id, seq)
);
```

## Access policy

- **Council service** uses the service-role key: full read/write.
- **Frontend** uses the anon key with RLS: `select` only, and only on rows whose session `status in ('done','failed')` — live sessions stream via SSE, never via DB reads. `personas` is anon-readable (it's content, not user data).
- No user accounts in v1 ⇒ no user-scoped RLS. Session ids are unguessable uuids; a share link is possession-based access. Acceptable for a hackathon; noted as a non-goal.

## Notes

- `events` is intentionally denormalized (payload jsonb): the replay log is the product's backbone, and schema churn there is the most expensive kind. The typed tables (`statements`, `verdicts`, `castings`) exist for queries, eval, and the replay *pages* — the `events` log is for stream resume and demo mode.
- Statement/rebuttal text is duplicated between `events` and `statements` — accepted; storage is trivial at hackathon scale and it keeps both read paths simple.
- Expected scale: tens of sessions, ~500 events/session. No partitioning, no cleanup jobs.
