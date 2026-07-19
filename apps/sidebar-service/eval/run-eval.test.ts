import { describe, expect, it } from "vitest";
import { FakeModelClient, type ModelClient } from "../src/chair/model-client.js";
import { FakeCastingProvider, FakeToolExecutor } from "../src/chair/ports.js";
import {
  IntakeResultSchema,
  SituationBriefSchema,
  MemberPhaseOutputSchema,
  type PersonaForBrief,
} from "../src/chair/types.js";
import { VerdictSchema } from "@sidebar/contract";
import { JudgeScoreSchema } from "./rubrics/schema.js";
import { aggregate, runOneDilemma, type BenchmarkDilemma } from "./run-eval.js";

// Proves the eval harness's own wiring (event -> KPI extraction, judge calls,
// aggregation) is correct end-to-end against Fakes — a live run additionally
// needs GEMINI_API_KEY + VOYAGE_API_KEY + a seeded persona library (see
// run-eval.ts's own missing-prereqs check), neither of which this needs.

const personas: PersonaForBrief[] = [
  {
    id: "actuary",
    name: "The Actuary",
    archetype: "Risk quantifier",
    voice: "measured",
    coreValues: ["risk quantification"],
    biases: ["overweights downside"],
    decisionStyle: "cautious",
  },
  {
    id: "gambler",
    name: "The Gambler",
    archetype: "Bold upside-seeker",
    voice: "punchy",
    coreValues: ["seizing windows"],
    biases: ["discounts downside"],
    decisionStyle: "fast",
  },
  {
    id: "traditionalist",
    name: "The Traditionalist",
    archetype: "Status-quo guardian",
    voice: "protective",
    coreValues: ["customer trust"],
    biases: ["overweights past disruption"],
    decisionStyle: "precedent-driven",
  },
  {
    id: "pragmatist",
    name: "The Pragmatist",
    archetype: "Practical middle path",
    voice: "even-keeled",
    coreValues: ["optionality"],
    biases: ["avoids extremes"],
    decisionStyle: "balanced",
  },
];

const idealIntake = {
  summary: "Deciding whether to switch to annual billing.",
  axesOfTension: ["cash-flow predictability vs. customer flexibility", "growth speed vs. churn risk"],
  decisionType: "business",
  sidebarSize: 4,
};

const idealBrief = {
  brief: "This dilemma is exactly the kind of pricing shift that deserves careful scrutiny.",
  initialRead: "Worth a careful look.",
};

// Two distinct recommendations across the 4 members -> genuine dissent.
function memberOutput(recommendation: string) {
  return {
    fullText: `In-character reasoning landing on: ${recommendation}`,
    recommendation,
    confidence: 0.7,
    keyReasons: ["Reason A", "Reason B"],
    bubble: "Leaning that way.",
  };
}

const idealVerdict = {
  ruling: "Switch to annual billing as an opt-in discount.",
  solutionPlan: [
    "Offer annual billing as an opt-in discount, not a forced default.",
    "Attach a churn-guarantee clause to the annual tier.",
    "Review adoption data after two quarters.",
  ],
  voteSplit: { for: ["actuary", "gambler", "pragmatist"], against: ["traditionalist"], abstain: [] },
  majorityReasoning: "Three of four members converged on switching, differing on aggressiveness.",
  dissent: {
    who: "traditionalist",
    position: "Monthly billing should stay the default.",
    whyItMatters: "Pricing changes have previously triggered support-ticket spikes.",
  },
  confidence: 0.72,
  whatWouldChangeOurMind: [
    "If support tickets rise more than 15% in 60 days",
    "If annual-tier churn exceeds the monthly baseline",
  ],
};

// Routes by persona so statement/rebuttal/closing calls for different members
// return different recommendations (buildModelClient can't see which persona
// is asking — FakeModelClient's respond callback only gets {system, user, schema}).
function buildDissentingModelClient(): ModelClient {
  return new FakeModelClient(({ system, schema }) => {
    if (schema === IntakeResultSchema) return idealIntake;
    if (schema === SituationBriefSchema) return idealBrief;
    if (schema === MemberPhaseOutputSchema) {
      const switches = system.includes("The Actuary") || system.includes("The Gambler");
      return memberOutput(switches ? "Switch to annual billing." : "Keep monthly billing.");
    }
    throw new Error("unexpected schema requested in eval test fake");
  });
}

function buildVerdictModelClient(): ModelClient {
  return new FakeModelClient(({ schema }) => {
    if (schema === VerdictSchema) return idealVerdict;
    if (schema === JudgeScoreSchema) return { score: 4, justification: "Reasonably fair and grounded." };
    throw new Error("unexpected schema requested in eval verdict-client fake");
  });
}

const entry: BenchmarkDilemma = {
  id: "b01",
  dilemma: "Should our startup switch to annual billing?",
  decisionType: "business",
};

describe("runOneDilemma", () => {
  it("extracts KPIs and judge scores from a full deliberation", async () => {
    const result = await runOneDilemma(entry, {
      modelClient: buildDissentingModelClient(),
      verdictModelClient: buildVerdictModelClient(),
      castingProvider: new FakeCastingProvider(personas, 0.8, 1.4),
      toolExecutor: new FakeToolExecutor(),
    });

    expect(result.error).toBeUndefined();
    expect(result.diversityRatio).toBeCloseTo(1.4);
    expect(result.hadGenuineDissent).toBe(true); // 2 distinct recommendations pre-rebuttal
    expect(result.stanceUpdateRate).toBe(0); // no one changes their mind in this fake
    expect(result.verdict?.dissent?.who).toBe("traditionalist");
    expect(result.verdictFidelity).toBe(4);
    expect(result.actionability).toBe(4);
  });

  it("reports a fatal error instead of throwing when the sidebar fails to converge", async () => {
    const flakyClient = new FakeModelClient(({ schema }) => {
      if (schema === IntakeResultSchema) return idealIntake;
      if (schema === SituationBriefSchema) return idealBrief;
      // Every member call rejects -> all 4 recused -> fatal error, never a verdict.
      throw new Error("simulated model outage");
    });

    const result = await runOneDilemma(entry, {
      modelClient: flakyClient,
      verdictModelClient: buildVerdictModelClient(),
      castingProvider: new FakeCastingProvider(personas, 0.8, 1.4),
      toolExecutor: new FakeToolExecutor(),
    });

    expect(result.error).toBeDefined();
    expect(result.verdict).toBeUndefined();
  });
});

describe("aggregate", () => {
  it("computes means over successful sessions only, excluding errored ones", () => {
    const summary = aggregate([
      {
        id: "a",
        dilemma: "d",
        diversityRatio: 1.4,
        hadGenuineDissent: true,
        stanceUpdateRate: 0.2,
        verdictFidelity: 4,
        actionability: 5,
      },
      {
        id: "b",
        dilemma: "d",
        diversityRatio: 1.6,
        hadGenuineDissent: false,
        stanceUpdateRate: 0.4,
        verdictFidelity: 3,
        actionability: 4,
      },
      { id: "c", dilemma: "d", diversityRatio: 0, hadGenuineDissent: false, stanceUpdateRate: 0, error: "boom" },
    ]);

    expect(summary.sessions).toBe(3);
    expect(summary.errors).toBe(1);
    expect(summary.diversityRatioMean).toBeCloseTo(1.5);
    expect(summary.genuineDissentRate).toBeCloseTo(0.5);
    expect(summary.verdictFidelityMean).toBeCloseTo(3.5);
    expect(summary.actionabilityMean).toBeCloseTo(4.5);
  });

  it("returns zeroed means for an empty result set rather than NaN", () => {
    const summary = aggregate([]);
    expect(summary.diversityRatioMean).toBe(0);
    expect(summary.genuineDissentRate).toBe(0);
  });
});
