# P1 — Deliberation State Machine

Implementation: [`apps/sidebar-service/src/chair/state-machine.ts`](../apps/sidebar-service/src/chair/state-machine.ts).
Spec: [`specs/04-deliberation-engine.md`](../specs/04-deliberation-engine.md) §State machine.

```mermaid
stateDiagram-v2
    [*] --> created
    created --> intake: start
    intake --> casting: phase_done(intake)
    casting --> statements: phase_done(casting)
    statements --> rebuttal: phase_done(statements)
    rebuttal --> closing: phase_done(rebuttal)
    closing --> verdict: phase_done(closing)
    verdict --> done: phase_done(verdict)

    created --> failed: fatal_error
    intake --> failed: fatal_error
    casting --> failed: fatal_error
    statements --> failed: fatal_error
    rebuttal --> failed: fatal_error
    closing --> failed: fatal_error
    verdict --> failed: fatal_error

    done --> [*]
    failed --> [*]
```

## Non-fatal degradation (recusal path)

During `statements` or `rebuttal`, an individual member timeout/error does **not**
fail the session — it emits `agent_recused` and the phase continues with the
remaining members.

- Minimum viable sidebar: **2 active members**.
- If recusals drop the active count below 2, that *is* a fatal error for the
  session (`shouldFailFromRecusals` in `state-machine.ts`).

This degradation happens *within* a phase (which members participate), not at
the phase-transition level above — the orchestrator (spec 04 task 9) is what
calls `shouldFailFromRecusals` after each recusal and raises a `fatal_error`
event into the state machine if the sidebar has fallen below the minimum.
