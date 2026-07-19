"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import type { SessionSummary, BlobHue } from "@council/contract";
import { HUES } from "@/lib/blobs";

interface OrbFieldProps {
  searchResults: SessionSummary[] | null;
}

export function OrbField({ searchResults }: OrbFieldProps) {
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [unreachable, setUnreachable] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/sessions")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled) setSessions(data.sessions ?? []);
      })
      .catch(() => {
        if (!cancelled) setUnreachable(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const shown = searchResults ?? sessions;

  if (unreachable && !searchResults) {
    return (
      <p className="font-sans text-sm text-ink-soft">
        no memories yet — council service isn&apos;t running
      </p>
    );
  }

  if (shown && shown.length === 0) {
    return (
      <p className="font-sans text-sm text-ink-soft">
        {searchResults ? "no cases match that search" : "no memories yet — file your first case"}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-6 py-8">
      {shown?.map((session, i) => (
        <motion.button
          key={session.id}
          onClick={() => router.push(`/replay/${session.id}`)}
          title={
            session.orb.voteSplit
              ? `${session.dilemma} — ${session.orb.voteSplit.for.length}–${session.orb.voteSplit.against.length}`
              : session.dilemma
          }
          className="group relative h-14 w-14 shrink-0 rounded-full"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3 + (i % 3), repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
          style={{
            background: `conic-gradient(${session.orb.hues
              .map((h) => HUES[h as BlobHue] ?? "#888")
              .join(", ")})`,
            boxShadow: `0 0 24px 4px ${HUES[(session.orb.hues[0] as BlobHue) ?? "sky"]}55`,
          }}
        >
          <span className="pointer-events-none absolute inset-0 rounded-full bg-black/10 opacity-0 transition-opacity group-hover:opacity-100" />
        </motion.button>
      ))}
    </div>
  );
}
