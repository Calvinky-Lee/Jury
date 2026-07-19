/**
 * Hand-authored golden session (spec 01 `fixtures/golden-session.jsonl`, P4 task 4) —
 * built and validated through the real contract schema (`ContractEventSchema`) so a
 * typo can't silently ship a fixture the frontend can't parse. Handed to P3 before
 * hour 6; doubles as the offline demo-mode stream (spec 09).
 *
 * Run: pnpm --filter @council/service fixture:golden
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { ContractEventSchema, type ContractEvent, type Stance } from "@council/contract";

const dir = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(dir, "..", "..", "..", "fixtures", "golden-session.jsonl");

const SESSION_ID = "golden-demo-session";
const START_TS = new Date("2026-07-18T18:00:00.000Z").getTime();

let seq = 0;
const lines: ContractEvent[] = [];

/** `tOffsetMs` = wall-clock offset from session start, purely for realistic demo pacing;
 *  it is not part of the contract envelope. Validated through the real schema so a typo
 *  fails loudly here rather than confusing a demo mid-pitch. */
function push(type: string, payload: unknown, tOffsetMs: number): void {
  const ts = new Date(START_TS + tOffsetMs).toISOString();
  const event = ContractEventSchema.parse({ seq: seq++, sessionId: SESSION_ID, ts, type, payload });
  lines.push(event);
}

const members = [
  {
    id: "b6a1f2d0-1a2b-4c3d-8e4f-000000000001",
    name: "Marlowe Finch",
    archetype: "The Actuary",
    avatar: { hue: "sky", form: "squat" },
    voice: "Dry, precise, always cites a number before an opinion.",
    domains: ["business", "money"],
    stanceProfile: {
      coreValues: ["risk-adjusted thinking", "measurable outcomes", "long-run solvency"],
      biases: ["undervalues anything it can't quantify"],
      decisionStyle: "Builds a rough model before forming an opinion, then argues the model.",
    },
    situationBrief:
      "Annual billing trades monthly optionality for locked-in cash flow — model the churn and discount rate before taking a side.",
    initialRead: "Interesting. Need the churn curve before I trust anyone's gut on this.",
    mmrScore: 0.81,
  },
  {
    id: "b6a1f2d0-1a2b-4c3d-8e4f-000000000002",
    name: "Dash Corrigan",
    archetype: "The Gambler",
    avatar: { hue: "ember", form: "spiky" },
    voice: "Fast-talking, loves an upside case, impatient with hedging.",
    domains: ["business", "career"],
    stanceProfile: {
      coreValues: ["upside capture", "speed", "asymmetric bets"],
      biases: ["chronically underweights downside scenarios"],
      decisionStyle: "Asks 'what's the best case, and can we afford the worst case' — then bets.",
    },
    situationBrief:
      "Annual billing is a cash-flow lever that funds faster growth — the question is whether the churn risk is affordable, not whether it exists.",
    initialRead: "Locked-in cash today beats maybe-cash later. I like it already.",
    mmrScore: 0.76,
  },
  {
    id: "b6a1f2d0-1a2b-4c3d-8e4f-000000000003",
    name: "Ottoline Reyes",
    archetype: "The Steward",
    avatar: { hue: "jade", form: "round" },
    voice: "Warm but firm, speaks in terms of duty and long horizons.",
    domains: ["business", "ethics", "personal"],
    stanceProfile: {
      coreValues: ["stewardship", "reputation over time", "duty to stakeholders"],
      biases: ["overweights institutional continuity even when it's not serving people"],
      decisionStyle: "Asks who inherits the consequences in ten years, not who wins this quarter.",
    },
    situationBrief:
      "Customers who feel pushed into annual contracts remember it — weigh the trust cost against the cash benefit.",
    initialRead: "Fine in principle. I want to know how customers will feel a year from now.",
    mmrScore: 0.69,
  },
  {
    id: "b6a1f2d0-1a2b-4c3d-8e4f-000000000004",
    name: "Tobias Wren",
    archetype: "The Realist",
    avatar: { hue: "teal", form: "squat" },
    voice: "Blunt, allergic to wishful thinking, deals only in what's actually true.",
    domains: ["business", "career", "money", "personal"],
    stanceProfile: {
      coreValues: ["accuracy over comfort", "acting on the world as it is", "avoiding self-deception"],
      biases: ["can read as cynical and sometimes discounts genuine upside as naivety"],
      decisionStyle: "Strips out the aspirational language and argues from the plainest reading of the facts.",
    },
    situationBrief:
      "Ignore the pitch decks — look at what similar SaaS companies actually saw happen to churn and conversion when they made this switch.",
    initialRead: "Everyone's about to have a theory. I want the actual comparable data.",
    mmrScore: 0.72,
  },
] as const;

function main() {
  push(
    "session_started",
    {
      dilemma: "Should our startup switch to annual billing?",
      context: "We're a 20-person B2B SaaS company at $1.2M ARR, monthly plan only today.",
    },
    0,
  );

  push(
    "dilemma_parsed",
    {
      summary:
        "Whether to move from monthly-only to annual billing (or an annual option) given cash-flow benefits vs. churn/conversion risk.",
      axesOfTension: [
        "near-term cash flow vs. long-term customer trust",
        "growth speed vs. churn risk",
        "pricing simplicity vs. pricing optionality",
      ],
      councilSize: 4,
    },
    400,
  );

  push("casting_started", { poolSize: 24, councilSize: 4 }, 900);

  const runningDiversity = [0.31, 0.42, 0.47, 0.52];
  members.forEach((m, seat) => {
    push(
      "persona_cast",
      {
        member: {
          id: m.id,
          name: m.name,
          archetype: m.archetype,
          avatar: m.avatar,
          voice: m.voice,
          domains: [...m.domains],
          stanceProfile: {
            coreValues: [...m.stanceProfile.coreValues],
            biases: [...m.stanceProfile.biases],
            decisionStyle: m.stanceProfile.decisionStyle,
          },
          situationBrief: m.situationBrief,
          mmrScore: m.mmrScore,
          seat,
        },
        seat,
        runningDiversityScore: runningDiversity[seat],
        initialRead: m.initialRead,
      },
      1200 + seat * 400,
    );
  });

  push(
    "casting_done",
    {
      diversityScore: 0.52,
      baselineRatio: 1.41,
      vectorMap: members.map((m, seat) => ({
        personaId: m.id,
        x: [0.82, 0.61, -0.74, -0.55][seat],
        y: [0.34, -0.71, 0.28, -0.4][seat],
        seat,
      })),
    },
    3200,
  );

  // ---- opening statements ----
  const statements: Record<string, { prose: string; stance: Stance; bubble: string }> = {
    "b6a1f2d0-1a2b-4c3d-8e4f-000000000001": {
      prose:
        "Run the numbers before running the campaign. Annual plans typically improve cash flow and reduce logo churn, but they also depress near-term MRR growth and can mask a rising cancellation risk at renewal. I pulled comparable SaaS churn benchmarks: switching cohorts often see 15-20% lower monthly churn but a renewal-time cliff if onboarding value isn't proven by month three. I'd offer it as a discount option, not a forced default, and model both cohorts separately for two quarters before going further.",
      stance: {
        recommendation: "Offer annual billing as an optional discount, not a mandatory switch.",
        confidence: 0.72,
        keyReasons: [
          "Comparable churn data shows real cash-flow upside without forcing conversion",
          "A renewal cliff risk is real if onboarding value isn't proven early",
          "Optionality preserves data on both cohorts to decide the next step",
        ],
      },
      bubble: "Model it first — offer annual as a discount option, don't force the switch yet.",
    },
    "b6a1f2d0-1a2b-4c3d-8e4f-000000000002": {
      prose:
        "We're leaving cash on the table every month we don't push this. Locked-in annual revenue funds the next two hires without touching the credit line, and the option to discount 15% for annual pays for itself in reduced payment-processing churn alone. Yes there's a renewal cliff, but that's a growth team problem to solve with better onboarding, not a reason to sit on our hands. Go bigger: make annual the default, monthly the surcharge.",
      stance: {
        recommendation: "Make annual billing the default plan with a monthly surcharge.",
        confidence: 0.68,
        keyReasons: [
          "Locked-in cash funds growth without external financing",
          "Renewal risk is solvable with onboarding investment, not a reason to delay",
          "A surcharge framing nudges the majority toward annual without banning monthly",
        ],
      },
      bubble: "Go big — make annual the default and charge a premium for monthly.",
    },
    "b6a1f2d0-1a2b-4c3d-8e4f-000000000003": {
      prose:
        "Before we talk pricing mechanics, talk to five customers. If they feel pushed into a longer commitment before they trust us, that resentment shows up in renewal conversations a year from now, not this quarter's dashboard. I'm not against annual billing — I'm against optimizing this purely for our cash flow while treating customer trust as a rounding error. Whatever we ship needs an easy, ungrudging path back to monthly if someone changes their mind in the first 90 days.",
      stance: {
        recommendation: "Offer annual billing only with a no-friction 90-day opt-back to monthly.",
        confidence: 0.65,
        keyReasons: [
          "Trust damage from a forced switch shows up at renewal, not immediately",
          "A friction-free downgrade path protects the relationship if we're wrong",
          "Customer research should precede a pricing-mechanics decision, not follow it",
        ],
      },
      bubble: "Talk to customers first — and whatever we ship needs an easy opt-back.",
    },
    "b6a1f2d0-1a2b-4c3d-8e4f-000000000004": {
      prose:
        "Skip the theorizing — three comparable B2B SaaS companies in our size range published their annual-billing transition numbers. All three saw a 20-30% conversion rate to annual within six months when it was offered (not forced), and none of them saw a churn spike, because the customers who take annual already intended to stay. Forcing it as a default, on the other hand, is the one move none of the comparables tried, which should tell us something.",
      stance: {
        recommendation: "Offer annual billing as an opt-in discount and measure for two quarters.",
        confidence: 0.78,
        keyReasons: [
          "Real comparable data shows opt-in annual converts well without forcing anyone",
          "No comparable company forced annual as a default — that's a signal, not an oversight",
          "Self-selection into annual plans correlates with intent to stay, not the other way around",
        ],
      },
      bubble: "The comparables all did opt-in, not forced — that's the tell.",
    },
  };

  members.forEach((m, i) => {
    const base = 4200 + i * 6000;
    push("statement_started", { personaId: m.id, phase: "opening" }, base);
    const s = statements[m.id]!;
    push("statement_delta", { personaId: m.id, text: s.prose }, base + 800);

    if (m.id === "b6a1f2d0-1a2b-4c3d-8e4f-000000000001" || m.id === "b6a1f2d0-1a2b-4c3d-8e4f-000000000004") {
      const callId = `${m.id}-search-1`;
      push(
        "tool_call",
        {
          personaId: m.id,
          tool: "web_search",
          input: { queries: ["SaaS annual billing churn rate benchmark", "monthly vs annual plan conversion B2B SaaS"] },
          callId,
        },
        base + 1600,
      );
      push(
        "tool_result",
        {
          personaId: m.id,
          callId,
          summary: "ChartMogul: annual plans -15-20% churn · Price Intelligently: opt-in annual conversion 20-30%",
        },
        base + 2400,
      );
    }

    push(
      "statement_done",
      { personaId: m.id, stance: s.stance, fullText: s.prose, bubble: s.bubble },
      base + 3200,
    );
  });

  // ---- rebuttal round ----
  const rebuttals: Record<
    string,
    { prose: string; bubble: string; quotedPersonaId?: string; stance: Stance }
  > = {
    "b6a1f2d0-1a2b-4c3d-8e4f-000000000001": {
      prose:
        "Dash's 'make it the default' move is exactly the untested move Tobias flagged — none of the comparables did that, and defaults are what create the resentment Ottoline is worried about. I'll adjust slightly: run the opt-in offer, but tie the discount size to a model of the renewal-cliff risk instead of guessing at 15%.",
      quotedPersonaId: "b6a1f2d0-1a2b-4c3d-8e4f-000000000002",
      bubble: "Dash's 'default' move is the one thing no comparable tried — sticking with opt-in.",
      stance: statements["b6a1f2d0-1a2b-4c3d-8e4f-000000000001"]!.stance,
    },
    "b6a1f2d0-1a2b-4c3d-8e4f-000000000002": {
      prose:
        "Fine — Tobias's data on forced defaults is the one thing that actually moves me; nobody's tested it and I don't want to be the case study. I'll drop 'default' and push hard on making the opt-in offer aggressive: a steep enough discount that most people self-select in anyway.",
      quotedPersonaId: "b6a1f2d0-1a2b-4c3d-8e4f-000000000004",
      bubble: "The 'no one's tried forcing it' point actually lands — dropping the default idea.",
      stance: {
        recommendation: "Offer an aggressively discounted annual option, opt-in only, not a default.",
        confidence: 0.7,
        keyReasons: [
          "No comparable company forced a default — not worth being the first test case",
          "A steep enough discount gets most of the cash-flow benefit without the resentment risk",
          "Opt-in preserves the self-selection effect Tobias's data points to",
        ],
      },
    },
    "b6a1f2d0-1a2b-4c3d-8e4f-000000000003": {
      prose:
        "Marlowe and Tobias both landed on opt-in with real data behind it, which is exactly the shape I wanted — I'll add one condition: the 90-day opt-back needs to be a published policy, not a support-ticket favor, or the trust benefit doesn't actually land with customers.",
      quotedPersonaId: "b6a1f2d0-1a2b-4c3d-8e4f-000000000001",
      bubble: "Glad the data converged on opt-in — just want the opt-back published, not informal.",
      stance: statements["b6a1f2d0-1a2b-4c3d-8e4f-000000000003"]!.stance,
    },
    "b6a1f2d0-1a2b-4c3d-8e4f-000000000004": {
      prose:
        "Ottoline's push to publish the opt-back policy is a fair addition and costs us nothing — a written policy is cheap and removes the 'will they actually let me leave' doubt that suppresses conversion in the first place. Sticking with my original call otherwise.",
      quotedPersonaId: "b6a1f2d0-1a2b-4c3d-8e4f-000000000003",
      bubble: "Publishing the opt-back policy is free and helps conversion — folding that in.",
      stance: statements["b6a1f2d0-1a2b-4c3d-8e4f-000000000004"]!.stance,
    },
  };

  members.forEach((m, i) => {
    const base = 30000 + i * 4000;
    push("rebuttal_started", { personaId: m.id }, base);
    const r = rebuttals[m.id]!;
    push("rebuttal_delta", { personaId: m.id, text: r.prose }, base + 600);
    push(
      "rebuttal_done",
      { personaId: m.id, quotedPersonaId: r.quotedPersonaId, fullText: r.prose, bubble: r.bubble },
      base + 2200,
    );
    if (m.id === "b6a1f2d0-1a2b-4c3d-8e4f-000000000002") {
      push(
        "stance_updated",
        { personaId: m.id, from: statements[m.id]!.stance, to: r.stance },
        base + 2400,
      );
    }
  });

  // ---- closing pitches ----
  const closings: Record<string, { prose: string; bubble: string; finalStance: Stance }> = {
    "b6a1f2d0-1a2b-4c3d-8e4f-000000000001": {
      prose:
        "Offer annual as an opt-in discount, size it against modeled renewal risk, and review the cohort data in two quarters. The strongest reason: it's the only option every member converged on once we compared real data instead of instinct.",
      bubble: "Opt-in, data-sized discount, review in two quarters — the option we all converged on.",
      finalStance: statements["b6a1f2d0-1a2b-4c3d-8e4f-000000000001"]!.stance,
    },
    "b6a1f2d0-1a2b-4c3d-8e4f-000000000002": {
      prose:
        "An aggressive opt-in discount, published opt-back policy, review in two quarters. I wanted the default; the data didn't support it, so I'm not fighting a case nobody's actually tested. This still gets us most of the cash-flow win.",
      bubble: "Aggressive opt-in discount — dropped 'default' because the data didn't support it.",
      finalStance: rebuttals["b6a1f2d0-1a2b-4c3d-8e4f-000000000002"]!.stance,
    },
    "b6a1f2d0-1a2b-4c3d-8e4f-000000000003": {
      prose:
        "Opt-in annual discount with a published, no-friction 90-day opt-back policy. The strongest reason: it gets the cash-flow benefit everyone wants without spending down the trust that took years to build.",
      bubble: "Opt-in plus a published opt-back — the cash benefit without spending down trust.",
      finalStance: statements["b6a1f2d0-1a2b-4c3d-8e4f-000000000003"]!.stance,
    },
    "b6a1f2d0-1a2b-4c3d-8e4f-000000000004": {
      prose:
        "Opt-in, discounted, with the opt-back policy published. Every comparable company that tried this the forced way is the case study we should avoid being.",
      bubble: "Opt-in with a published opt-back — avoid being the forced-default case study.",
      finalStance: statements["b6a1f2d0-1a2b-4c3d-8e4f-000000000004"]!.stance,
    },
  };

  members.forEach((m, i) => {
    const base = 52000 + i * 3000;
    push("closing_started", { personaId: m.id }, base);
    const c = closings[m.id]!;
    push("closing_delta", { personaId: m.id, text: c.prose }, base + 500);
    push(
      "closing_done",
      { personaId: m.id, finalStance: c.finalStance, fullText: c.prose, bubble: c.bubble },
      base + 1800,
    );
  });

  // ---- verdict ----
  push("verdict_started", {}, 66000);

  const ruling =
    "Offer annual billing as an opt-in discount rather than a forced default — every member converged here once real comparable data replaced instinct, and it captures most of the cash-flow benefit without the untested resentment risk of a forced switch.";

  const briefMd = `# Decision Brief

## Dilemma
Should our startup switch to annual billing?

## Council
- **Marlowe Finch** (The Actuary): Offer annual billing as an optional discount, not a mandatory switch.
- **Dash Corrigan** (The Gambler): Offer an aggressively discounted annual option, opt-in only, not a default.
- **Ottoline Reyes** (The Steward): Offer annual billing only with a no-friction 90-day opt-back to monthly.
- **Tobias Wren** (The Realist): Offer annual billing as an opt-in discount and measure for two quarters.

## Vote
- For: Marlowe Finch, Dash Corrigan, Ottoline Reyes, Tobias Wren
- Against: —
- Abstain: —

## Ruling
${ruling}

## Solution plan
1. Launch annual billing as an opt-in discount (Dash's aggressive-enough-to-self-select framing), never a forced default.
2. Size the discount against a renewal-risk model, not a flat guess (Marlowe's modeling discipline).
3. Publish the 90-day opt-back-to-monthly policy publicly, not as an informal support favor (Ottoline's trust condition).
4. Track both cohorts against the real comparable benchmarks Tobias surfaced and review in two quarters.

## Majority reasoning
All four members independently converged on "opt-in, not forced" once comparable-company data replaced assumption — Dash was the sole holdout for a forced default and revised after seeing that no comparable company had tried it.

## What would change our mind
- If two-quarter cohort data shows opt-in conversion below 10% (comparables suggest 20-30%)
- If renewal-time churn among annual customers exceeds monthly-cohort churn, not below it
- If customer interviews surface systemic distrust of the opt-back policy despite it being published
`;

  push(
    "verdict_delta",
    { text: ruling },
    66500,
  );

  push(
    "verdict_done",
    {
      verdict: {
        ruling,
        solutionPlan: [
          "Launch annual billing as an opt-in discount, never a forced default.",
          "Size the discount against a modeled renewal-risk curve, not a flat guess.",
          "Publish a 90-day opt-back-to-monthly policy publicly, not as an informal favor.",
          "Track both cohorts against real comparable benchmarks and review in two quarters.",
        ],
        voteSplit: {
          for: members.map((m) => m.id),
          against: [],
          abstain: [],
        },
        majorityReasoning:
          "All four members independently converged on opt-in over forced-default once comparable-company data replaced assumption; the one holdout (the Gambler) revised after seeing no comparable had tried forcing it.",
        dissent: null,
        confidence: 0.79,
        whatWouldChangeOurMind: [
          "Two-quarter cohort data shows opt-in conversion below 10% (comparables suggest 20-30%)",
          "Renewal-time churn among annual customers exceeds the monthly cohort's, not below it",
          "Customer interviews surface systemic distrust of the opt-back policy despite it being published",
        ],
      },
      briefMd,
    },
    68000,
  );

  push(
    "session_done",
    {
      status: "done",
      metrics: {
        firstCastMs: 1200,
        firstTokenMs: 5000,
        verdictMs: 68000,
        totalCostUsd: 0.04,
        recusals: 0,
      },
    },
    68200,
  );
}

main();

const out = lines.map((e) => JSON.stringify(e)).join("\n") + "\n";
await writeFile(OUT_PATH, out);
console.log(`[generate-golden-fixture] wrote ${lines.length} events → ${OUT_PATH}`);
