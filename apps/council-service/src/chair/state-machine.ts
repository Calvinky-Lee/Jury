import { PHASES, type Phase, type SessionStatus } from './types.js';

// Plain data-first state machine (spec 04 §State machine) — no framework.
//
//   created -> intake -> casting -> statements -> rebuttal -> closing -> verdict -> done
//                            \-- (fatal error, any non-terminal phase) --> failed
//
// This module only decides what the NEXT status is for a given event; it does not
// emit contract events or persist anything — the orchestrator (step 8) calls this,
// then hands the result to P4's emitter.

export class IllegalTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IllegalTransitionError';
  }
}

export type TransitionEvent =
  | { type: 'start' }
  | { type: 'phase_done'; phase: Phase }
  | { type: 'fatal_error'; reason: string };

const TERMINAL_STATUSES: SessionStatus[] = ['done', 'failed'];

/** The phase that follows `phase` on the happy path, or 'done' if `phase` is the last one. */
export function nextPhaseAfter(phase: Phase): Phase | 'done' {
  const idx = PHASES.indexOf(phase);
  return idx === PHASES.length - 1 ? 'done' : PHASES[idx + 1];
}

/**
 * Computes the next SessionStatus for a given event. Throws IllegalTransitionError
 * on any transition the spec doesn't allow — fails loudly rather than silently
 * putting a session into an inconsistent state.
 */
export function transition(current: SessionStatus, event: TransitionEvent): SessionStatus {
  if (TERMINAL_STATUSES.includes(current)) {
    throw new IllegalTransitionError(
      `session is terminal ('${current}'); cannot process event '${event.type}'`,
    );
  }

  switch (event.type) {
    case 'start':
      if (current !== 'created') {
        throw new IllegalTransitionError(`'start' is only valid from 'created', got '${current}'`);
      }
      return 'intake';

    case 'phase_done':
      if (current !== event.phase) {
        throw new IllegalTransitionError(
          `phase_done('${event.phase}') does not match current status '${current}'`,
        );
      }
      return nextPhaseAfter(event.phase);

    // A fatal error is legal from any non-terminal status — that's the whole point.
    case 'fatal_error':
      return 'failed';
  }
}

// --- Recusal / minimum-active-members rule (spec 04 §State machine) --------
//
// A member timeout/error during 'statements' or 'rebuttal' emits agent_recused
// and the phase continues with the remaining members. Below 2 active members,
// the session can no longer produce a meaningful deliberation and must fail.

export const MIN_ACTIVE_MEMBERS = 2;

export function activeMemberCount(totalMembers: number, recusedCount: number): number {
  return totalMembers - recusedCount;
}

/** True once recusals have dropped the active council below the viable minimum. */
export function shouldFailFromRecusals(totalMembers: number, recusedCount: number): boolean {
  return activeMemberCount(totalMembers, recusedCount) < MIN_ACTIVE_MEMBERS;
}
