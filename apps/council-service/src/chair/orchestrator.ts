import { transition, shouldFailFromRecusals } from './state-machine.js';
import {
  STATEMENT_TIMEOUT_MS,
  REBUTTAL_TIMEOUT_MS,
  CLOSING_TIMEOUT_MS,
} from './model-config.js';
import type { ModelClient } from './model-client.js';
import type { CastingProvider, ToolExecutor, Emitter } from './ports.js';

type Emit = (type: string, payload: unknown) => Promise<void>;
import { runIntake } from './prompts/intake.js';
import { runBrief } from './prompts/brief.js';
import { runStatement } from './prompts/statement.js';
import { runRebuttal, didStanceChange, type OtherMemberContext } from './prompts/rebuttal.js';
import { runClosing } from './prompts/closing.js';
import { runVerdict, type VerdictPromptInput } from './prompts/verdict.js';
import type {
  SessionStatus,
  PersonaForBrief,
  SituationBrief,
  MemberPhaseOutput,
  Stance,
} from './types.js';

export interface DeliberationDeps {
  modelClient: ModelClient; // Flash tier — intake, briefs, statements, rebuttals, closings
  verdictModelClient: ModelClient; // Pro tier — verdict only
  castingProvider: CastingProvider;
  toolExecutor: ToolExecutor; // seam only — not invoked yet, see statement.ts
  emitter: Emitter;
  timeouts?: {
    statementMs?: number;
    rebuttalMs?: number;
    closingMs?: number;
  };
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer!: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

function recusalReason(err: unknown): 'timeout' | 'error' {
  return err instanceof Error && err.message.includes('timed out') ? 'timeout' : 'error';
}

function toStance(output: MemberPhaseOutput): Stance {
  return {
    recommendation: output.recommendation,
    confidence: output.confidence,
    keyReasons: output.keyReasons,
  };
}

/**
 * Runs one phase across the currently-active members in parallel. Any member
 * whose call rejects or times out is recused (removed from `active`) and the
 * phase continues with the rest. Returns the per-member outputs for members
 * that succeeded.
 */
async function runMemberPhase(
  active: PersonaForBrief[],
  timeoutMs: number,
  emit: Emit,
  startEventType: string,
  deltaEventType: string,
  doneEventType: string,
  run: (member: PersonaForBrief) => Promise<MemberPhaseOutput>,
): Promise<{ outputs: Map<string, MemberPhaseOutput>; recused: Set<string> }> {
  const outputs = new Map<string, MemberPhaseOutput>();
  const recused = new Set<string>();

  const settled = await Promise.allSettled(
    active.map(async (member) => {
      await emit(startEventType, { personaId: member.id });
      const output = await withTimeout(run(member), timeoutMs);
      await emit(deltaEventType, { personaId: member.id, text: output.fullText });
      await emit(doneEventType, {
        personaId: member.id,
        fullText: output.fullText,
        bubble: output.bubble,
        stance: toStance(output),
      });
      return { member, output };
    }),
  );

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i];
    const member = active[i];
    if (result.status === 'fulfilled') {
      outputs.set(member.id, result.value.output);
    } else {
      recused.add(member.id);
      await emit('agent_recused', { personaId: member.id, reason: recusalReason(result.reason) });
    }
  }

  return { outputs, recused };
}

function strongestOpposingPoint(
  member: PersonaForBrief,
  active: PersonaForBrief[],
  outputs: Map<string, MemberPhaseOutput>,
): string {
  const own = outputs.get(member.id)!;
  const opposing = active.find(
    (m) =>
      m.id !== member.id &&
      outputs.get(m.id)!.recommendation.trim().toLowerCase() !== own.recommendation.trim().toLowerCase(),
  );
  if (!opposing) return 'No other member currently holds a materially different position.';
  const opposingOutput = outputs.get(opposing.id)!;
  return `${opposing.name}: ${opposingOutput.keyReasons[0] ?? opposingOutput.recommendation}`;
}

export async function runDeliberation(
  sessionId: string,
  dilemma: string,
  context: string | undefined,
  deps: DeliberationDeps,
): Promise<void> {
  const startedAt = Date.now();
  const emit: Emit = (type, payload) => deps.emitter.emit({ sessionId, type, payload });
  const statementMs = deps.timeouts?.statementMs ?? STATEMENT_TIMEOUT_MS;
  const rebuttalMs = deps.timeouts?.rebuttalMs ?? REBUTTAL_TIMEOUT_MS;
  const closingMs = deps.timeouts?.closingMs ?? CLOSING_TIMEOUT_MS;

  let status: SessionStatus = 'created';
  let recusedCount = 0;
  let firstCastMs: number | undefined;
  let firstTokenMs: number | undefined;

  const fail = async (reason: string) => {
    status = transition(status, { type: 'fatal_error', reason });
    await emit('error', { message: reason, fatal: true });
  };

  status = transition(status, { type: 'start' });
  await emit('session_started', { dilemma, context });

  // --- Intake ---------------------------------------------------------------
  const intake = await runIntake(deps.modelClient, dilemma, context);
  await emit('dilemma_parsed', {
    summary: intake.summary,
    axesOfTension: intake.axesOfTension,
    councilSize: intake.councilSize,
  });
  status = transition(status, { type: 'phase_done', phase: 'intake' });

  // --- Casting ---------------------------------------------------------------
  await emit('casting_started', { poolSize: 25, councilSize: intake.councilSize });
  const casting = await deps.castingProvider.castCouncil(dilemma);
  const totalMembers = casting.members.length;

  const briefs = new Map<string, SituationBrief>();
  let seat = 0;
  for (const member of casting.members) {
    const brief = await runBrief(deps.modelClient, member, intake);
    briefs.set(member.id, brief);
    await emit('persona_cast', {
      member: { ...member, situationBrief: brief.brief, mmrScore: 0 },
      seat,
      runningDiversityScore: casting.diversityScore,
      initialRead: brief.initialRead,
    });
    seat++;
  }
  firstCastMs = Date.now() - startedAt;
  await emit('casting_done', {
    diversityScore: casting.diversityScore,
    baselineRatio: casting.baselineRatio,
    vectorMap: [],
  });
  status = transition(status, { type: 'phase_done', phase: 'casting' });

  let active = [...casting.members];

  // --- Statements --------------------------------------------------------------
  const statementRun = await runMemberPhase(
    active,
    statementMs,
    emit,
    'statement_started',
    'statement_delta',
    'statement_done',
    (member) => runStatement(deps.modelClient, member, briefs.get(member.id)!, dilemma),
  );
  firstTokenMs = Date.now() - startedAt;
  recusedCount += statementRun.recused.size;
  active = active.filter((m) => !statementRun.recused.has(m.id));
  if (shouldFailFromRecusals(totalMembers, recusedCount)) {
    await fail('too many members recused during statements');
    return;
  }
  status = transition(status, { type: 'phase_done', phase: 'statements' });

  // --- Rebuttal ------------------------------------------------------------
  const rebuttalRun = await runMemberPhase(
    active,
    rebuttalMs,
    emit,
    'rebuttal_started',
    'rebuttal_delta',
    'rebuttal_done',
    (member) => {
      const ownStatement = statementRun.outputs.get(member.id)!;
      const others: OtherMemberContext[] = active
        .filter((m) => m.id !== member.id)
        .map((m) => {
          const stmt = statementRun.outputs.get(m.id)!;
          return { name: m.name, archetype: m.archetype, stance: toStance(stmt), fullText: stmt.fullText };
        });
      return runRebuttal(deps.modelClient, member, ownStatement.fullText, others);
    },
  );
  for (const [personaId, output] of rebuttalRun.outputs) {
    const before = toStance(statementRun.outputs.get(personaId)!);
    const after = toStance(output);
    if (didStanceChange(before, after)) {
      await emit('stance_updated', { personaId, from: before, to: after });
    }
  }
  recusedCount += rebuttalRun.recused.size;
  active = active.filter((m) => !rebuttalRun.recused.has(m.id));
  if (shouldFailFromRecusals(totalMembers, recusedCount)) {
    await fail('too many members recused during rebuttal');
    return;
  }
  status = transition(status, { type: 'phase_done', phase: 'rebuttal' });

  // --- Closing ---------------------------------------------------------------
  const closingRun = await runMemberPhase(
    active,
    closingMs,
    emit,
    'closing_started',
    'closing_delta',
    'closing_done',
    (member) => {
      const postRebuttal = toStance(rebuttalRun.outputs.get(member.id)!);
      const opposingPoint = strongestOpposingPoint(member, active, rebuttalRun.outputs);
      return runClosing(deps.modelClient, member, postRebuttal, opposingPoint);
    },
  );
  recusedCount += closingRun.recused.size;
  active = active.filter((m) => !closingRun.recused.has(m.id));
  if (shouldFailFromRecusals(totalMembers, recusedCount)) {
    await fail('too many members recused during closing');
    return;
  }
  status = transition(status, { type: 'phase_done', phase: 'closing' });

  // --- Verdict -----------------------------------------------------------------
  await emit('verdict_started', {});
  const verdictInput: VerdictPromptInput = {
    dilemma,
    axesOfTension: intake.axesOfTension,
    members: active.map((m) => ({ id: m.id, name: m.name, archetype: m.archetype })),
    lockedStances: Object.fromEntries(
      active.map((m) => [m.id, toStance(closingRun.outputs.get(m.id)!)]),
    ),
    transcripts: Object.fromEntries(
      active.map((m) => [
        m.id,
        {
          statement: statementRun.outputs.get(m.id)!.fullText,
          rebuttal: rebuttalRun.outputs.get(m.id)!.fullText,
          closing: closingRun.outputs.get(m.id)!.fullText,
        },
      ]),
    ),
  };
  const { verdict, briefMd } = await runVerdict(deps.verdictModelClient, verdictInput);
  const verdictMs = Date.now() - startedAt;
  await emit('verdict_done', { verdict, briefMd });
  status = transition(status, { type: 'phase_done', phase: 'verdict' });

  await emit('session_done', {
    status: 'done',
    metrics: {
      firstCastMs: firstCastMs ?? 0,
      firstTokenMs: firstTokenMs ?? 0,
      verdictMs,
      totalCostUsd: 0,
      recusals: recusedCount,
    },
  });
}
