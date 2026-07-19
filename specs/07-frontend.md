# 07 — Frontend (the Courtroom) — P3

Next.js 15 (App Router) + Tailwind + Framer Motion, on Vercel. **One rendering path** consumes four sources: live SSE, DB replay, dev fixtures, demo mode — all shaped by the contract (spec 02).

## IP guardrail (non-negotiable)

Original anthropomorphic animal designs only. Zootopia-*inspired* warmth; zero Disney assets, traced designs, or character names. "Jury Hopps" is a pun, not a license.

## State management

- `lib/session-store.ts`: a single reducer `(state, contractEvent) → state`. No component reads events directly.
- Courtroom state: `{ phase, judge, seats: [4 × {member?, speech, stance, chips, recused}], verdict, diversityMeter }`.
- Parallel juror deltas demux by `personaId`. Out-of-order `seq` ⇒ buffer-and-reorder (SSE guarantees order per connection; reconnects can overlap).
- `lib/sse-client.ts`: EventSource wrapper via the Next proxy route; on drop, reconnect with `Last-Event-ID` (the last `seq`); dedupe by `seq`.

## Scene layout

```
┌────────────────────────────────────────────┐
│              🐰 JUDGE'S BENCH               │  gavel, phase indicator
├────────────────────────────────────────────┤
│   [seat0]   [seat1]   [seat2]   [seat3]    │  jury box: sprite + nameplate
│    🦉 owl     🦊 fox    🐢 tortoise  🐕 dog  │  + speech bubble + tool chips
├────────────────────────────────────────────┤
│  diversity meter ▓▓▓▓▓░░  1.4× baseline    │
├────────────────────────────────────────────┤
│  case file (dilemma summary + axes)        │
└────────────────────────────────────────────┘
```

Demo target: **projector at 1080p** — big type, high contrast, readable from the back of a room.

## Character art pipeline (hour-1 decision, recorded here)

- Fixed set of **~12 species** (rabbit judge + ~11 juror species), each with **3 sprite states**: `idle`, `talking`, `dissent`. Static PNGs at `public/characters/<species>/<state>.png` — sprite-state swaps + Framer Motion transforms (bob, ear twitch via subtle rotate/translate), **no rigging**.
- Production route: image-gen offline with ONE pinned style prompt (flat 2D, warm palette, consistent line weight, front-facing bust) — the exact prompt gets committed alongside the assets. Manual pick of best-of-N per species/state. Fallback: simple flat vector illustrations by hand.
- Species enum is shared with P2 at hour 1 (persona records reference it).

## Event → theater mapping

| Event | Beat |
|---|---|
| `persona_cast` | juror sprite hops/walks into seat, nameplate flips up, diversity meter ticks |
| `casting_done` | meter locks with the ×baseline ratio |
| `statement_delta` | speech bubble streams; sprite → `talking` |
| `tool_call` / `tool_result` | chip under seat: "🔍 searching: …" → resolves to summary. **Unmissable** — this is the Phoebe pitch moment |
| `rebuttal_done` w/ `quotedPersonaId` | quoted juror's words highlighted in the rebuttal bubble with attribution arrow |
| `stance_updated` | full-stop beat: seat flashes, "changed their mind" banner |
| `verdict_started` → `verdict_done` | gavel raise → slam; vote-split bar; dissenting juror spotlit in `dissent` sprite; "what would change our mind" list; **decision-brief download button** (`briefMd`) |
| `agent_recused` | empty seat + "juror recused" plate — graceful, never broken |

## Routes

- `/` — intake as *case filing*: dilemma textarea + optional context, playful legal framing.
- `/session/[id]` — live courtroom (SSE via proxy).
- `/replay/[id]` — finished session; loads events from Supabase (anon key), plays through the same reducer at adjustable speed. This is the share link.
- `/dev/replay` — fixture harness: pick a `.jsonl` fixture, replay at 1×/4×/instant. **Built first**; doubles as demo mode's UI.

## Definition of done (from tasks/P3)

Cold-start live session and offline fixture replay are visually indistinguishable, survive a mid-deliberation refresh, and read from the back of a room at 1080p.
