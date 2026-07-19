import { describe, it, expect } from 'vitest';
import { runDeliberation, type DeliberationDeps } from './orchestrator.js';
import { FakeModelClient, fakeClientWithResponse, type ModelClient } from './model-client.js';
import { FakeCastingProvider, FakeToolExecutor, InMemoryEmitter } from './ports.js';
import { IntakeResultSchema, SituationBriefSchema, MemberPhaseOutputSchema, type PersonaForBrief } from './types.js';
import { splitIdealVerdict } from './prompts/__fixtures__/verdict-fixtures.js';

const DILEMMA = 'Should our startup switch to annual billing?';

const personas: PersonaForBrief[] = [
  { id: 'actuary', name: 'The Actuary', archetype: 'Risk quantifier', voice: 'measured', coreValues: ['risk quantification'], biases: ['overweights downside'], decisionStyle: 'cautious' },
  { id: 'gambler', name: 'The Gambler', archetype: 'Bold upside-seeker', voice: 'punchy', coreValues: ['seizing windows'], biases: ['discounts downside'], decisionStyle: 'fast' },
  { id: 'traditionalist', name: 'The Traditionalist', archetype: 'Status-quo guardian', voice: 'protective', coreValues: ['customer trust'], biases: ['overweights past disruption'], decisionStyle: 'precedent-driven' },
  { id: 'pragmatist', name: 'The Pragmatist', archetype: 'Practical middle path', voice: 'even-keeled', coreValues: ['optionality'], biases: ['avoids extremes'], decisionStyle: 'balanced' },
];

const idealIntake = {
  summary: 'Deciding whether to switch to annual billing.',
  axesOfTension: ['cash-flow predictability vs. customer flexibility', 'growth speed vs. churn risk'],
  decisionType: 'business',
  councilSize: 4,
};

const idealBrief = {
  brief: 'This dilemma is exactly the kind of pricing shift that deserves careful scrutiny.',
  initialRead: 'Worth a careful look.',
};

const idealMemberOutput = {
  fullText: 'Some in-character reasoning about the annual billing dilemma.',
  recommendation: 'Switch to annual billing.',
  confidence: 0.7,
  keyReasons: ['Reason A', 'Reason B'],
  bubble: 'Leaning toward switching.',
};

function buildSmartModelClient(opts: { slowPersonaNames?: string[]; slowDelayMs?: number } = {}): ModelClient {
  const slowNames = opts.slowPersonaNames ?? [];
  return new FakeModelClient(async ({ system, schema }) => {
    if (schema === IntakeResultSchema) return idealIntake;
    if (schema === SituationBriefSchema) return idealBrief;
    if (schema === MemberPhaseOutputSchema) {
      if (slowNames.some((name) => system.includes(name))) {
        await new Promise((resolve) => setTimeout(resolve, opts.slowDelayMs ?? 300));
      }
      return idealMemberOutput;
    }
    throw new Error('unexpected schema requested in orchestrator test fake');
  });
}

function baseDeps(overrides: Partial<DeliberationDeps> = {}): DeliberationDeps {
  return {
    modelClient: buildSmartModelClient(),
    verdictModelClient: fakeClientWithResponse(splitIdealVerdict),
    castingProvider: new FakeCastingProvider(personas, 0.8, 1.4),
    toolExecutor: new FakeToolExecutor(),
    emitter: new InMemoryEmitter(),
    ...overrides,
  };
}

describe('orchestrator — happy path, all 4 members', () => {
  it('runs every phase in order and produces a valid verdict', async () => {
    const emitter = new InMemoryEmitter();
    const deps = baseDeps({ emitter });

    await runDeliberation('session-a', DILEMMA, undefined, deps);

    const types = emitter.events.map((e) => e.type);
    const firstIdx = (t: string) => types.indexOf(t);
    const lastIdx = (t: string) => types.lastIndexOf(t);

    expect(types[0]).toBe('session_started');
    expect(firstIdx('dilemma_parsed')).toBeGreaterThan(firstIdx('session_started'));
    expect(firstIdx('casting_started')).toBeGreaterThan(firstIdx('dilemma_parsed'));
    expect(types.filter((t) => t === 'persona_cast').length).toBe(4);
    expect(firstIdx('casting_done')).toBeGreaterThan(lastIdx('persona_cast'));
    expect(firstIdx('statement_started')).toBeGreaterThan(firstIdx('casting_done'));
    expect(types.filter((t) => t === 'statement_done').length).toBe(4);
    expect(lastIdx('statement_done')).toBeLessThan(firstIdx('rebuttal_started'));
    expect(types.filter((t) => t === 'rebuttal_done').length).toBe(4);
    expect(lastIdx('rebuttal_done')).toBeLessThan(firstIdx('closing_started'));
    expect(types.filter((t) => t === 'closing_done').length).toBe(4);
    expect(lastIdx('closing_done')).toBeLessThan(firstIdx('verdict_started'));
    expect(firstIdx('verdict_done')).toBeGreaterThan(firstIdx('verdict_started'));
    expect(types[types.length - 1]).toBe('session_done');
    expect(types).not.toContain('agent_recused');
    expect(types).not.toContain('error');

    const verdictDone = emitter.events.find((e) => e.type === 'verdict_done');
    expect((verdictDone!.payload as any).verdict.dissent.who).toBe('traditionalist');

    const sessionDone = emitter.events.find((e) => e.type === 'session_done');
    expect((sessionDone!.payload as any).metrics.recusals).toBe(0);

    // every event carries the sessionId (contract envelope)
    expect(emitter.events.every((e) => e.sessionId === 'session-a')).toBe(true);
  });
});

describe('orchestrator — one member times out during statements', () => {
  it('recuses the slow member and completes with the remaining 3', async () => {
    const emitter = new InMemoryEmitter();
    const deps = baseDeps({
      emitter,
      modelClient: buildSmartModelClient({ slowPersonaNames: ['The Gambler'], slowDelayMs: 300 }),
      timeouts: { statementMs: 50, rebuttalMs: 2000, closingMs: 2000 },
    });

    await runDeliberation('session-b', DILEMMA, undefined, deps);

    const types = emitter.events.map((e) => e.type);
    const recusedEvents = emitter.events.filter((e) => e.type === 'agent_recused');
    expect(recusedEvents.length).toBe(1);
    expect(recusedEvents[0]!.payload).toMatchObject({ personaId: 'gambler', reason: 'timeout' });

    expect(types.filter((t) => t === 'statement_done').length).toBe(3);
    expect(types.filter((t) => t === 'rebuttal_done').length).toBe(3);
    expect(types.filter((t) => t === 'closing_done').length).toBe(3);
    expect(types).not.toContain('error');
    expect(types[types.length - 1]).toBe('session_done');

    const sessionDone = emitter.events.find((e) => e.type === 'session_done');
    expect((sessionDone!.payload as any).metrics.recusals).toBe(1);
  });
});

describe('orchestrator — recusals drop below the minimum viable council', () => {
  it('fails the session with a fatal error and never reaches a verdict', async () => {
    const emitter = new InMemoryEmitter();
    const deps = baseDeps({
      emitter,
      modelClient: buildSmartModelClient({
        slowPersonaNames: ['The Gambler', 'The Traditionalist', 'The Pragmatist'],
        slowDelayMs: 300,
      }),
      timeouts: { statementMs: 50, rebuttalMs: 2000, closingMs: 2000 },
    });

    await runDeliberation('session-c', DILEMMA, undefined, deps);

    const types = emitter.events.map((e) => e.type);
    expect(types.filter((t) => t === 'agent_recused').length).toBe(3);
    expect(types).toContain('error');
    expect(types).not.toContain('verdict_done');
    expect(types).not.toContain('session_done');

    const errorEvent = emitter.events.find((e) => e.type === 'error');
    expect((errorEvent!.payload as any).fatal).toBe(true);
  });
});
