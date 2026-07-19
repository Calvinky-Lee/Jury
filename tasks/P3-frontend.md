# P3 — Frontend (Sidebar HQ) — the dedicated frontend person

**Mission:** Own the demo. The deliberation takes 60–90 seconds — your streaming UI is what turns that latency into the show. The show is a **mind headquarters**: the Chair on its platform, 3–6 colored blob sidebar members ringed around it, memory orbs of past cases orbiting above, a search bar over past conversations. You touch ONLY the event contract + the REST read endpoints; you must never be blocked on the backend.

**IP guardrail (non-negotiable):** Inside-Out-*inspired* vibe, zero Pixar/Disney assets, traced emotion-character silhouettes, or Pixar names. Characters are original SVG/CSS blobs; orbs are generic glowing spheres. See spec 07.

**Spec:** `../specs/07-frontend.md` (primary), `../specs/02-contract.md` (events + REST)

**Stack:** Next.js + Tailwind + Framer Motion, run locally on the demo laptop (`pnpm dev`) — no web hosting in v1.

## What you provide / what you consume

- **Provide:** the entire user-facing app — home (orbs + search + intake), live HQ, decision theater, replay pages.
- **Consume:** the SSE event stream (live), `GET /sessions` list/search, and recorded event fixtures (dev) — all shaped by `packages/contract`. Fixtures come from P4.
- **Contract ownership:** you are the contract's primary consumer — veto power at hour 0 over any event shape you can't render.

## Ordered tasks

1. **Hour 0 — co-sign the event contract.** Read every event type and confirm you can render it. Missing display fields cost 10× more to add later.
2. **Hour 1 — blob character system (`lib/blobs.ts`).** 12 hues × ~4 SVG forms, states `idle`/`talking`/`dissent` — pure code, no image assets. Share the palette/form enum with P2 (their library generation assigns `avatar {hue, form}`). A member's hue is its identity color everywhere: body, nameplate, bubble border, vector, orb swirl.
3. **Recorded-stream dev harness (`/dev/replay`).** Replays a fixture file through your real rendering path at adjustable speed. It is your backend until hour 12 and demo-mode insurance forever.
4. **SSE client + state store.** Reconnect with `Last-Event-ID` resume; a mid-deliberation refresh must lose nothing. One reducer over contract events → HQ state.
5. **HQ radial layout + PhaseTracker + ThinkBubbles.** The Chair (verdict-making judge agent) at the **center**, N member seats (3–6) spaced evenly around it, each with a **fixed-size ThinkBubble** (~30ch × 4 lines, phase-prefixed: 💭 first read → 🗣 opinion → 🔄 reading the others → 🎯 pitch) anchored outward so all N + Chair always fit with zero overlap (box steps down a notch at N ≥ 5) (spec 07 §ThinkBubble). Plus the six-step tracker. Projector at 1080p is the real demo target.
6. **Convening theater + PersonaCard.** On `persona_cast`, the member blob **pops onto screen** at its seat (scale-in + settle), nameplate flips (with a small **model chip** — which LLM powers this seat + its routing reason, from `member.model`), diversity meter climbs. **Hover** → compact personality popover (archetype, decision style, top values); **click** → pinned full card (biases, voice, domains, situation brief). No fetch — data rides in `persona_cast`.
7. **Streaming into ThinkBubbles.** `*_delta` live-fills the member's bubble (clamped with fade), blob → `talking` with hue pulse; on `*_done`, swap to the model-written ≤140-char `bubble` summary; click a bubble → full-text panel; phase-dot row flips back to earlier phases. **Tool-use chips** on `tool_call`/`tool_result` ("🔍 searching: …") — the "agents coordinate the real world" moment, make them unmissable.
8. **Rebuttal + pitch beats.** Rebuttals quote the target member (highlighted snippet + attribution); `stance_updated` gets a full-stop beat. On `closing_*`, the blob turns toward the Chair, short pitch bubble, stance-lock icon.
9. **Decision theater.** Chair takes focus; vote-split bar in member hues; the Chair's answer (`ruling`) + step-by-step **solution plan**; dissenting member in `dissent` state, spotlit; "what would change our mind"; **decision-brief export** (Markdown download).
10. **Crystallization + memory-orb field.** On `session_done`, the case condenses into a glowing orb (swirl of the member hues) that floats up to join the orbiting field. Home screen `OrbField` from `GET /sessions`: hover → dilemma + vote split tooltip; click → replay. Empty state: "no memories yet."
11. **Search bar.** Debounced text search over past dilemmas (`GET /sessions?q=`); results as filtered orbs + a compact list; Enter → replay.
12. **Vector-graph sidebar.** Toggle opens `VectorGraph` (spec 07): each member as a vector from the origin in its hue (2D PCA coords from `casting_done.vectorMap`), pairwise-separation arcs + diversity ratio; **hover a vector → that personality's summary** (reuses PersonaCard). Plain SVG, no chart library.
13. **Intake + replay + recusal.** "File your case" intake; `/replay/[id]` via the read-endpoint proxy through the same reducer; `agent_recused` → graceful empty seat, never a broken layout.

## Checkpoints

- **Hour ~6:** full fake recorded stream renders end-to-end — convening through crystallization — via the dev harness. The team's first integration checkpoint is yours.
- **Hour ~12:** same rendering path consuming the real skeleton deliberation from the local sidebar service.
- **After:** polish ordered by demo impact: decision theater + crystallization → tool chips → convening → orbs/search → sidebar.

## Definition of done

Cold-start live session and offline fixture replay are visually indistinguishable, survive a refresh mid-deliberation, orbs/search work against real finished sessions, and everything reads from the back of a room at 1080p.
