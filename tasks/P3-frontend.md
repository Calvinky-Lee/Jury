# P3 — Frontend (the Courtroom)

**Mission:** Own the demo. The deliberation takes 60–90 seconds — your streaming UI is what turns that latency into the show. The show is a **2D animal courtroom** ("Jury Hopps"): rabbit Judge at the bench, four animal jurors empaneled per case. You touch ONLY the event contract; you must never be blocked on the backend.

**IP guardrail (non-negotiable):** original animal character designs only — Zootopia-*inspired* warmth and style, zero Disney assets, traced designs, or character names. See spec §1.

**Spec:** `../specs/00-overview.md` (§6 event contract, §8 frontend)

**Stack:** Next.js + Tailwind + Framer Motion, deployed on Vercel.

## What you provide / what you consume

- **Provide:** the entire user-facing app — intake, live chamber, verdict theater, replay pages.
- **Consume:** the SSE event stream (live) and recorded event fixtures (dev), both shaped by `packages/contract`. Fixtures come from P4.
- **Contract ownership:** you are the contract's primary consumer — veto power at hour 0 over any event shape you can't render.

## Ordered tasks

1. **Hour 0 — co-sign the event contract.** Read every event type and confirm you can render it. Missing display fields cost 10× more to add later.
2. **Hour 1 — character art pipeline decision.** Fixed set of ~10–15 original animal species (rabbit judge + juror species), 2–3 sprite states each (idle, talking, dissent). Decide: image-gen with one consistent style prompt, or hand-drawn/commissioned. Document the choice and the style prompt in spec §8. Art lands as static assets — no rigging.
3. **Recorded-stream dev harness.** A page that replays a fixture file through your real rendering path at adjustable speed. Build this alongside the art decision — it is your backend until hour 12 and the demo-mode insurance forever.
4. **SSE client + state store.** Reconnect with `Last-Event-ID` resume; a mid-deliberation refresh must lose nothing. One reducer over contract events → courtroom state.
5. **Courtroom layout.** Judge's bench at top (rabbit Judge), jury box with four seats. Responsive enough for a projector at 1080p — that's the real demo target.
6. **Empaneling theater.** On `persona_cast`, the juror's animal walks/hops into its seat with an archetype nameplate; diversity meter climbs per juror.
7. **Streaming speech.** Token-by-token bubbles on `statement_delta` with simple sprite-state talk animation (ear twitch, blink); **tool-use chips** under a juror on `tool_call` ("🔍 the Owl is searching: SaaS churn rates") resolving on `tool_result`. The chips are the "agents coordinate the real world" moment — make them unmissable.
8. **Rebuttal visualization.** Rebuttals quote the target juror's words (highlighted snippet + attribution). `stance_updated` gets a visible beat — a juror changing their mind is drama.
9. **Verdict theater.** Gavel slam, vote-split bar, dissenting juror spotlighted (dissent sprite state) with its reasoning, "what would change our mind," then the **decision-brief export** (Markdown download) — the artifact behind the Phoebe "teammate" pitch.
10. **Intake as case filing + replay pages.** Free-text dilemma + optional context framed as "file your case"; finished sessions load from the DB into the same rendering path as live (one code path, two sources).
11. **`agent_recused` handling.** A dead juror gets a graceful empty-seat state ("juror recused"), never a broken layout.

## Checkpoints

- **Hour ~6:** full fake recorded stream renders end-to-end — casting through verdict — via the dev harness. This is the team's first integration checkpoint and it's yours.
- **Hour ~12:** same rendering path consuming the real skeleton deliberation from P4's service.
- **After:** polish pass ordered by demo impact: verdict theater → tool chips → casting → rebuttals.

## Definition of done

A cold-start live session and an offline fixture replay are visually indistinguishable, survive a refresh mid-deliberation, and look good on a projector.
