import type { PersonaForBrief } from './types.js';
import type { VectorPoint } from '@sidebar/contract';

// The orchestrator depends on three subsystems P1 doesn't own. Each gets the
// same treatment as model-client.ts's ModelClient: a typed interface P1 codes
// against, owned for real by a teammate, with a Fake implementation here so
// the orchestrator is fully testable before those subsystems exist.

// --- Casting (real: P2, spec 05) --------------------------------------------

export interface CastingResult {
  // `mmrScore`/`vectorMap` are optional so FakeCastingProvider (and existing
  // tests) don't need updating — the real adapter populates them from P2's
  // castSidebar (spec 05 §API), which the UI's persona card / vector sidebar need.
  members: (PersonaForBrief & { mmrScore?: number })[];
  diversityScore: number;
  baselineRatio: number;
  vectorMap?: VectorPoint[];
}

export interface CastingProvider {
  // `size` = intake's sidebarSize (3-6) — the real adapter needs it to call
  // P2's castSidebar(parsedDilemma, size); Fakes ignore it.
  castSidebar(dilemma: string, size: number): Promise<CastingResult>;
}

export class FakeCastingProvider implements CastingProvider {
  constructor(
    private readonly members: PersonaForBrief[],
    private readonly diversityScore = 0.8,
    private readonly baselineRatio = 1.4,
    private readonly vectorMap: VectorPoint[] = [],
  ) {}

  async castSidebar(): Promise<CastingResult> {
    return {
      members: this.members,
      diversityScore: this.diversityScore,
      baselineRatio: this.baselineRatio,
      vectorMap: this.vectorMap,
    };
  }
}

// --- Tools (real: P4, spec 06) ----------------------------------------------
// Not invoked by the orchestrator yet — see statement.ts's scoping note. The
// seam exists so wiring a real ToolExecutor later doesn't require touching
// the orchestrator's control flow, only the statement-runner internals.

export interface ToolCall {
  personaId: string;
  tool: 'web_search' | 'calculator';
  input: unknown;
  callId: string;
}

export interface ToolResult {
  callId: string;
  summary: string;
}

export interface ToolExecutor {
  execute(call: ToolCall): Promise<ToolResult>;
}

export class FakeToolExecutor implements ToolExecutor {
  async execute(call: ToolCall): Promise<ToolResult> {
    return { callId: call.callId, summary: 'fake tool result (orchestrator does not invoke tools yet)' };
  }
}

// --- Event emitter (real: P4, spec 02) --------------------------------------
// The real emitter assigns `seq`, persists to the events collection, and fans
// out over SSE. This fake just collects events in order for assertions.

export interface ContractEvent {
  sessionId: string;
  type: string;
  payload: unknown;
}

export interface Emitter {
  emit(event: ContractEvent): Promise<void>;
}

export class InMemoryEmitter implements Emitter {
  readonly events: ContractEvent[] = [];

  async emit(event: ContractEvent): Promise<void> {
    this.events.push(event);
  }
}
