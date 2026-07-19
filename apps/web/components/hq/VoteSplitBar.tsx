import type { VoteSplit } from "@sidebar/contract";
import { HUES } from "@/lib/blobs";
import type { MemberView } from "@/lib/session-store";

interface VoteSplitBarProps {
  voteSplit: VoteSplit;
  members: Record<string, MemberView>;
}

const CATEGORY_COLOR = {
  for: "var(--sage)",
  against: "var(--terracotta)",
  abstain: "var(--ink-soft)",
} as const;

/** Segment width is the category's share of the vote (not one equal slice per
 * member) — the bar is meant to read as "how much for vs. against", not a
 * rainbow of persona hues. Small hue-colored dots inside each segment still
 * let you see who's in it. */
export function VoteSplitBar({ voteSplit, members }: VoteSplitBarProps) {
  const groups: { label: "for" | "against" | "abstain"; ids: string[] }[] = [
    { label: "for", ids: voteSplit.for },
    { label: "against", ids: voteSplit.against },
    { label: "abstain", ids: voteSplit.abstain },
  ];
  const total = voteSplit.for.length + voteSplit.against.length + voteSplit.abstain.length || 1;

  return (
    <div className="w-full max-w-md">
      <div className="flex h-6 w-full overflow-hidden rounded-full border-2 border-ink">
        {groups
          .filter((g) => g.ids.length > 0)
          .map((g) => (
            <div
              key={g.label}
              className="flex h-full items-center justify-center gap-1"
              style={{ width: `${(g.ids.length / total) * 100}%`, background: CATEGORY_COLOR[g.label] }}
              title={`${g.ids.length} ${g.label}`}
            >
              {g.ids.map((id) => (
                <span
                  key={id}
                  className="h-2 w-2 shrink-0 rounded-full border border-card/70"
                  style={{ background: HUES[members[id]?.hue ?? "slate"] }}
                  title={members[id]?.member.name ?? id}
                />
              ))}
            </div>
          ))}
      </div>
      <div className="mt-1 flex justify-between font-sans text-[10px] text-ink-soft">
        <span>{voteSplit.for.length} for</span>
        <span>{voteSplit.against.length} against</span>
        <span>{voteSplit.abstain.length} abstain</span>
      </div>
    </div>
  );
}
