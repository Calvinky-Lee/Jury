"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BackgroundDoodles } from "@/components/BackgroundDoodles";
import { Chair } from "@/components/hq/Chair";
import { Crystallization } from "@/components/hq/Crystallization";
import { DecisionTheater } from "@/components/hq/DecisionTheater";
import { PhaseTracker } from "@/components/hq/PhaseTracker";
import { PinnedPanel } from "@/components/hq/PinnedPanel";
import { SeatRing } from "@/components/hq/SeatRing";
import { VectorGraph } from "@/components/sidebar/VectorGraph";
import { useHqSession } from "@/lib/use-hq-session";

interface HqSceneProps {
  sessionId: string;
}

export function HqScene({ sessionId }: HqSceneProps) {
  const { state, connectionError } = useHqSession(sessionId);
  const [pinned, setPinned] = useState<{ title: string; text: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [verdictOpen, setVerdictOpen] = useState(false);
  const autoOpened = useRef(false);
  const isFocused = state.phase === "verdict";
  const hasVerdict = !!(state.verdict && state.briefMd);

  // Pop the ruling open once, the moment it lands — after that it's a click away.
  useEffect(() => {
    if (hasVerdict && !autoOpened.current) {
      autoOpened.current = true;
      setVerdictOpen(true);
    }
  }, [hasVerdict]);

  const dissentPersonaId = state.verdict?.dissent
    ? (Object.values(state.members).find(
        (m) => m.member.id === state.verdict!.dissent!.who || m.member.name === state.verdict!.dissent!.who,
      )?.member.id)
    : undefined;

  return (
    <>
      <BackgroundDoodles />
      <div className="paper-grain" />
      <main className="relative z-10 flex h-screen flex-col items-center gap-3 overflow-hidden px-4 py-4">
        <button
          type="button"
          onClick={() => setSidebarOpen((o) => !o)}
          aria-label="Toggle diversity sidebar"
          className="fixed right-4 top-4 z-30 flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink bg-card text-ink shadow-[2px_2px_0_var(--shadow-beige)]"
        >
          ⿻
        </button>

        {hasVerdict && (
          <button
            type="button"
            onClick={() => setVerdictOpen(true)}
            className="fixed right-16 top-4 z-30 flex h-9 items-center gap-1 rounded-full border-2 border-ink bg-terracotta px-3 font-hand text-sm text-card shadow-[2px_2px_0_var(--shadow-beige)]"
          >
            ⚖️ View ruling
          </button>
        )}

        <PhaseTracker phase={state.phase} done={state.status === "done"} />

        {state.summary && (
          <div className="w-full max-w-xl shrink-0 rounded-2xl border-2 border-ink bg-card px-3 py-1.5 text-center shadow-[2px_2px_0_var(--shadow-beige)]">
            <p className="font-sans text-xs text-ink sm:text-sm">{state.summary}</p>
            {state.axesOfTension && state.axesOfTension.length > 0 && (
              <p className="font-sans text-[10px] text-ink-soft">
                tension: {state.axesOfTension.join(" · ")}
              </p>
            )}
          </div>
        )}

        <div className="relative mx-auto aspect-[16/10] min-h-[22rem] w-full max-w-4xl flex-1">
          {state.sidebarSize && (
            <SeatRing
              sidebarSize={state.sidebarSize}
              seatOrder={state.seatOrder}
              members={state.members}
              onPin={(title, text) => setPinned({ title, text })}
              dissentPersonaId={dissentPersonaId}
            />
          )}
          <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3">
            <div className="relative">
              <Chair size={84} focused={isFocused} clickable={hasVerdict} onClick={() => setVerdictOpen(true)} />
              {state.status === "done" && (
                <div className="pointer-events-none absolute -bottom-2 -right-2">
                  <Crystallization members={state.members} small />
                </div>
              )}
            </div>
            {!state.sidebarSize && (
              <p className="font-hand text-lg text-ink-soft">loading…</p>
            )}
          </div>
        </div>

        {connectionError && (
          <p className="font-sans text-xs text-terracotta">{connectionError}</p>
        )}
        {state.error && <p className="font-sans text-xs text-terracotta">{state.error.message}</p>}
      </main>

      <PinnedPanel
        title={pinned?.title ?? null}
        text={pinned?.text ?? null}
        onClose={() => setPinned(null)}
      />

      <VectorGraph
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        vectorMap={state.vectorMap}
        members={state.members}
        diversityScore={state.diversityScore}
        baselineRatio={state.baselineRatio}
      />

      <AnimatePresence>
        {verdictOpen && hasVerdict && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 px-4 py-8"
            onClick={() => setVerdictOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              className="max-h-[85vh] w-full max-w-2xl overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <DecisionTheater verdict={state.verdict!} briefMd={state.briefMd!} members={state.members} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
