import type { ModelClient, GenerateStructuredOptions } from "./chair/model-client.js";
import { GeminiModelClient } from "./chair/model-client.js";
import { MEMBER_MODEL, VERDICT_MODEL } from "./chair/model-config.js";
import type { CastingProvider, CastingResult, ToolExecutor, ToolCall, ToolResult, Emitter } from "./chair/ports.js";
import type { Avatar } from "@council/contract";
import { castCouncil } from "./casting/cast-council.js";
import { runCalculator } from "./tools/calculator.js";
import { CostTracker, estimateCostUsd } from "./metrics/cost-tracker.js";
import type { Emit, EmitInput } from "./events/emitter.js";

/**
 * Real implementations of P1's three ports (spec 04 §Orchestration seams) — wires
 * P2's casting, P4's tools, and P4's event pipeline into `runDeliberation`'s
 * `DeliberationDeps`. Each Fake in `chair/ports.ts` stays as the test seam; these
 * are what a live session actually constructs.
 */

// --- Casting (P2's real castCouncil, spec 05) -------------------------------

export class RealCastingProvider implements CastingProvider {
  async castCouncil(dilemma: string, size: number): Promise<CastingResult> {
    const result = await castCouncil(dilemma, size);
    return {
      members: result.members.map((m) => ({
        id: m.id,
        name: m.name,
        archetype: m.archetype,
        avatar: m.avatar as Avatar,
        domains: m.domains,
        voice: m.voice,
        coreValues: m.stanceProfile.coreValues,
        biases: m.stanceProfile.biases,
        decisionStyle: m.stanceProfile.decisionStyle,
        mmrScore: m.mmrScore,
      })),
      diversityScore: result.diversityScore,
      baselineRatio: result.baselineRatio,
      vectorMap: result.vectorMap,
    };
  }
}

// --- Tools (P4's calculator + web-search, spec 06) --------------------------
// Not invoked by the orchestrator yet (see statement.ts's scoping note) — wired
// for real anyway so the seam is ready the moment P1 adds the live tool-calling
// loop, without needing another round-trip through P4.

export class RealToolExecutor implements ToolExecutor {
  async execute(call: ToolCall): Promise<ToolResult> {
    if (call.tool === "calculator") {
      const result = await runCalculator(call.input);
      const summary = "result" in result ? `= ${result.result}` : `error: ${result.error}`;
      return { callId: call.callId, summary: summary.slice(0, 140) };
    }
    // web_search: grounding-based search happens inside the member call itself
    // (spec 06 §1) once wired — this executor only serves the declared-function-tool
    // path (e.g. a Tavily fallback), unused until the live loop calls it.
    return {
      callId: call.callId,
      summary: "web search not yet wired into the live tool-calling loop",
    };
  }
}

// --- Emitter (P4's real event pipeline: seq, persistence, SSE fan-out) ------

export class RealEmitter implements Emitter {
  constructor(private readonly rawEmit: Emit) {}

  async emit(event: { sessionId: string; type: string; payload: unknown }): Promise<void> {
    await this.rawEmit({ type: event.type, payload: event.payload } as EmitInput);
  }
}

// --- Cost cap (spec 09 §Cost cap) -------------------------------------------
// ModelClient.generateStructured doesn't report token usage, so this is a rough
// proxy (prompt+response length / 4, same "illustrative" model as cost-tracker.ts)
// rather than a real token count — good enough to trip the kill-switch on a
// genuinely runaway session. Once tripped, every further call rejects, which the
// orchestrator's per-phase Promise.allSettled treats as a recusal; the session
// then ends (via shouldFailFromRecusals) rather than continuing to spend.

export class CostCappedModelClient implements ModelClient {
  constructor(
    private readonly inner: ModelClient,
    private readonly tracker: CostTracker,
    private readonly model: string,
    private readonly capUsd: number,
  ) {}

  async generateStructured<T>(opts: GenerateStructuredOptions<T>): Promise<T> {
    if (this.tracker.exceedsCap(this.capUsd)) {
      throw new Error(`session exceeded the $${this.capUsd} cost cap`);
    }
    const result = await this.inner.generateStructured(opts);
    const approxChars = opts.system.length + opts.user.length + JSON.stringify(result).length;
    this.tracker.add(estimateCostUsd(this.model, approxChars / 4));
    return result;
  }
}

export interface LiveDeliberationClients {
  modelClient: ModelClient;
  verdictModelClient: ModelClient;
  castingProvider: CastingProvider;
  toolExecutor: ToolExecutor;
  emitter: Emitter;
  costTracker: CostTracker;
}

export function buildLiveDeliberationClients(
  geminiApiKey: string,
  emit: Emit,
  costCapUsd: number,
): LiveDeliberationClients {
  const costTracker = new CostTracker();
  const memberClient = new GeminiModelClient(geminiApiKey, MEMBER_MODEL);
  const verdictClient = new GeminiModelClient(geminiApiKey, VERDICT_MODEL);

  return {
    modelClient: new CostCappedModelClient(memberClient, costTracker, MEMBER_MODEL, costCapUsd),
    verdictModelClient: new CostCappedModelClient(verdictClient, costTracker, VERDICT_MODEL, costCapUsd),
    castingProvider: new RealCastingProvider(),
    toolExecutor: new RealToolExecutor(),
    emitter: new RealEmitter(emit),
    costTracker,
  };
}
