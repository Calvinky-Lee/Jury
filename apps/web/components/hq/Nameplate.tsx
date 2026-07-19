"use client";

import { motion } from "framer-motion";
import type { CastMember } from "@sidebar/contract";

interface NameplateProps {
  member: CastMember;
  hue: string;
}

export function Nameplate({ member, hue }: NameplateProps) {
  return (
    <motion.div
      initial={{ rotateX: -90, opacity: 0 }}
      animate={{ rotateX: 0, opacity: 1 }}
      transition={{ type: "spring", bounce: 0.3, duration: 0.5, delay: 0.2 }}
      style={{ transformOrigin: "50% 0%", borderColor: hue }}
      className="flex flex-col items-center gap-0.5 rounded-lg border-2 bg-card px-2 py-1 text-center shadow-[2px_2px_0_var(--shadow-beige)]"
    >
      <span className="font-hand text-sm leading-none text-ink">{member.name}</span>
      <span className="font-sans text-[10px] leading-none text-ink-soft">{member.archetype}</span>
      {member.model && (
        <span
          title={member.model.reason}
          className="mt-0.5 rounded-full bg-card px-1.5 py-0.5 font-sans text-[9px] leading-none text-ink-soft"
          style={{ border: `1px solid ${hue}` }}
        >
          {member.model.id}
        </span>
      )}
    </motion.div>
  );
}
