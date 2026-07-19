"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Blob } from "@/components/hq/Blob";
import { Nameplate } from "@/components/hq/Nameplate";
import { PersonaCard } from "@/components/hq/PersonaCard";
import { ThinkBubble } from "@/components/hq/ThinkBubble";
import { ToolChips } from "@/components/hq/ToolChip";
import { HUES } from "@/lib/blobs";
import { bubbleSizeNotch, seatLayout } from "@/lib/radial";
import type { MemberView } from "@/lib/session-store";

interface SeatRingProps {
  sidebarSize: number;
  seatOrder: (string | null)[];
  members: Record<string, MemberView>;
  onPin?: (title: string, text: string) => void;
  dissentPersonaId?: string;
}

/** One-shot "changed their mind" beat — mounts once when a member's stance flips. */
function StanceChangeBanner() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 2600);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          className="absolute -top-6 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-ink bg-terracotta px-2 py-0.5 font-hand text-xs text-card shadow-[1px_1px_0_var(--shadow-beige)]"
        >
          changed their mind!
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SeatRing({
  sidebarSize,
  seatOrder,
  members,
  onPin,
  dissentPersonaId,
}: SeatRingProps) {
  const positions = seatLayout(sidebarSize);
  const compact = bubbleSizeNotch(sidebarSize) === "compact";

  return (
    <>
      {positions.map((pos) => {
        const personaId = seatOrder[pos.seat];
        const memberView = personaId ? members[personaId] : undefined;
        const quotedName = memberView?.phases.rebuttal?.quotedPersonaId
          ? members[memberView.phases.rebuttal.quotedPersonaId]?.member.name
          : undefined;

        // Anchor the BLOB (64px) exactly on the ring point and let the rest of the
        // column flow OUTWARD from center — down for lower seats, up for upper ones.
        // Previously the whole column was centred on the ring point, so the tall
        // think-bubble shoved the blob inward toward the Chair; the bottom seat's
        // blob ended up overlapping the Chair's face. Blob half-height is 32px, so
        // translating by -32px (bubble below) or -100%+32px (bubble above) keeps the
        // blob centred on the ring in either direction.
        const bubbleBelow = pos.y >= 45;

        return (
          <div
            key={pos.seat}
            className="absolute"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: bubbleBelow ? "translate(-50%, -32px)" : "translate(-50%, calc(-100% + 32px))",
            }}
          >
            {memberView ? (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: memberView.recused ? 0.4 : 1 }}
                transition={{ type: "spring", bounce: 0.45, duration: 0.6 }}
                className={`relative flex ${bubbleBelow ? "flex-col" : "flex-col-reverse"} items-center gap-2`}
              >
                {memberView.stanceChanged && <StanceChangeBanner />}

                <Blob
                  avatar={memberView.member.avatar}
                  state={
                    dissentPersonaId === memberView.member.id ? "dissent" : memberView.blobState
                  }
                  index={pos.seat}
                  size={64}
                  traits={{
                    archetype: memberView.member.archetype,
                    decisionStyle: memberView.member.stanceProfile.decisionStyle,
                    biases: memberView.member.stanceProfile.biases,
                    coreValues: memberView.member.stanceProfile.coreValues,
                  }}
                />

                <div className="flex items-center gap-1">
                  <PersonaCard member={memberView.member} hue={HUES[memberView.hue]}>
                    <Nameplate member={memberView.member} hue={HUES[memberView.hue]} />
                  </PersonaCard>
                  {memberView.locked && (
                    <span
                      title="This member has pitched their final position to the Chair and won't change it again."
                      className="flex items-center gap-0.5 rounded-full border border-ink/40 bg-card px-1.5 py-0.5 font-sans text-[9px] text-ink-soft"
                    >
                      🔒 final
                    </span>
                  )}
                </div>

                <ToolChips tools={memberView.tools} onPin={onPin} />

                {memberView.recused ? (
                  <span className="font-sans text-[10px] text-ink-soft">recused</span>
                ) : (
                  <ThinkBubble
                    member={memberView}
                    compact={compact}
                    onPin={onPin}
                    quotedName={quotedName}
                  />
                )}
              </motion.div>
            ) : (
              <div className="h-16 w-16 rounded-full border-2 border-dashed border-ink/30" />
            )}
          </div>
        );
      })}
    </>
  );
}
