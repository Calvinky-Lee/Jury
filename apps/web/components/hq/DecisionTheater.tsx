"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import type { Verdict } from "@sidebar/contract";
import { VoteSplitBar } from "@/components/hq/VoteSplitBar";
import type { MemberView } from "@/lib/session-store";

interface DecisionTheaterProps {
  verdict: Verdict;
  briefMd: string;
  members: Record<string, MemberView>;
}

export function DecisionTheater({ verdict, briefMd, members }: DecisionTheaterProps) {
  const router = useRouter();
  const dissentMember = verdict.dissent
    ? (members[verdict.dissent.who] ??
      Object.values(members).find((m) => m.member.name === verdict.dissent!.who))
    : undefined;

  const downloadBrief = () => {
    const blob = new Blob([briefMd], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "decision-brief.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
      className="w-full max-w-2xl rounded-3xl border-2 border-ink bg-card p-6 shadow-[4px_4px_0_var(--shadow-beige)]"
    >
      <h2 className="font-hand text-2xl text-ink">The Chair&apos;s ruling</h2>
      <p className="mt-2 font-sans text-ink">{verdict.ruling}</p>

      <h3 className="mt-4 font-hand text-lg text-ink">Solution plan</h3>
      <ol className="mt-1 list-decimal space-y-1 pl-5 font-sans text-sm text-ink">
        {verdict.solutionPlan.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>

      <div className="mt-4">
        <VoteSplitBar voteSplit={verdict.voteSplit} members={members} />
      </div>

      {verdict.dissent && (
        <div className="mt-4 rounded-2xl border-2 border-dusty-blue bg-card p-3">
          <p className="font-hand text-sm text-dusty-blue">
            Dissent — {dissentMember?.member.name ?? verdict.dissent.who}
          </p>
          <p className="mt-1 font-sans text-sm text-ink">{verdict.dissent.position}</p>
          <p className="mt-1 font-sans text-xs italic text-ink-soft">
            {verdict.dissent.whyItMatters}
          </p>
        </div>
      )}

      <h3 className="mt-4 font-hand text-lg text-ink">What would change our mind</h3>
      <ul className="mt-1 list-disc space-y-1 pl-5 font-sans text-sm text-ink-soft">
        {verdict.whatWouldChangeOurMind.map((c, i) => (
          <li key={i}>{c}</li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={downloadBrief}
          className="rounded-full border-2 border-ink bg-terracotta px-4 py-2 font-hand text-sm text-card shadow-[2px_2px_0_var(--shadow-beige)]"
        >
          Download decision brief
        </button>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-full border-2 border-ink bg-card px-4 py-2 font-hand text-sm text-ink shadow-[2px_2px_0_var(--shadow-beige)] transition-transform hover:-translate-y-0.5"
        >
          New inquiry
        </button>
      </div>
    </motion.section>
  );
}
