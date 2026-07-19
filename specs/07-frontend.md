# 07 — Frontend (Council HQ) — dedicated owner

Next.js 15 (App Router) + Tailwind + Framer Motion, run locally on the demo laptop (`pnpm dev`) — no web hosting in v1. **One rendering path** consumes four sources: live SSE, DB replay, dev fixtures, demo mode — all shaped by the contract (spec 02).

## Theme & IP guardrail (non-negotiable)

Inside-Out-*inspired* mind-headquarters vibe; the art is NOT Pixar's. Council members are **original little blob characters** (rounded mascot style, à la the Claude Code bot) built as **pure SVG/CSS** — each with a signature hue and a simple form from a fixed set. No Pixar/Disney assets, no traced emotion-character silhouettes, no Pixar names, no "Inside Out" branding. Memory orbs render as generic glowing spheres.

## State management

- `lib/session-store.ts`: a single reducer `(state, contractEvent) → state`. No component reads events directly.
- HQ state: `{ phase, chair, seats: [4 × {member?, speech, stance, chips, recused}], verdict, diversityMeter, vectorMap, sidebarOpen, orbs }`.
- Parallel member deltas demux by `personaId`. Out-of-order `seq` ⇒ buffer-and-reorder.
- `lib/sse-client.ts`: EventSource wrapper via the Next proxy route; on drop, reconnect with `Last-Event-ID` (the last `seq`); dedupe by `seq`.

## Scene layout — the HQ

**Radial layout: the Chair (the verdict-making judge agent) sits at the center; the members — 3–6, sized to the case — surround it, seats spaced evenly at 360°/N.** Every member's thinking is visible at every phase via fixed-size thinking bubbles anchored outward from each seat.

```
┌──────────────────────────────────────────────────┬───┐
│  🔍 [ search past cases…            ]             │ ⿻ │  ← search bar + sidebar toggle
│      ◍    ◉   ◍     ◉    ◍   ← memory orbs        │   │
├──────────────────────────────────────────────────┤ V │
│ ①understanding ②convening ③opinions               │ e │  ← PhaseTracker
│ ④deliberating ⑤pitches ⑥decision                  │ c │
├──────────────────────────────────────────────────┤ t │
│  ┌💭────────┐                     ┌💭────────┐    │ o │  fixed-size thinking
│  │ bubble 0 │   (●)       (▲)   │ bubble 1 │    │ r │  bubbles, anchored outward
│  └──────────┘     ╲        ╱     └──────────┘    │ s │  from the corner seats
│                    ◎ CHAIR                        │   │  ← judge agent, CENTER
│  ┌💭────────┐     ╱        ╲     ┌💭────────┐    │   │
│  │ bubble 2 │   (■)       (✦)   │ bubble 3 │    │   │
│  └──────────┘                     └──────────┘    │   │
├──────────────────────────────────────────────────┤   │
│  diversity ▓▓▓▓░░ 1.4×  │  case file (dilemma+axes)  │
└──────────────────────────────────────────────────┴───┘
```

Demo target: **projector at 1080p** — big type, high contrast, readable from the back of a room.

### ThinkBubble (`components/hq/ThinkBubble`) — the core of the debate visibility
One per member, always in the same position, **fixed dimensions** (~30ch × 4 lines) so all bubbles + Chair always fit on screen with zero overlap or reflow (the box steps down one size notch when N ≥ 5) — the *content* adapts to the box, never the reverse:
- **Phase prefix:** every bubble is prefixed with a small phase tag in the member's hue — `💭 first read` → `🗣 opinion` → `🔄 reading the others` → `🎯 pitch to the Chair` — so the audience always knows which step of thinking they're watching.
- **Summarized content per phase** (all model-written to fit, ≤140 chars, from the contract):
  - `persona_cast.initialRead` — the member's understanding of the problem the moment it's convened;
  - `statement_done.bubble` — its formed opinion;
  - `rebuttal_done.bubble` — its understanding of the *other* personalities' positions and its counter;
  - `closing_done.bubble` — the pitch it presents toward the Chair at the center (bubble tail points inward for this phase).
- **While streaming** (`*_delta`), the bubble live-fills with the tail of the stream, clamped to the box with a fade — swap to the summarized `bubble` text on `*_done`.
- **Click a bubble** → pins the full text of that phase (statement/rebuttal/pitch) in a scrollable panel; the stage itself never shows unbounded text.
- Previous-phase summaries stay reachable: a tiny phase-dot row under each bubble flips it back to earlier bubbles on hover.

### Character system (pure SVG/CSS — no image assets)
- Fixed set: **12 hues × ~4 forms** (`round`, `tall`, `squat`, `spiky`). A blob = body path + eyes + tiny idle bob. States: `idle`, `talking` (mouth + color pulse), `dissent` (desaturated + furrowed brow). Original by construction; zero art pipeline.
- A member's `avatar.hue` is its identity color EVERYWHERE: body, nameplate accent, thinking-bubble border and phase tag, vector in the sidebar, and its share of the memory orb. The Chair is a fixed larger neutral-toned character at the center — visually the hub the members (and their closing pitches) point into.

### Memory orbs (`components/hq/OrbField`)
- Home screen (and the strip above a live session): every finished session is a **glowing orb** slowly orbiting. Orb coloring = a swirl of the members' hues from that case; subtle size by recency.
- **Hover an orb:** tooltip with the dilemma one-liner + vote split. **Click:** navigate to `/replay/[id]`.
- Data from `GET /sessions` (contract §REST). Empty state: "no memories yet — file your first case."
- **The crystallization beat:** on `session_done`, the current case condenses into a new orb that floats up and joins the field. This is the theme's signature moment — do it well.

### Search bar
- Top of the home screen and HQ: text search over past dilemmas (`GET /sessions?q=`, Mongo text index, spec 03). Debounced; results render as a filtered orb field plus a compact list (dilemma, date, ruling one-liner). Enter on a result → replay.

### PhaseTracker
Always-visible six-step stepper driven by the reducer's `phase`: **understanding the case → convening the council → forming opinions → deliberating (reading each other) → pitches to the Chair → decision**. Current phase pulses; completed phases get a check. This makes the *thinking process* legible — each stage of how the answer was reached is a named, visible step, not a spinner.

### PersonaCard (hover/click)
Any member blob or nameplate: **hover** opens a compact popover (archetype, one-line decision style, top values); **click** pins the full card (adds biases, voice, domains, and the Chair's situation brief for *this* case). Data rides in `persona_cast` — no fetch. Also the hover tooltip body in the vector sidebar. Keyboard/touch: click-only fallback.

### Vector sidebar (`components/sidebar/VectorGraph`)
Toggled by the ⿻ button; slides in without disturbing the scene. Renders `casting_done.vectorMap`:
- Each member is a **vector from the origin** to its `(x, y)` PCA coordinate, drawn in its `avatar.hue`.
- Visual thesis: *the spread between vectors shows how behaviorally different the cast personalities are.* Pairwise separation as light arcs + the diversity ratio beneath.
- **Hover a vector** (line or endpoint): that member's PersonaCard popover — the personality summary.
- Populated at `casting_done`; before that, a "council being convened…" placeholder. Plot P2's per-session PCA data as-is (spec 05 §project.ts) — no client-side math. Plain SVG, no chart library.

## Event → theater mapping

| Event | Beat |
|---|---|
| `dilemma_parsed` | case file card fills in (summary + axes); tracker → *understanding* complete |
| `persona_cast` | member blob **pops onto screen** at its seat around the Chair (scale-in + settle), nameplate flips up, diversity meter ticks; ThinkBubble appears with `💭 initialRead` — its take on the problem; hover/click → PersonaCard |
| `casting_done` | meter locks with the ×baseline ratio; vector sidebar data arrives |
| `statement_delta` / `statement_done` | ThinkBubble live-fills (clamped), blob → `talking` with hue pulse; on done, swaps to `🗣 bubble` opinion summary; tracker → *forming opinions* |
| `tool_call` / `tool_result` | chip under seat: "🔍 searching: …" → resolves to summary. **Unmissable** — this is the Phoebe pitch moment |
| `rebuttal_*` | tracker → *deliberating*; ThinkBubble streams then swaps to `🔄 bubble` — its read of the other personalities; quoted member highlighted with attribution arrow (`quotedPersonaId`) |
| `stance_updated` | full-stop beat: seat flashes, "changed their mind" banner |
| `closing_started` → `closing_done` | tracker → *pitches*; member blob turns toward the center; ThinkBubble tail flips inward toward the Chair with `🎯 bubble` pitch summary; stance-lock icon |
| `verdict_started` → `verdict_done` | Chair takes focus; vote-split bar in member hues; **the Chair's answer** (ruling) + step-by-step **solution plan**; dissenting member in `dissent` state, spotlit; "what would change our mind"; **decision-brief download** (`briefMd`) |
| `session_done` | **crystallization**: the case condenses into a memory orb and floats up to join the orb field |
| `agent_recused` | empty console seat + "recused" plate — graceful, never broken |

## Routes

- `/` — home: orb field + search bar + *"file your case"* intake (dilemma textarea + optional context).
- `/session/[id]` — live HQ (SSE via proxy).
- `/replay/[id]` — finished session via proxy → council-service read endpoint; same reducer, adjustable speed.
- `/dev/replay` — fixture harness: pick a `.jsonl` fixture, replay at 1×/4×/instant. **Built first**; doubles as demo mode's UI.

## Definition of done

Cold-start live session and offline fixture replay are visually indistinguishable, survive a mid-deliberation refresh, orbs/search work against real finished sessions, and everything reads from the back of a room at 1080p.
