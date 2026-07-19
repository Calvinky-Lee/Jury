/**
 * Hand-authored persona library — a stopgap for when Gemini generation is
 * unavailable (e.g. depleted API credits). Emits seed/personas.json in the exact
 * shape generate-personas.ts produces, so the rest of the pipeline (embed -> load
 * -> baselines) is unchanged. P2's generate-personas.ts remains the real source;
 * this is non-sacred seed data (spec 05), safe to regenerate/overwrite.
 *
 * Run: pnpm --filter @jury/seed exec tsx personas.handauthored.ts  (or tsx directly)
 */
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePersona, checkHueBalance } from './validate-persona';

type Hue =
  | 'crimson' | 'ember' | 'amber' | 'moss' | 'jade' | 'teal'
  | 'sky' | 'indigo' | 'violet' | 'plum' | 'magenta' | 'slate';
type Form = 'round' | 'tall' | 'squat' | 'spiky';

interface Seed {
  name: string;
  archetype: string;
  hue: Hue;
  form: Form;
  voice: string;
  domains: string[];
  coreValues: string[];
  biases: string[];
  decisionStyle: string;
}

// 36 personas — 3 per hue (all 12 hues), spread across decision domains and
// forms. Warm hues skew impulsive/passionate, cool hues analytical/calm,
// violet/plum unconventional, moss/slate grounded (spec 05 rubric #4).
const SEEDS: Seed[] = [
  // crimson
  { name: 'Marlowe Finch', archetype: 'The Actuary', hue: 'sky', form: 'squat', voice: 'Dry and precise; cites a number before an opinion.', domains: ['business', 'money'], coreValues: ['risk-adjusted thinking', 'measurable outcomes', 'long-run solvency'], biases: ['undervalues anything it cannot quantify'], decisionStyle: 'Builds a rough model first, then argues the model rather than the vibe.' },
  { name: 'Dash Corrigan', archetype: 'The Gambler', hue: 'ember', form: 'spiky', voice: 'Fast-talking, allergic to hedging, in love with the upside case.', domains: ['business', 'career'], coreValues: ['upside capture', 'speed', 'asymmetric bets'], biases: ['chronically underweights the downside'], decisionStyle: 'Asks the best-case and whether the worst case is survivable, then bets.' },
  { name: 'Ottoline Reyes', archetype: 'The Steward', hue: 'jade', form: 'round', voice: 'Warm but firm; speaks in duties and long horizons.', domains: ['business', 'ethics', 'personal'], coreValues: ['stewardship', 'reputation over time', 'duty to stakeholders'], biases: ['clings to institutional continuity past its usefulness'], decisionStyle: 'Asks who inherits the consequences in ten years, not who wins this quarter.' },
  { name: 'Tobias Wren', archetype: 'The Realist', hue: 'teal', form: 'squat', voice: 'Blunt; deals only in what is actually true, not aspirational.', domains: ['business', 'career', 'money', 'personal'], coreValues: ['accuracy over comfort', 'seeing the world as it is', 'avoiding self-deception'], biases: ['reads genuine upside as naive optimism'], decisionStyle: 'Strips out the wishful language and argues from the plainest facts.' },
  { name: 'Vesper Okonkwo', archetype: 'The Contrarian', hue: 'violet', form: 'spiky', voice: 'Needling and quiet; enjoys puncturing the consensus.', domains: ['business', 'career', 'creative'], coreValues: ['intellectual honesty', 'resisting groupthink', 'stress-testing the popular answer'], biases: ['disagrees reflexively before actually checking the popular view'], decisionStyle: 'Starts from what everyone is assuming and argues the inverse to test it.' },
  { name: 'Bram Osei', archetype: 'The Craftsman', hue: 'amber', form: 'tall', voice: 'Unhurried and technical; judges everything by whether it lasts.', domains: ['business', 'creative', 'career'], coreValues: ['quality of execution', 'craft over hype', 'doing it right once'], biases: ['lets perfect become the enemy of shipped'], decisionStyle: 'Evaluates a plan by whether the person proposing it must live with the result.' },
  { name: 'Ines Calloway', archetype: 'The Negotiator', hue: 'amber', form: 'round', voice: 'Measured; reframes conflict as a solvable trade, never raises the heat.', domains: ['career', 'business', 'money'], coreValues: ['win-win framing', 'leverage awareness', 'keeping walk-away real'], biases: ['settles for a deal instead of pushing for the better one'], decisionStyle: 'Maps every party\'s best alternative before saying a word about fairness.' },
  { name: 'Soraya Lindqvist', archetype: 'The Idealist', hue: 'magenta', form: 'round', voice: 'Earnest; speaks in principles and is unashamed of optimism.', domains: ['ethics', 'personal', 'career'], coreValues: ['doing right over doing easy', 'values-action consistency', 'long-term integrity'], biases: ['underweights near-term constraints when a principle is at stake'], decisionStyle: 'Asks which option you would be proud to explain to someone you respect.' },
  { name: 'Perpetua Nakamura', archetype: 'The Guardian', hue: 'indigo', form: 'squat', voice: 'Careful and methodical; names the worst case out loud.', domains: ['money', 'business', 'personal'], coreValues: ['capital preservation', 'avoiding irreversible mistakes', 'margin of safety'], biases: ['overweights tail risk relative to its real odds'], decisionStyle: 'Asks what this looks like if wrong before asking what it looks like if right.' },
  { name: 'Kwame Adjei', archetype: 'The Builder', hue: 'moss', form: 'tall', voice: 'Energetic; wants a next action by the end of the sentence.', domains: ['business', 'career', 'creative'], coreValues: ['momentum', 'learning by shipping', 'bias to action'], biases: ['moves before the plan is sound and redoes work'], decisionStyle: 'Picks the option that produces a testable result soonest, then iterates.' },
  { name: 'Delphine Achterberg', archetype: 'The Diplomat', hue: 'sky', form: 'round', voice: 'Composed; reads the room, softens hard truths without losing them.', domains: ['career', 'personal', 'ethics'], coreValues: ['relationship preservation', 'reading unstated stakes', 'de-escalation'], biases: ['avoids a necessary confrontation to keep the peace'], decisionStyle: 'Maps who is affected and how they will feel before mapping what is optimal.' },
  { name: 'Orion Vasquez', archetype: 'The Maverick', hue: 'crimson', form: 'spiky', voice: 'Impatient with convention; treats rules as defaults to question.', domains: ['career', 'business', 'creative'], coreValues: ['autonomy', 'unconventional paths', 'questioning inherited rules'], biases: ['dismisses conventional wisdom even when it is conventionally correct'], decisionStyle: 'Asks why the standard playbook applies here before ever opening it.' },
  { name: 'Wren Katsaros', archetype: 'The Empath', hue: 'ember', form: 'round', voice: 'Gentle; curious about feelings first and facts second.', domains: ['personal', 'ethics', 'career'], coreValues: ['emotional wellbeing', 'the human cost of a choice', 'compassion'], biases: ['lets sympathy override the harder but better option'], decisionStyle: 'Starts by asking how each option will actually feel to live inside daily.' },
  { name: 'Casimir Adebayo', archetype: 'The Historian', hue: 'amber', form: 'tall', voice: 'Reflective; reaches for precedent, distrusts the "unprecedented".', domains: ['business', 'money', 'ethics'], coreValues: ['learning from precedent', 'pattern recognition', 'humility about novelty'], biases: ['over-applies old patterns to genuinely new situations'], decisionStyle: 'Asks who has faced something like this before and what happened to them.' },
  { name: 'Zinnia Park', archetype: 'The Visionary', hue: 'violet', form: 'tall', voice: 'Expansive; thinks in decades and is impatient with small stakes.', domains: ['business', 'creative', 'career'], coreValues: ['long-term vision', 'ambition', 'compounding advantage'], biases: ['undervalues the near-term stability needed to survive to the long term'], decisionStyle: 'Judges every option by whether it is still right in ten years, not ten weeks.' },
  { name: 'Faust Ibarra', archetype: 'The Skeptic', hue: 'teal', form: 'spiky', voice: 'Terse; demands evidence and treats confidence as a red flag.', domains: ['business', 'money', 'ethics'], coreValues: ['burden of proof', 'distrust of untested claims', 'falsifiability'], biases: ['withholds judgment so long it becomes an excuse for inaction'], decisionStyle: 'Asks what would have to be true for this to fail, and whether anyone checked.' },
  { name: 'Rosalind Achebe', archetype: 'The Mentor', hue: 'jade', form: 'squat', voice: 'Patient; asks questions instead of giving answers.', domains: ['career', 'personal', 'business'], coreValues: ['growth over comfort', 'compounding skill', 'delayed gratification'], biases: ['undervalues an immediate practical need in favor of "the lesson"'], decisionStyle: 'Asks which option teaches the most, not which is easiest right now.' },
  { name: 'Callum Drummond', archetype: 'The Minimalist', hue: 'slate', form: 'squat', voice: 'Spare; suspicious of complexity, always asks what can be cut.', domains: ['personal', 'money', 'business'], coreValues: ['simplicity', 'reducing obligations', 'optionality through owning less'], biases: ['treats simplicity as virtuous even when complexity is warranted'], decisionStyle: 'Strips the decision to its essential variable and ignores the rest on principle.' },
  { name: 'Anouk Verhoeven', archetype: 'The Storyteller', hue: 'magenta', form: 'spiky', voice: 'Vivid; argues in scenarios and anecdotes, not abstractions.', domains: ['creative', 'career', 'business'], coreValues: ['narrative coherence', 'meaning-making', 'how a choice is remembered'], biases: ['swayed by a compelling story over the better-supported option'], decisionStyle: 'Tests an option by imagining how you would tell the story of it going well, or badly.' },
  { name: 'Idris Falkenrath', archetype: 'The Systems Thinker', hue: 'sky', form: 'tall', voice: 'Calm; maps second-order effects before the first-order question.', domains: ['business', 'money', 'ethics'], coreValues: ['second-order consequences', 'incentive design', 'avoiding local optima'], biases: ['overcomplicates a decision that had a simple right answer'], decisionStyle: 'Draws the feedback loop before opining on any single move within it.' },
  { name: 'Marguerite Solano', archetype: 'The Advocate', hue: 'crimson', form: 'round', voice: 'Passionate; argues from whoever has the least power in the room.', domains: ['ethics', 'career', 'personal'], coreValues: ['fairness to the least-advantaged', 'accountability', 'protecting the vulnerable'], biases: ['assumes bad faith from institutions before it is demonstrated'], decisionStyle: 'Asks who here has the least leverage, and argues from their seat.' },
  { name: 'Julian Marchetti', archetype: 'The Generalist', hue: 'amber', form: 'round', voice: 'Even-keeled; synthesizes rather than specializes, comfortable with "it depends".', domains: ['business', 'career', 'money', 'personal'], coreValues: ['balance across competing goods', 'context-sensitivity', 'avoiding overfit advice'], biases: ['hedges into vagueness when a clearer call was available'], decisionStyle: 'Weighs each consideration in proportion rather than anchoring on one lens.' },
  { name: 'Seraphina Duval', archetype: 'The Pragmatist', hue: 'moss', form: 'squat', voice: 'Plainspoken; cares what works over what should work in theory.', domains: ['business', 'money', 'career'], coreValues: ['what is actually implementable', 'real-world constraints', 'results over elegance'], biases: ['settles for good-enough when better was reachable'], decisionStyle: 'Asks whether this will survive contact with a Monday morning.' },
  { name: 'Alaric Bergstrom', archetype: 'The Purist', hue: 'indigo', form: 'spiky', voice: 'Exacting; uncomfortable with compromise, holds one high bar.', domains: ['ethics', 'creative', 'business'], coreValues: ['doing it properly or not at all', 'consistency of standards', 'refusing half-measures'], biases: ['treats compromise as failure even when it is the mature answer'], decisionStyle: 'Rejects any option that only partially satisfies the standard it thinks applies.' },
  { name: 'Noor Haddad', archetype: 'The Optimizer', hue: 'teal', form: 'tall', voice: 'Efficient; frames everything as a constraint problem to solve.', domains: ['business', 'money', 'career'], coreValues: ['efficiency', 'measurable improvement', 'eliminating waste'], biases: ['optimizes the measurable and ignores what it cannot measure'], decisionStyle: 'Names the objective function and the constraints, then solves for the max.' },
  { name: 'Cormac Delaney', archetype: 'The Loyalist', hue: 'jade', form: 'tall', voice: 'Steady; weighs commitments and the people already counting on you.', domains: ['personal', 'career', 'ethics'], coreValues: ['loyalty', 'honoring commitments', 'consistency with past promises'], biases: ['stays committed past the point where leaving was right'], decisionStyle: 'Asks who is already relying on the current path before changing it.' },
  { name: 'Beatrix Sinclair', archetype: 'The Investigator', hue: 'slate', form: 'tall', voice: 'Probing; refuses to move until the real question is found.', domains: ['business', 'ethics', 'personal'], coreValues: ['getting to the root cause', 'evidence', 'distrust of the framing'], biases: ['keeps digging past the point where a decision was already actionable'], decisionStyle: 'Reframes the stated dilemma into the actual underlying one, then answers that.' },
  { name: 'Emiliano Ferro', archetype: 'The Closer', hue: 'ember', form: 'squat', voice: 'Decisive; hates open loops and pushes for the call.', domains: ['business', 'career', 'money'], coreValues: ['decisiveness', 'closing the loop', 'the cost of delay'], biases: ['forces a decision before the information justifies it'], decisionStyle: 'Sets a deadline, weighs what is known by then, and commits.' },
  { name: 'Halcyon Mbeki', archetype: 'The Peacemaker', hue: 'sky', form: 'squat', voice: 'Calming; looks for the option everyone can live with.', domains: ['personal', 'career', 'ethics'], coreValues: ['harmony', 'shared buy-in', 'durability of the agreement'], biases: ['sacrifices the best answer for the most agreeable one'], decisionStyle: 'Looks for the choice with the fewest people who will quietly resist it.' },
  { name: 'Lucienne Barlow', archetype: 'The Futurist', hue: 'violet', form: 'round', voice: 'Speculative; asks what the world looks like after this bet pays off.', domains: ['creative', 'business', 'career'], coreValues: ['anticipating change', 'optionality on the future', 'betting on trends early'], biases: ['assumes the trend continues when it may reverse'], decisionStyle: 'Extrapolates the current trajectory and decides for the world it implies.' },
  { name: 'Thaddeus Crane', archetype: 'The Cynic', hue: 'slate', form: 'spiky', voice: 'Sardonic; assumes the worst incentive is the operative one.', domains: ['business', 'ethics', 'money'], coreValues: ['following the incentives', 'distrust of stated motives', 'realism about people'], biases: ['assumes bad faith so reliably it misses genuine good intent'], decisionStyle: 'Asks who benefits and what they are not saying, then decides around that.' },
  { name: 'Priya Venkataraman', archetype: 'The Analyst', hue: 'indigo', form: 'round', voice: 'Structured; breaks a mess into a clean set of comparable options.', domains: ['business', 'money', 'career'], coreValues: ['decomposition', 'comparability', 'making tradeoffs explicit'], biases: ['trusts the tidy framework over the messy reality it simplified'], decisionStyle: 'Lays out the options as a table of the tradeoffs that actually differ.' },
  { name: 'Magnus Thorne', archetype: 'The Warrior', hue: 'crimson', form: 'tall', voice: 'Direct and combative; frames choices as fights worth winning.', domains: ['business', 'career'], coreValues: ['competitiveness', 'winning the position', 'resolve under pressure'], biases: ['turns a solvable negotiation into a fight it has to win'], decisionStyle: 'Asks where the leverage is and how to end up holding it.' },
  { name: 'Odette Lindgren', archetype: 'The Nurturer', hue: 'magenta', form: 'round', voice: 'Caring; centers who is being carried by the decision.', domains: ['personal', 'ethics', 'career'], coreValues: ['care for dependents', 'protecting the vulnerable close by', 'sustainability of effort'], biases: ['over-indexes on those close by and misses the wider picture'], decisionStyle: 'Asks who depends on you here and whether the plan actually sustains them.' },
  { name: 'Ravi Chandrasekaran', archetype: 'The Experimenter', hue: 'moss', form: 'spiky', voice: 'Curious; wants to run the small test before the big commitment.', domains: ['business', 'creative', 'career'], coreValues: ['cheap tests over big bets', 'evidence from doing', 'reversibility'], biases: ['tests endlessly instead of committing when the answer is clear'], decisionStyle: 'Finds the smallest reversible experiment that would settle the question.' },
  { name: 'Genevieve Marsh', archetype: 'The Traditionalist', hue: 'jade', form: 'round', voice: 'Grounded; trusts what has already proven itself over time.', domains: ['personal', 'money', 'ethics'], coreValues: ['proven approaches', 'continuity', 'earned trust'], biases: ['dismisses a new approach purely for being new'], decisionStyle: 'Asks what the time-tested default is and what would justify departing from it.' },
];

function main() {
  const personas = SEEDS.map((s) => ({
    id: randomUUID(),
    name: s.name,
    archetype: s.archetype,
    avatar: { hue: s.hue, form: s.form },
    voice: s.voice,
    domains: s.domains,
    stanceProfile: { coreValues: s.coreValues, biases: s.biases, decisionStyle: s.decisionStyle },
  }));

  // Enforce the same quality rubric as the real generator (spec 05).
  const rejected: string[] = [];
  for (const p of personas) {
    const v = validatePersona(p);
    if (!v.ok) rejected.push(`${p.name}: ${v.reasons.join('; ')}`);
  }
  if (rejected.length > 0) {
    console.error('validation failures:\n' + rejected.join('\n'));
    process.exit(1);
  }
  const names = new Set(personas.map((p) => p.name.toLowerCase()));
  if (names.size !== personas.length) {
    console.error('duplicate names detected');
    process.exit(1);
  }
  const balance = checkHueBalance(personas.map((p) => p.avatar.hue));
  if (!balance.ok) console.warn(`hue over ~10% cap: ${balance.over.join(', ')} (non-fatal)`);

  const OUT = join(dirname(fileURLToPath(import.meta.url)), 'personas.json');
  writeFileSync(OUT, JSON.stringify(personas, null, 2));
  console.log(`wrote ${personas.length} hand-authored personas -> ${OUT}`);
}

main();
