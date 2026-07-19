"use client";

import { useEffect } from "react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion } from "framer-motion";

const REVEAL_RADIUS = 170;

// Small hand-drawn motifs (star, squiggle, dash, scribble-circle) tiled into a
// sketchbook-page pattern. Built as a raw SVG string (not the Doodle component)
// since it needs to be a single CSS background-image, not React elements.
const TILE_SIZE = 160;
const DOODLE_TILE = `
<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_SIZE}" height="${TILE_SIZE}" viewBox="0 0 ${TILE_SIZE} ${TILE_SIZE}">
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M28 18 L30 26 L38 27 L31.5 31.5 L34 39 L28 34.5 L22 39 L24.5 31.5 L18 27 L26 26 Z" fill="#7c9473" stroke="none" />
    <path d="M78 22C82 15 86 15 90 21C94 27 98 15 102 15" stroke="#7691a8" stroke-width="3" />
    <path d="M112 70 C117 68 123 72 128 70" stroke="#c96f4a" stroke-width="3" />
    <path d="M30 96C40 94 50 100 48 110C46 120 34 122 28 116" stroke="#6b5d4c" stroke-width="2.5" />
    <path d="M92 118 L93.5 123 L98.5 123.5 L94.7 126.7 L96 131.5 L92 128.7 L88 131.5 L89.3 126.7 L85.5 123.5 L90.5 123 Z" fill="#c96f4a" stroke="none" />
    <path d="M8 60C11 56 15 56 18 60" stroke="#7c9473" stroke-width="3" />
  </g>
</svg>`;

const DOODLE_TILE_URL = `url("data:image/svg+xml,${encodeURIComponent(DOODLE_TILE)}")`;

export function BackgroundDoodles() {
  const prefersReducedMotion = useReducedMotion();
  const mouseX = useMotionValue(-1000);
  const mouseY = useMotionValue(-1000);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const handleMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, [prefersReducedMotion, mouseX, mouseY]);

  const maskImage = useMotionTemplate`radial-gradient(${REVEAL_RADIUS}px circle at ${mouseX}px ${mouseY}px, black, transparent)`;

  if (prefersReducedMotion) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <motion.div
        className="absolute inset-0"
        style={{
          maskImage,
          WebkitMaskImage: maskImage,
          backgroundImage: DOODLE_TILE_URL,
          backgroundRepeat: "repeat",
          backgroundSize: `${TILE_SIZE}px ${TILE_SIZE}px`,
          opacity: 0.6,
        }}
      />
    </div>
  );
}
