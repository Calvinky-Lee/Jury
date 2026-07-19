# 05 — Persona System — P2

## Library generation (offline, `seed/generate-personas.ts`)

- ~200 personas via LLM generation (Gemini Flash tier), batched by decision domain: business, career, money, personal, ethics, creative — plus deliberate generalists.
- **Quality rubric (enforced by a validation pass, regenerate failures):**
  1. Distinct decision style in one sentence
  2. ≥1 explicit bias (a real flaw, not a humblebrag)
  3. Voice survives one sentence of reading
  4. `avatar {hue, form}` from the fixed 12-color palette + SVG form set (spec 07), assigned by temperament (warm/impulsive hues vs. cool/analytical, spiky vs. round forms) — balanced so no hue exceeds ~10% of the library
  5. Original names only — automated check against a Pixar/Disney character-name blocklist
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
- One batch call at seed time → `personas.embedding` via `seed/load-mongo.ts` (Atlas Vector Search index per spec 03; Voyage being MongoDB-owned makes this pairing first-class).
- **Baseline precompute:** sample 1,000 random casts at EACH council size n ∈ 3–6; store mean pairwise cosine distance as `DIVERSITY_BASELINE[n]` (constants checked into `casting/diversity.ts` with the seed batch id). The UI ratio = cast diversity / baseline.

## Casting at query time (`casting/`)

```
dilemma ──intake(P1)──▶ parsed text ──embed('query')──▶ vector
   ──Atlas $vectorSearch top-25 (cosine)──▶ pool
   ──MMR select N──▶ cast ──diversity score + 2D projection──▶ persona_cast / casting_done events
```

### `retrieve.ts`
Top-K=25 via the `$vectorSearch` aggregation stage (`numCandidates: 100, limit: 25`, cosine). Embeds the *parsed* dilemma (summary + axes of tension), not raw user text — the axes are what members must be relevant to.

### `mmr.ts` — pure function, deterministic, unit-tested with synthetic embeddings
```
score(p) = λ·sim(dilemma, p) − (1−λ)·max_{s∈selected} sim(p, s),   λ = 0.6
```
Greedy: first pick is pure relevance; each next pick is penalized for proximity to anyone seated. λ is a named constant; tuning it against the KPIs (spec 08) requires logging old→new and observed effect here.

Required unit tests (no model calls): identical-pool ⇒ deterministic output; a clone of a selected persona is never picked; λ=1 degenerates to pure top-4 relevance; λ=0 degenerates to farthest-point.

### `diversity.ts`
`diversityScore = mean pairwise cosine distance of the N selected`; `baselineRatio = diversityScore / DIVERSITY_BASELINE[N]`. Target ≥1.3 on every benchmark dilemma.

### `project.ts` — 2D projection for the sidebar vector graph
PCA over the **top-25 retrieval pool** (not just the cast — the pool defines the local axes of variation for this dilemma), fitted per session, then the N cast embeddings are projected and normalized to `[-1, 1]²` → `VectorPoint[]` in the `casting_done` payload. Plain TS (power iteration on the 25×25 covariance is enough at this size — no math dependency beyond what mathjs already provides). Deterministic given the pool ⇒ unit-testable with synthetic embeddings. Purpose: the graph makes "these personalities are far apart" *visible*; hovering a vector shows the personality summary (spec 07).

## API provided to P1

```ts
castCouncil(parsedDilemma: string, size: number): Promise<{   // size = intake's councilSize, 3–6
  members: CastMember[]        // N, seats 0..N-1, WITHOUT situationBrief (P1 writes those)
  diversityScore: number
  baselineRatio: number
  vectorMap: VectorPoint[]     // 2D PCA coords per cast member (contract)
}>
```

(`CastMember.situationBrief` is filled by the Chair immediately after casting; the contract type marks it optional-at-casting.)

## Stretch — output-diversity gate (only after hour-12 checkpoint)

Embed the opening statements (`voyage-3`, `'document'`); if any pair's cosine similarity exceeds a threshold (initial 0.90, tuned on benchmark data), emit a warning metric. v1 only *measures* — no automatic recasting; recast-on-converge is a fast-follow if eval shows the proxy failing.
