"use client";

import { useEffect, useState } from "react";
import type { SessionSummary } from "@council/contract";

interface SearchBarProps {
  onResults: (sessions: SessionSummary[] | null) => void;
}

export function SearchBar({ onResults }: SearchBarProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (query.trim() === "") {
      onResults(null);
      return;
    }
    const controller = new AbortController();
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sessions?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        onResults(data.sessions ?? []);
      } catch {
        // council service unreachable — ignore, search is best-effort
      }
    }, 300);
    return () => {
      clearTimeout(id);
      controller.abort();
    };
  }, [query, onResults]);

  return (
    <div className="w-full max-w-xl">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search past cases…"
        aria-label="Search past cases"
        className="w-full rounded-full border-2 border-ink bg-card px-5 py-2.5 font-sans text-sm text-ink shadow-[3px_3px_0_var(--shadow-beige)] outline-none placeholder:text-ink-soft/70 focus:shadow-[2px_2px_0_var(--shadow-beige)]"
        style={{ borderRadius: "999px 998px 999px 997px / 60% 58% 62% 59%" }}
      />
    </div>
  );
}
