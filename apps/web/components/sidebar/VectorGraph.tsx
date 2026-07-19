"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { VectorPoint } from "@sidebar/contract";
import { DiversityMeter } from "@/components/hq/DiversityMeter";
import { HUES } from "@/lib/blobs";
import type { MemberView } from "@/lib/session-store";

interface VectorGraphProps {
  open: boolean;
  onClose: () => void;
  vectorMap?: VectorPoint[];
  members: Record<string, MemberView>;
  diversityScore?: number;
  baselineRatio?: number;
}

/** Plain SVG, no chart library — plots casting_done.vectorMap as-is (spec 07). */
export function VectorGraph({
  open,
  onClose,
  vectorMap,
  members,
  diversityScore,
  baselineRatio,
}: VectorGraphProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
          className="fixed right-0 top-0 z-40 h-full w-72 border-l-2 border-ink bg-card p-4 shadow-[-4px_0_0_var(--shadow-beige)]"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-hand text-lg text-ink">Diversity</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="font-sans text-sm text-ink-soft"
            >
              ✕
            </button>
          </div>

          <div className="mt-4">
            <DiversityMeter score={diversityScore} baselineRatio={baselineRatio} />
          </div>

          {!vectorMap ? (
            <p className="mt-4 font-sans text-sm text-ink-soft">members being cast…</p>
          ) : (
            <>
              <svg viewBox="-1.2 -1.2 2.4 2.4" className="mt-4 aspect-square w-full">
                <line x1={-1.2} y1={0} x2={1.2} y2={0} stroke="var(--ink)" strokeWidth={0.01} opacity={0.2} />
                <line x1={0} y1={-1.2} x2={0} y2={1.2} stroke="var(--ink)" strokeWidth={0.01} opacity={0.2} />

                {vectorMap.map((v, i) =>
                  vectorMap.slice(i + 1).map((w) => (
                    <line
                      key={`${v.personaId}-${w.personaId}`}
                      x1={v.x}
                      y1={-v.y}
                      x2={w.x}
                      y2={-w.y}
                      stroke="var(--ink-soft)"
                      strokeWidth={0.006}
                      opacity={0.25}
                    />
                  )),
                )}

                {vectorMap.map((v) => {
                  const hue = members[v.personaId]?.hue;
                  const color = hue ? HUES[hue] : "var(--ink)";
                  const name = members[v.personaId]?.member.name ?? v.personaId;
                  return (
                    <g key={v.personaId}>
                      <line
                        x1={0}
                        y1={0}
                        x2={v.x}
                        y2={-v.y}
                        stroke={color}
                        strokeWidth={0.02}
                        strokeLinecap="round"
                      />
                      <circle cx={v.x} cy={-v.y} r={0.05} fill={color}>
                        <title>{name}</title>
                      </circle>
                    </g>
                  );
                })}
              </svg>
            </>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
