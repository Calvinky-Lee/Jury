import type { ContractEvent } from "@council/contract";

type Listener = (event: ContractEvent) => void;

const subscribers = new Map<string, Set<Listener>>();

/** In-memory pub/sub so multiple SSE connections (tabs, reconnects) can watch one session live. */
export function subscribe(sessionId: string, listener: Listener): () => void {
  let set = subscribers.get(sessionId);
  if (!set) {
    set = new Set();
    subscribers.set(sessionId, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
    if (set && set.size === 0) subscribers.delete(sessionId);
  };
}

export function publish(event: ContractEvent): void {
  const set = subscribers.get(event.sessionId);
  if (!set) return;
  for (const listener of set) listener(event);
}
