import { describe, it, expect } from 'vitest';
import {
  transition,
  nextPhaseAfter,
  shouldFailFromRecusals,
  activeMemberCount,
  IllegalTransitionError,
  MIN_ACTIVE_MEMBERS,
} from './state-machine.js';
import { PHASES, type SessionStatus } from './types.js';

describe('state machine — happy path', () => {
  it('walks created -> intake -> ... -> verdict -> done in order', () => {
    let status: SessionStatus = 'created';
    status = transition(status, { type: 'start' });
    expect(status).toBe('intake');

    for (const phase of PHASES) {
      expect(status).toBe(phase);
      status = transition(status, { type: 'phase_done', phase });
    }
    expect(status).toBe('done');
  });

  it('nextPhaseAfter returns "done" only after the last phase', () => {
    expect(nextPhaseAfter('intake')).toBe('casting');
    expect(nextPhaseAfter('verdict')).toBe('done');
  });
});

describe('state machine — illegal transitions throw', () => {
  it('rejects "start" from anywhere but created', () => {
    expect(() => transition('intake', { type: 'start' })).toThrow(IllegalTransitionError);
  });

  it('rejects phase_done for a phase that does not match current status', () => {
    expect(() => transition('intake', { type: 'phase_done', phase: 'rebuttal' })).toThrow(
      IllegalTransitionError,
    );
  });

  it('rejects any event once a session is terminal (done or failed)', () => {
    expect(() => transition('done', { type: 'phase_done', phase: 'intake' })).toThrow(
      IllegalTransitionError,
    );
    expect(() => transition('failed', { type: 'start' })).toThrow(IllegalTransitionError);
  });
});

describe('state machine — fatal errors', () => {
  it('a fatal_error is legal from any non-terminal phase and always lands on failed', () => {
    for (const phase of PHASES) {
      expect(transition(phase, { type: 'fatal_error', reason: 'boom' })).toBe('failed');
    }
    expect(transition('created', { type: 'fatal_error', reason: 'boom' })).toBe('failed');
  });
});

describe('recusal / minimum active members', () => {
  it('4 members, 1 recused -> 3 active, session survives', () => {
    expect(activeMemberCount(4, 1)).toBe(3);
    expect(shouldFailFromRecusals(4, 1)).toBe(false);
  });

  it('exactly MIN_ACTIVE_MEMBERS active is still viable', () => {
    expect(activeMemberCount(4, 2)).toBe(MIN_ACTIVE_MEMBERS);
    expect(shouldFailFromRecusals(4, 2)).toBe(false);
  });

  it('dropping below MIN_ACTIVE_MEMBERS is fatal', () => {
    expect(activeMemberCount(4, 3)).toBe(1);
    expect(shouldFailFromRecusals(4, 3)).toBe(true);
  });
});
