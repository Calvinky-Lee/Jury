"use client";

import { motion } from "framer-motion";
import type { Phase } from "@sidebar/contract";

const STEPS: { phase: Phase; label: string }[] = [
  { phase: "intake", label: "Understanding the case" },
  { phase: "casting", label: "Convening the Sidebar" },
  { phase: "statements", label: "Forming opinions" },
  { phase: "rebuttal", label: "Deliberating" },
  { phase: "closing", label: "Pitches to the Chair" },
  { phase: "verdict", label: "Decision" },
];

interface PhaseTrackerProps {
  phase: Phase;
  done?: boolean;
}

export function PhaseTracker({ phase, done = false }: PhaseTrackerProps) {
  const total = STEPS.length;
  const currentIndex = Math.max(0, STEPS.findIndex((s) => s.phase === phase));
  const progress = done ? 1 : (currentIndex + 0.5) / total;
  const label = done ? "Decision reached" : STEPS[currentIndex]?.label;

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-1.5">
      <p className="font-hand text-sm text-ink-soft">
        step {done ? total : currentIndex + 1} of {total} — {label}
      </p>

      <div className="relative h-3 w-full overflow-hidden rounded-full border-2 border-ink bg-card shadow-[2px_2px_0_var(--shadow-beige)]">
        <motion.div
          className="h-full bg-terracotta"
          initial={false}
          animate={{ width: `${progress * 100}%` }}
          transition={{ type: "spring", bounce: 0.15, duration: 0.6 }}
        />
        {!done && (
          <motion.div
            className="absolute top-0 h-full w-3 bg-terracotta/60"
            style={{ left: `${progress * 100}%` }}
            animate={{ opacity: [0.6, 0.2, 0.6] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        {STEPS.slice(0, -1).map((step, i) => (
          <span
            key={step.phase}
            className="absolute top-0 h-full w-px bg-ink/20"
            style={{ left: `${((i + 1) / total) * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
}
