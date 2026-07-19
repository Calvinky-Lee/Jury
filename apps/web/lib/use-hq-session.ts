"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import type { ContractEvent } from "@sidebar/contract";
import { hqReducer, initialHqState, type HqState } from "./session-store";
import { connectSession } from "./sse-client";

/**
 * Applies a batch of events in order. `*_delta` events can arrive dozens of
 * times a second across several members — dispatching one React state update
 * per event would thrash rendering, so incoming events are queued and flushed
 * at most once per animation frame via this batched reducer.
 */
function applyBatch(state: HqState, events: ContractEvent[]): HqState {
  return events.reduce(hqReducer, state);
}

export function useHqSession(sessionId: string) {
  const [state, dispatch] = useReducer(applyBatch, undefined, initialHqState);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const pending = useRef<ContractEvent[]>([]);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    const flush = () => {
      rafId.current = null;
      if (pending.current.length === 0) return;
      const batch = pending.current;
      pending.current = [];
      dispatch(batch);
    };

    const scheduleFlush = () => {
      if (rafId.current === null) {
        rafId.current = requestAnimationFrame(flush);
      }
    };

    const cleanup = connectSession(sessionId, {
      onEvent: (event) => {
        pending.current.push(event);
        scheduleFlush();
      },
      onOpen: () => setConnectionError(null),
      onError: () => setConnectionError("Connection lost — retrying…"),
    });

    return () => {
      cleanup();
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    };
  }, [sessionId]);

  return { state, connectionError };
}
