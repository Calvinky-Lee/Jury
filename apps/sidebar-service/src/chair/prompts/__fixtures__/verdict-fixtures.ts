import type { CastMemberLite, MemberTranscript, Stance } from '../../types.js';
import type { VerdictPromptInput } from '../verdict.js';

interface StanceFixture {
  dilemma: string;
  axesOfTension: string[];
  members: CastMemberLite[];
  lockedStances: Record<string, Stance>;
  transcripts: Record<string, MemberTranscript>;
}

function toVerdictInput(f: StanceFixture): VerdictPromptInput {
  return {
    dilemma: f.dilemma,
    axesOfTension: f.axesOfTension,
    members: f.members,
    lockedStances: f.lockedStances,
    transcripts: f.transcripts,
  };
}

// --- 3-1 split: the required acceptance-test case from spec 04 §6 ---------

const splitMembers: CastMemberLite[] = [
  { id: 'actuary', name: 'The Actuary', archetype: 'Risk quantifier' },
  { id: 'gambler', name: 'The Gambler', archetype: 'Bold upside-seeker' },
  { id: 'traditionalist', name: 'The Traditionalist', archetype: 'Status-quo guardian' },
  { id: 'pragmatist', name: 'The Pragmatist', archetype: 'Practical middle path' },
];

const splitStances: Record<string, Stance> = {
  actuary: {
    recommendation: 'Switch to annual billing, but only with a churn-guarantee clause.',
    confidence: 0.75,
    keyReasons: [
      'Annual contracts reduce monthly churn volatility',
      'Cash flow predictability improves forecasting',
    ],
  },
  gambler: {
    recommendation: 'Switch to annual billing and push a steep multi-year discount to lock in growth fast.',
    confidence: 0.85,
    keyReasons: [
      'Aggressive annual pricing accelerates land-grab in a growing market',
      'Locked-in revenue funds faster hiring',
    ],
  },
  traditionalist: {
    recommendation: 'Keep monthly billing; the flexibility is what customers trust us for.',
    confidence: 0.7,
    keyReasons: [
      'Monthly billing lowers the barrier to entry for new customers',
      'Switching pricing models this early risks alienating the existing base',
    ],
  },
  pragmatist: {
    recommendation: 'Switch to annual billing, offered as an optional discount alongside monthly.',
    confidence: 0.65,
    keyReasons: [
      'Optional annual pricing captures upside without forcing a migration',
      'Keeps monthly as a safety net for price-sensitive segments',
    ],
  },
};

const splitTranscripts: Record<string, MemberTranscript> = {
  actuary: {
    statement: 'Data shows annual contracts cut churn by roughly a third in comparable SaaS cohorts.',
    rebuttal: 'The Traditionalist is right that flexibility matters, which is why I want a churn-guarantee clause, not a blind switch.',
    closing: 'Switch to annual, but protect the downside with a guarantee clause.',
  },
  gambler: {
    statement: 'Growth-stage companies that moved fast on annual pricing captured market share while competitors hesitated.',
    rebuttal: "The Actuary's caution is fine as a floor, but we should be pricing for the upside case, not just the safe case.",
    closing: 'Go annual, go aggressive, lock in the growth window now.',
  },
  traditionalist: {
    statement: 'Every pricing-model change we have made in the last two years correlated with a support-ticket spike.',
    rebuttal: 'The Gambler is optimizing for a market condition that may not hold; I would rather protect what is working.',
    closing: 'Keep monthly. Trust is worth more than a forecasting convenience.',
  },
  pragmatist: {
    statement: 'We do not have to choose one model — offering both lets the market self-select.',
    rebuttal: 'The Traditionalist and the Gambler are both right about their respective risks, which is exactly why optionality resolves it.',
    closing: 'Offer annual as a discounted option, keep monthly as the default.',
  },
};

export const splitFixture: StanceFixture = {
  dilemma: 'Should our startup switch to annual billing?',
  axesOfTension: ['cash-flow predictability vs. customer flexibility', 'growth speed vs. churn risk'],
  members: splitMembers,
  lockedStances: splitStances,
  transcripts: splitTranscripts,
};

export const splitVerdictInput: VerdictPromptInput = toVerdictInput(splitFixture);

/** Hand-authored "ideal" verdict for splitFixture — what we want a good model call to produce. */
export const splitIdealVerdict = {
  ruling: 'Switch to annual billing, offered as a discounted opt-in alongside monthly, with a churn-guarantee clause attached to the annual tier.',
  solutionPlan: [
    "Launch annual billing as an optional discounted tier rather than a forced migration (the Pragmatist's optionality)",
    "Attach a churn-guarantee clause to the annual tier so customers can exit without penalty in year one (the Actuary's safeguard)",
    "Price the annual discount aggressively enough to actually shift adoption, not just offer it passively (the Gambler's urgency)",
    'Monitor support-ticket volume for 60 days post-launch as the early warning signal the Traditionalist is worried about',
  ],
  voteSplit: {
    for: ['actuary', 'gambler', 'pragmatist'],
    against: ['traditionalist'],
    abstain: [],
  },
  majorityReasoning:
    'Three of four members converged on switching to annual billing, differing mainly on how aggressively to push it and what safeguards to attach.',
  dissent: {
    who: 'traditionalist',
    position:
      'Monthly billing should stay the default because pricing-model changes have historically triggered support-ticket spikes, and flexibility is part of what earns customer trust.',
    whyItMatters:
      'If the annual push is not clearly optional and reversible, the Traditionalist\'s concern becomes the real risk: existing customers could feel coerced into a plan that no longer matches how they evaluate the product.',
  },
  confidence: 0.72,
  whatWouldChangeOurMind: [
    'If support-ticket volume rises more than 15% in the 60 days after launch',
    'If annual-tier churn in the first cohort exceeds the monthly baseline rather than beating it',
  ],
};

// --- Unanimous case: dissent must be null ---------------------------------

const unanimousMembers: CastMemberLite[] = splitMembers;

const unanimousStances: Record<string, Stance> = {
  actuary: {
    recommendation: 'Accept the acquisition offer.',
    confidence: 0.8,
    keyReasons: ['Offer price is well above independent valuation', 'Reduces runway risk'],
  },
  gambler: {
    recommendation: 'Accept the acquisition offer.',
    confidence: 0.7,
    keyReasons: ['Locks in a strong outcome before market conditions shift', 'Frees capital for the next venture'],
  },
  traditionalist: {
    recommendation: 'Accept the acquisition offer.',
    confidence: 0.75,
    keyReasons: ['Acquirer has a track record of preserving acquired teams', 'Avoids the risk of a down round'],
  },
  pragmatist: {
    recommendation: 'Accept the acquisition offer.',
    confidence: 0.78,
    keyReasons: ['Terms protect employee equity', 'Independent growth path is not clearly better'],
  },
};

const unanimousTranscripts: Record<string, MemberTranscript> = {
  actuary: { statement: 'The multiple offered exceeds comparable recent exits.', rebuttal: 'Agreed with the others — no meaningful counter-signal here.', closing: 'Accept; the math is not close.' },
  gambler: { statement: 'This is a strong outcome relative to where the market is heading.', rebuttal: 'No disagreement — this is one of the rare unanimous calls.', closing: 'Accept and move fast before terms change.' },
  traditionalist: { statement: 'The acquirer has kept prior acquired teams intact, which lowers my usual caution here.', rebuttal: 'Nothing here conflicts with my read.', closing: 'Accept; this fits the pattern of good outcomes.' },
  pragmatist: { statement: 'Employee equity terms are protected, which resolves my usual concern.', rebuttal: 'All four of us are reading this the same way.', closing: 'Accept.' },
};

export const unanimousFixture: StanceFixture = {
  dilemma: 'Should we accept the acquisition offer?',
  axesOfTension: ['independence vs. certainty', 'short-term outcome vs. long-term upside'],
  members: unanimousMembers,
  lockedStances: unanimousStances,
  transcripts: unanimousTranscripts,
};

export const unanimousVerdictInput: VerdictPromptInput = toVerdictInput(unanimousFixture);

// --- 2-2-ish tie with an abstain: edge case for future rebuttal/verdict work ---

const tieMembers: CastMemberLite[] = splitMembers;

const tieStances: Record<string, Stance> = {
  actuary: {
    recommendation: 'Relocate HQ to Austin.',
    confidence: 0.6,
    keyReasons: ['Lower operating costs', 'Favorable tax environment'],
  },
  gambler: {
    recommendation: 'Relocate HQ to Austin.',
    confidence: 0.65,
    keyReasons: ['Access to a faster-growing talent pool', 'Signals momentum to investors'],
  },
  traditionalist: {
    recommendation: 'Stay in the current city.',
    confidence: 0.6,
    keyReasons: ['Relocation disrupts existing team retention', 'Client relationships are locally rooted'],
  },
  pragmatist: {
    recommendation: 'Not enough information to decide either way yet.',
    confidence: 0.4,
    keyReasons: ['Cost model depends on unconfirmed lease terms', 'Team retention impact has not been surveyed'],
  },
};

const tieTranscripts: Record<string, MemberTranscript> = {
  actuary: { statement: 'Operating cost delta is material over a 5-year horizon.', rebuttal: "The Pragmatist's caution is fair, but the cost model holds under reasonable assumptions.", closing: 'Relocate; the numbers favor it.' },
  gambler: { statement: 'Austin talent inflow has been accelerating for three years running.', rebuttal: 'The Traditionalist is underweighting the upside of being where the growth is.', closing: 'Move now while the talent advantage is fresh.' },
  traditionalist: { statement: 'We would lose a meaningful share of the team who will not relocate.', rebuttal: 'The Actuary and Gambler are both underweighting retention risk.', closing: 'Stay; the team is the asset, not the address.' },
  pragmatist: { statement: 'We are deciding on a lease quote we have not confirmed and a retention risk we have not measured.', rebuttal: 'Both sides are arguing from assumptions that should be data first.', closing: 'Hold the decision until we have real numbers.' },
};

export const tieFixture: StanceFixture = {
  dilemma: 'Should we relocate the HQ to Austin?',
  axesOfTension: ['cost savings vs. team retention', 'growth signaling vs. decision certainty'],
  members: tieMembers,
  lockedStances: tieStances,
  transcripts: tieTranscripts,
};

export const tieVerdictInput: VerdictPromptInput = toVerdictInput(tieFixture);
