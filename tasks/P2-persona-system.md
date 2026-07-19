# P2 — Persona System

**Mission:** Own the persona library and the casting math. Your job is that the vector DB is *load-bearing*: casting must produce councils that are relevant to the dilemma AND measurably more diverse than random — that number goes on screen.

**Spec:** `../specs/00-overview.md` (§5 persona system, §7 data model)

## What you provide / what you consume

- **Provide:** the casting API P1 calls — `castCouncil(dilemma text) → { members: [4 × {identity, stance_profile, mmr_score}], diversity_score, baseline_ratio, vector_map }`.
- **Consume:** P4's MongoDB Atlas cluster and index-setup workflow; the persona schema slot in `packages/contract`.
- **Contract ownership:** persona schema (identity fields vs. stance-profile fields) and the `persona_cast` event payload.

## Ordered tasks

1. **Hour 0 — co-sign the event contract.** Your stake: persona record shape and `persona_cast` payload (card data + running diversity score).
2. **Persona schema.** Split identity (name, archetype, voice, **avatar `{hue, form}`**, domains) from **stance profile** (core values, biases, decision style). Only the stance profile is embedded — bio embeddings measure vibes, not behavior. Document this rationale in the schema file. Avatar comes from the frontend's fixed set (12 hues × ~4 SVG forms, spec 07), assigned by temperament (warm/impulsive vs. cool/analytical hues; spiky vs. round forms) — coordinate the palette with the frontend owner at hour 1 so library generation can assign it. Original names only (Pixar/Disney blocklist check).
3. **Library generation script (spec + prompts).** ~200 general-purpose personas spanning decision domains (business, career, money, personal, ethics). Includes a quality rubric: distinct decision style, at least one explicit bias, a voice that survives one sentence of reading. Generation is offline/one-time; output is seed data, reviewed before loading.
4. **Embedding pipeline.** Canonical stance-profile text → Voyage `voyage-3` (MongoDB-owned; swappable with a one-line rationale added to the spec). Store in `personas.embedding` via `seed/load-mongo.ts`.
5. **Atlas Vector Search setup.** Collection per spec 03, vector search index (cosine, 1024 dims), `$vectorSearch` top-K query (K=25, `numCandidates: 100`).
6. **MMR casting.** `score = λ·sim(dilemma, persona) − (1−λ)·max sim(persona, selected)`, λ≈0.6, select N (size passed in from the Chair's intake, 3–6). **Deterministic unit tests with fixed embeddings** — casting must be testable without any model call.
7. **Diversity score.** Mean pairwise distance of the cast, normalized against per-size random-cast baselines `DIVERSITY_BASELINE[n]`, n ∈ 3–6 (precomputed over the library). Target ≥1.3× baseline. This is the number the UI shows during casting theater.
8. **2D projection (`project.ts`).** Per-session PCA over the top-25 retrieval pool; project the N cast embeddings, normalize to [-1,1]² → `vector_map` in `casting_done` (spec 05 §project.ts). Feeds P3's vector-graph sidebar. Deterministic; unit-tested with synthetic embeddings.
9. **Casting API surface.** Function or thin endpoint per the Provide contract above; wire into P1's pipeline at the hour-12 checkpoint.
10. **Stretch — output-diversity gate.** Embed the opening statements; flag pairs above a similarity threshold. Only start this after the hour-12 checkpoint passes and P1's KPIs are being measured.

## Checkpoints

- **Hour ~6:** schema + MMR selection passing deterministic tests on synthetic embeddings; library generation prompts drafted.
- **Hour ~12:** real library loaded, casting API returning live results into P1's skeleton deliberation.
- **After:** λ tuning against the diversity-score and genuine-dissent KPIs; library quality passes.

## Definition of done

Casting on the 20-dilemma benchmark yields diversity ≥1.3× random baseline on every dilemma, MMR tests are deterministic and green, and the `persona_cast` events render correctly in P3's UI.
