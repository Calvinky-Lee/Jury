"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { CastMember } from "@sidebar/contract";

interface PersonaCardProps {
  member: CastMember;
  hue: string;
  children: ReactNode;
}

const POPOVER_WIDTH = 224; // w-56

/** Wraps a trigger element (Nameplate, vector point, ...): hover shows a compact
 * popover, click pins the full card. All data comes from `persona_cast` — no fetch.
 *
 * Rendered via a portal straight to document.body rather than as a normal
 * absolutely-positioned child: Framer Motion applies inline transform/opacity to
 * nearly every animated element in the seat tree, and each of those creates its
 * own stacking context, so a plain z-index class here can only win within its own
 * subtree — it can't beat a sibling box (like the ThinkBubble below it) that's
 * painted later in the DOM. Portaling out to the body escapes all of that.
 *
 * Position is viewport-aware: for seats near the bottom of the screen (or the
 * pinned, taller card) there isn't always room below the trigger, so it flips to
 * open upward, and clamps horizontally so it never runs off the left/right edge. */
export function PersonaCard({ member, hue, children }: PersonaCardProps) {
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [coords, setCoords] = useState<{ left: number; top: number; openUpward: boolean } | null>(
    null,
  );
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const open = hovered || pinned;

  useEffect(() => {
    if (!open) return;

    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const estimatedHeight = popoverRef.current?.getBoundingClientRect().height ?? 100;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < estimatedHeight + 16 && rect.top > estimatedHeight + 16;

      const left = Math.min(
        Math.max(rect.left + rect.width / 2, POPOVER_WIDTH / 2 + 8),
        window.innerWidth - POPOVER_WIDTH / 2 - 8,
      );
      const top = openUpward ? rect.top - estimatedHeight - 8 : rect.bottom + 8;

      setCoords({ left, top, openUpward });
    };

    update();
    // re-measure once the popover has actually rendered (height depends on `pinned`)
    const raf = requestAnimationFrame(update);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, pinned]);

  return (
    <div
      ref={triggerRef}
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => setPinned((p) => !p)}
    >
      {children}
      {open &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            <motion.div
              ref={popoverRef}
              initial={{ opacity: 0, y: coords.openUpward ? -6 : 6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", bounce: 0.25, duration: 0.35 }}
              style={{
                borderColor: hue,
                left: coords.left,
                top: coords.top,
                position: "fixed",
                transform: "translateX(-50%)",
              }}
              className="z-50 w-56 cursor-default rounded-2xl border-2 bg-card p-3 text-left shadow-[3px_3px_0_var(--shadow-beige)]"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="font-hand text-sm text-ink">{member.archetype}</p>
              <p className="font-sans text-xs text-ink-soft">{member.stanceProfile.decisionStyle}</p>
              <p className="mt-1 font-sans text-[10px] text-ink-soft">
                values: {member.stanceProfile.coreValues.slice(0, 3).join(", ")}
              </p>

              {pinned && (
                <div className="mt-2 space-y-1 border-t border-ink/20 pt-2">
                  <p className="font-sans text-[10px] text-ink-soft">
                    <strong>biases:</strong> {member.stanceProfile.biases.join(", ")}
                  </p>
                  <p className="font-sans text-[10px] text-ink-soft">
                    <strong>voice:</strong> {member.voice}
                  </p>
                  <p className="font-sans text-[10px] text-ink-soft">
                    <strong>domains:</strong> {member.domains.join(", ")}
                  </p>
                  {member.situationBrief && (
                    <p className="font-sans text-[10px] text-ink-soft">
                      <strong>brief:</strong> {member.situationBrief}
                    </p>
                  )}
                  {member.model && (
                    <p className="font-sans text-[10px] text-ink-soft">
                      <strong>model:</strong> {member.model.id} — {member.model.reason}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
