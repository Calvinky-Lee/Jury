"use client";

import { motion } from "framer-motion";
import type { Avatar } from "@council/contract";
import { BLOB_BODY_PATH, HUES, type BlobState } from "@/lib/blobs";

interface BlobProps {
  avatar: Avatar;
  state?: BlobState;
  size?: number;
  className?: string;
  /** Staggers the idle bounce so a row of blobs animates left-to-right in sequence. */
  index?: number;
}

export function Blob({ avatar, state = "idle", size = 72, className, index = 0 }: BlobProps) {
  const color = HUES[avatar.hue];
  const desaturated = state === "dissent";

  return (
    <motion.svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={`${avatar.hue} ${avatar.form} council member, ${state}`}
      style={{ transformOrigin: "50% 100%" }}
      animate={
        state === "idle"
          ? { y: [0, -14, 0], scaleY: [0.85, 1.15, 0.85], scaleX: [1.12, 0.9, 1.12] }
          : state === "talking"
            ? { scale: [1, 1.03, 1] }
            : { rotate: [0, -1.5, 0] }
      }
      transition={
        state === "idle"
          ? {
              duration: 1.3,
              repeat: Infinity,
              ease: ["easeOut", "easeIn"],
              delay: index * 0.2,
            }
          : {
              duration: 0.6,
              repeat: Infinity,
              ease: "easeInOut",
            }
      }
    >
      <path
        d={BLOB_BODY_PATH[avatar.form]}
        fill={color}
        opacity={desaturated ? 0.55 : 1}
        stroke="rgba(0,0,0,0.15)"
        strokeWidth={1}
      />

      {/* eyes */}
      <circle cx={24} cy={30} r={3.2} fill="#1a1a1a" />
      <circle cx={40} cy={30} r={3.2} fill="#1a1a1a" />

      {/* mouth */}
      {state === "talking" ? (
        <ellipse cx={32} cy={41} rx={5} ry={4} fill="#1a1a1a" />
      ) : state === "dissent" ? (
        <path d="M26 43C29 40 35 40 38 43" stroke="#1a1a1a" strokeWidth={2} strokeLinecap="round" fill="none" />
      ) : (
        <path d="M26 40C29 43 35 43 38 40" stroke="#1a1a1a" strokeWidth={2} strokeLinecap="round" fill="none" />
      )}

      {/* furrowed brow, dissent only */}
      {state === "dissent" && (
        <path
          d="M20 24L27 26M44 24L37 26"
          stroke="#1a1a1a"
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      )}
    </motion.svg>
  );
}
