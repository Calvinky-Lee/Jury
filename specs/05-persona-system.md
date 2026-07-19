# 05 — Persona System — P2

## Library generation (offline, `seed/generate-personas.ts`)

- ~200 personas via LLM generation (Sonnet), batched by decision domain: business, career, money, personal, ethics, creative — plus deliberate generalists.
- **Quality rubric (enforced by a validation pass, regenerate failures):**
  1. Distinct decision style in one sentence
  2. ≥1 explicit bias (a real flaw, not a humblebrag)
  3. Voice survives one sentence of reading
  4. `species` from the fixed art set (spec 07), chosen by folk temperament (owl=analyst, fox=cynic, tortoise=traditionalist, retriever=optimist…) — set balanced so no species exceeds ~10% of the library
  5. Original names only — automated check against a Disney/Zootopia name blocklist
- Output: `seed/personas.json`, human-reviewed before loading. This is seed *data*; regeneration is cheap and non-sacred.

## Embedding pipeline (`seed/embed-personas.ts`)

- **Canonical stance-profile text** (the ONLY thing embedded — bios measure vibes, not behavior):

```
Decision style: {decisionStyle}
Core values: {coreValues, comma-joined}
Biases: {biases, comma-joined}
Domains: {domains, comma-joined}
```

- Model: **Voyage `voyage-3`**, 1024 dims, `input_type: 'document'` for personas, `'query'` for dilemmas. Swappable behind one function (`embed(text, kind)`); swapping requires re-seeding and a rationale line here.
- One batch call at seed time → `personas.embedding` via `seed/load-supabase.ts`.
- **Baseline precompute:** sample 1,000 random 4-persona casts; store mean pairwise cosine distance as `DIVERSITY_BASELINE` (a constant checked into `casting/diversity.ts` with the seed batch id). The UI ratio = cast diversity / baseline.

## Casting at query time (`casting/`)

```
dilemma ──intake(P1)──▶ parsed text ──embed('query')──▶ vector
   ──pgvector top-25 (cosine, HNSW)──▶ pool
   ──MMR select 4──▶ cast ──diversity score──▶ persona_cast events
```

### `retrieve.ts`
Top-K=25 by cosine similarity. Embeds the *parsed* dilemma (summary + axes of tension), not raw user text — the axes are what jurors must be relevant to.

### `mmr.ts` — pure function, deterministic, unit-tested with synthetic embeddings
```
score(p) = λ·sim(dilemma, p) − (1−λ)·max_{s∈selected} sim(p, s),   λ = 0.6
```
Greedy: first pick is pure relevance; each next pick is penalized for proximity to anyone seated. λ is a named constant; tuning it against the KPIs (spec 08) requires logging old→new and observed effect here.

Required unit tests (no model calls): identical-pool ⇒ deterministic output; a clone of a selected persona is never picked; λ=1 degenerates to pure top-4 relevance; λ=0 degenerates to farthest-point.

### `diversity.ts`
`diversityScore = mean pairwise cosine distance of the 4 selected`; `baselineRatio = diversityScore / DIVERSITY_BASELINE`. Target ≥1.3 on every benchmark dilemma.

## API provided to P1

```ts
castCouncil(parsedDilemma: string): Promise<{
  members: CastMember[]        // 4, seats 0–3, WITHOUT situationBrief (P1 writes those)
  diversityScore: number
  baselineRatio: number
}>
```

(`CastMember.situationBrief` is filled by the Chair immediately after casting; the contract type marks it optional-at-casting.)

## Stretch — output-diversity gate (only after hour-12 checkpoint)

Embed the four opening statements (`voyage-3`, `'document'`); if any pair's cosine similarity exceeds a threshold (initial 0.90, tuned on benchmark data), emit a warning metric. v1 only *measures* — no automatic recasting; recast-on-converge is a fast-follow if eval shows the proxy failing.
