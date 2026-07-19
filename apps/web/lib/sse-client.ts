import type { ContractEvent } from "@sidebar/contract";

// The backend writes a named `event:` field per contract event type (spec 02 /
// sidebar-service's streamSSE), so `EventSource.onmessage` never fires — every
// type needs its own listener.
const EVENT_TYPES: ContractEvent["type"][] = [
  "session_started",
  "dilemma_parsed",
  "casting_started",
  "persona_cast",
  "casting_done",
  "statement_started",
  "statement_delta",
  "statement_done",
  "tool_call",
  "tool_result",
  "rebuttal_started",
  "rebuttal_delta",
  "rebuttal_done",
  "stance_updated",
  "closing_started",
  "closing_delta",
  "closing_done",
  "verdict_started",
  "verdict_delta",
  "verdict_done",
  "agent_recused",
  "session_done",
  "error",
];

export interface SseHandlers {
  onEvent: (event: ContractEvent) => void;
  onOpen?: () => void;
  onError?: (err: Event) => void;
}

/** Opens an SSE connection to the session stream proxy. Returns a cleanup function. */
export function connectSession(sessionId: string, handlers: SseHandlers): () => void {
  const es = new EventSource(`/api/sessions/${sessionId}/stream`);

  const handleFrame = (raw: MessageEvent<string>) => {
    let event: ContractEvent;
    try {
      event = JSON.parse(raw.data);
    } catch {
      return;
    }
    handlers.onEvent(event);
  };

  for (const type of EVENT_TYPES) {
    es.addEventListener(type, handleFrame as EventListener);
  }
  if (handlers.onOpen) es.addEventListener("open", handlers.onOpen);
  if (handlers.onError) es.addEventListener("error", handlers.onError);

  return () => es.close();
}
