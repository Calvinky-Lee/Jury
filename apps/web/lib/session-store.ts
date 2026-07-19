import type {
  BlobHue,
  CastMember,
  ContractEvent,
  OpsMetrics,
  Phase,
  SessionStatus,
  Stance,
  VectorPoint,
  Verdict,
} from "@sidebar/contract";

export type BlobState = "idle" | "talking" | "dissent";

export interface ToolChip {
  callId: string;
  tool: "web_search" | "calculator";
  input: unknown;
  summary?: string;
  status: "running" | "done";
}

interface PhaseSummary {
  bubble: string;
  fullText: string;
}

export interface MemberView {
  member: CastMember;
  seat: number;
  hue: BlobHue;
  phases: {
    firstRead?: { bubble: string };
    statement?: PhaseSummary & { stance: Stance };
    rebuttal?: PhaseSummary & { quotedPersonaId?: string };
    closing?: PhaseSummary & { finalStance: Stance };
  };
  streaming?: { phase: "statements" | "rebuttal" | "closing"; text: string };
  stance?: Stance;
  stanceChanged?: boolean;
  locked?: boolean;
  orientedToChair?: boolean;
  recused?: { reason: "timeout" | "error" };
  tools: ToolChip[];
  blobState: BlobState;
}

export interface HqState {
  status: SessionStatus;
  phase: Phase;
  dilemma?: string;
  context?: string;
  summary?: string;
  axesOfTension?: string[];
  sidebarSize?: number;
  diversityScore?: number;
  baselineRatio?: number;
  members: Record<string, MemberView>;
  seatOrder: (string | null)[];
  vectorMap?: VectorPoint[];
  verdict?: Verdict;
  briefMd?: string;
  metrics?: OpsMetrics;
  error?: { message: string; fatal: boolean };
  lastSeq: number;
  buffer: ContractEvent[];
  /** true when the most recently applied event is old backlog (a fresh SSE
   * connection replays the whole history before the live tail) rather than a
   * genuinely fresh live event — components should skip one-shot beat
   * animations while this is true, so a page refresh snaps to current state
   * instead of replaying the whole deliberation's beats at once. */
  catchUp: boolean;
}

export function initialHqState(): HqState {
  return {
    status: "created",
    phase: "intake",
    members: {},
    seatOrder: [],
    lastSeq: -1,
    buffer: [],
    catchUp: true,
  };
}

const CATCH_UP_THRESHOLD_MS = 2000;

function isCatchUp(eventTs: string): boolean {
  return Date.now() - Date.parse(eventTs) > CATCH_UP_THRESHOLD_MS;
}

function getMember(state: HqState, personaId: string): MemberView | undefined {
  return state.members[personaId];
}

/** Applies one already-in-order contract event, producing the next business state. */
function applyContractEvent(state: HqState, event: ContractEvent): HqState {
  switch (event.type) {
    case "session_started":
      return {
        ...state,
        status: "intake",
        dilemma: event.payload.dilemma,
        context: event.payload.context,
      };

    case "dilemma_parsed":
      return {
        ...state,
        phase: "casting",
        status: "casting",
        summary: event.payload.summary,
        axesOfTension: event.payload.axesOfTension,
        sidebarSize: event.payload.sidebarSize,
        seatOrder:
          state.seatOrder.length === event.payload.sidebarSize
            ? state.seatOrder
            : Array.from({ length: event.payload.sidebarSize }, () => null),
      };

    case "casting_started":
      return {
        ...state,
        phase: "casting",
        status: "casting",
        sidebarSize: event.payload.sidebarSize,
        seatOrder:
          state.seatOrder.length === event.payload.sidebarSize
            ? state.seatOrder
            : Array.from({ length: event.payload.sidebarSize }, () => null),
      };

    case "persona_cast": {
      const { member, seat, runningDiversityScore, initialRead } = event.payload;
      const seatOrder = [...state.seatOrder];
      seatOrder[seat] = member.id;
      return {
        ...state,
        diversityScore: runningDiversityScore,
        seatOrder,
        members: {
          ...state.members,
          [member.id]: {
            member,
            seat,
            hue: member.avatar.hue,
            phases: initialRead ? { firstRead: { bubble: initialRead } } : {},
            tools: [],
            blobState: "idle",
          },
        },
      };
    }

    case "casting_done":
      return {
        ...state,
        diversityScore: event.payload.diversityScore,
        baselineRatio: event.payload.baselineRatio,
        vectorMap: event.payload.vectorMap,
      };

    case "statement_started": {
      const m = getMember(state, event.payload.personaId);
      if (!m) return state;
      return {
        ...state,
        phase: "statements",
        status: "statements",
        members: {
          ...state.members,
          [m.member.id]: { ...m, blobState: "talking" },
        },
      };
    }

    case "statement_delta": {
      const m = getMember(state, event.payload.personaId);
      if (!m) return state;
      return {
        ...state,
        members: {
          ...state.members,
          [m.member.id]: {
            ...m,
            streaming: {
              phase: "statements",
              text: ((m.streaming?.text ?? "") + event.payload.text).slice(-800),
            },
          },
        },
      };
    }

    case "statement_done": {
      const m = getMember(state, event.payload.personaId);
      if (!m) return state;
      return {
        ...state,
        members: {
          ...state.members,
          [m.member.id]: {
            ...m,
            streaming: undefined,
            blobState: "idle",
            stance: event.payload.stance,
            phases: {
              ...m.phases,
              statement: {
                bubble: event.payload.bubble,
                fullText: event.payload.fullText,
                stance: event.payload.stance,
              },
            },
          },
        },
      };
    }

    case "tool_call": {
      const m = getMember(state, event.payload.personaId);
      if (!m) return state;
      const chip: ToolChip = {
        callId: event.payload.callId,
        tool: event.payload.tool,
        input: event.payload.input,
        status: "running",
      };
      return {
        ...state,
        members: {
          ...state.members,
          [m.member.id]: { ...m, tools: [...m.tools, chip] },
        },
      };
    }

    case "tool_result": {
      const m = getMember(state, event.payload.personaId);
      if (!m) return state;
      return {
        ...state,
        members: {
          ...state.members,
          [m.member.id]: {
            ...m,
            tools: m.tools.map((t) =>
              t.callId === event.payload.callId
                ? { ...t, status: "done", summary: event.payload.summary }
                : t,
            ),
          },
        },
      };
    }

    case "rebuttal_started": {
      const m = getMember(state, event.payload.personaId);
      if (!m) return state;
      return {
        ...state,
        phase: "rebuttal",
        status: "rebuttal",
        members: {
          ...state.members,
          [m.member.id]: { ...m, blobState: "talking" },
        },
      };
    }

    case "rebuttal_delta": {
      const m = getMember(state, event.payload.personaId);
      if (!m) return state;
      return {
        ...state,
        members: {
          ...state.members,
          [m.member.id]: {
            ...m,
            streaming: {
              phase: "rebuttal",
              text: ((m.streaming?.text ?? "") + event.payload.text).slice(-800),
            },
          },
        },
      };
    }

    case "rebuttal_done": {
      const m = getMember(state, event.payload.personaId);
      if (!m) return state;
      return {
        ...state,
        members: {
          ...state.members,
          [m.member.id]: {
            ...m,
            streaming: undefined,
            blobState: "idle",
            phases: {
              ...m.phases,
              rebuttal: {
                bubble: event.payload.bubble,
                fullText: event.payload.fullText,
                quotedPersonaId: event.payload.quotedPersonaId,
              },
            },
          },
        },
      };
    }

    case "stance_updated": {
      const m = getMember(state, event.payload.personaId);
      if (!m) return state;
      return {
        ...state,
        members: {
          ...state.members,
          [m.member.id]: { ...m, stance: event.payload.to, stanceChanged: true },
        },
      };
    }

    case "closing_started": {
      const m = getMember(state, event.payload.personaId);
      if (!m) return state;
      return {
        ...state,
        phase: "closing",
        status: "closing",
        members: {
          ...state.members,
          [m.member.id]: { ...m, blobState: "talking", orientedToChair: true },
        },
      };
    }

    case "closing_delta": {
      const m = getMember(state, event.payload.personaId);
      if (!m) return state;
      return {
        ...state,
        members: {
          ...state.members,
          [m.member.id]: {
            ...m,
            streaming: {
              phase: "closing",
              text: ((m.streaming?.text ?? "") + event.payload.text).slice(-800),
            },
          },
        },
      };
    }

    case "closing_done": {
      const m = getMember(state, event.payload.personaId);
      if (!m) return state;
      return {
        ...state,
        members: {
          ...state.members,
          [m.member.id]: {
            ...m,
            streaming: undefined,
            blobState: "idle",
            locked: true,
            stance: event.payload.finalStance,
            phases: {
              ...m.phases,
              closing: {
                bubble: event.payload.bubble,
                fullText: event.payload.fullText,
                finalStance: event.payload.finalStance,
              },
            },
          },
        },
      };
    }

    case "verdict_started":
      return { ...state, phase: "verdict", status: "verdict" };

    case "verdict_delta":
      return state;

    case "verdict_done":
      return {
        ...state,
        verdict: event.payload.verdict,
        briefMd: event.payload.briefMd,
      };

    case "agent_recused": {
      const m = getMember(state, event.payload.personaId);
      if (!m) return state;
      return {
        ...state,
        members: {
          ...state.members,
          [m.member.id]: { ...m, recused: { reason: event.payload.reason }, blobState: "idle" },
        },
      };
    }

    case "session_done":
      return { ...state, status: "done", metrics: event.payload.metrics };

    case "error":
      return { ...state, status: event.payload.fatal ? "failed" : state.status, error: event.payload };

    default:
      return state;
  }
}

/**
 * Applies one event with ordering/dedupe: ignores events already applied
 * (reconnect overlap), buffers events that arrive ahead of the expected next
 * `seq`, and drains the buffer once the gap closes. The backend guarantees
 * eventual contiguity, so a held event never stalls forever.
 */
export function hqReducer(state: HqState, event: ContractEvent): HqState {
  if (event.seq <= state.lastSeq) return state;

  if (event.seq !== state.lastSeq + 1) {
    if (state.buffer.some((e) => e.seq === event.seq)) return state;
    return { ...state, buffer: [...state.buffer, event].sort((a, b) => a.seq - b.seq) };
  }

  let next = applyContractEvent(state, event);
  next = { ...next, lastSeq: event.seq, catchUp: isCatchUp(event.ts) };

  while (next.buffer.length > 0 && next.buffer[0].seq === next.lastSeq + 1) {
    const [head, ...rest] = next.buffer;
    next = applyContractEvent({ ...next, buffer: rest }, head);
    next = { ...next, lastSeq: head.seq, catchUp: isCatchUp(head.ts) };
  }

  return next;
}
