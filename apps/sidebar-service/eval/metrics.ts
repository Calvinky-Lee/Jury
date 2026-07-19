// Deliberation-quality KPIs (spec 08) computed straight from event payloads —
// no model calls, deterministic, unit-testable the same way MMR is meant to
// be for P2. run-eval.ts aggregates these across the 20-dilemma benchmark set.

export interface CastingDoneEventPayload {
  diversityScore: number;
  baselineRatio: number;
}

export interface StatementDoneEventPayload {
  personaId: string;
  stance: { recommendation: string };
}

/** The sidebar-diversity KPI for one session — target is >=1.3 (spec 08). */
export function diversityRatio(castingDone: CastingDoneEventPayload): number {
  return castingDone.baselineRatio;
}

/**
 * True if this session's pre-rebuttal opening stances show >=2 distinct
 * recommendations (normalized). One session's raw signal — genuineDissentRate()
 * below aggregates these into the actual spec-08 percentage.
 */
export function hasGenuineDissent(statementDoneEvents: StatementDoneEventPayload[]): boolean {
  const normalized = new Set(
    statementDoneEvents.map((e) => e.stance.recommendation.trim().toLowerCase()),
  );
  return normalized.size >= 2;
}

/** % of sessions with genuine dissent — spec 08 target >= 75%. */
export function genuineDissentRate(sessionHadDissent: boolean[]): number {
  if (sessionHadDissent.length === 0) return 0;
  return sessionHadDissent.filter(Boolean).length / sessionHadDissent.length;
}

/**
 * stance_updated count / total rebuttals — spec 08 target band 10-40%
 * (0% = theater, >40% = sycophancy). Pass per-session or summed-across-a-run
 * counts depending on what scope you want the ratio over.
 */
export function stanceUpdateRate(stanceUpdatedCount: number, totalRebuttals: number): number {
  if (totalRebuttals === 0) return 0;
  return stanceUpdatedCount / totalRebuttals;
}
