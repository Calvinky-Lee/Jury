# The Council 🧠⚖️

**Better decisions through engineered disagreement.** File your case, and the Chair convenes a council sized to the case — 3–6 AI members — tool-using agents cast for maximal relevant disagreement, each an original colored blob character — who research, argue, rebut, pitch the Chair, and deliver a decision that preserves the dissent: a direct answer, a devised solution plan, and the conditions that would change it. Every finished case becomes a **memory orb** orbiting the HQ, searchable from the top bar.

Built for the **Phoebe prize track** — AI to Coordinate the Real World.

> **Status: spec phase.** Nothing is implemented yet, by design. Read the specs, sign off, then build.

- 📜 **Specs:** [`specs/`](specs/README.md) — start with [`00-overview.md`](specs/00-overview.md)
- 👥 **Team (4):** [`tasks/`](tasks/) — dedicated [frontend](tasks/P3-frontend.md); the other three own the [deliberation engine](tasks/P1-deliberation-engine.md), the [persona system](tasks/P2-persona-system.md), and [platform & runtime](tasks/P4-platform-runtime.md)
- 🔑 **Env & API keys:** [`specs/09-infra-and-keys.md`](specs/09-infra-and-keys.md) / [`.env.example`](.env.example) — Gemini, Voyage, MongoDB Atlas
- 🖥️ **Runs locally** on the demo laptop (`pnpm dev`) — the only cloud pieces are Atlas and the model APIs

**Hour 0 for all four people:** sign off on [`specs/02-contract.md`](specs/02-contract.md).
