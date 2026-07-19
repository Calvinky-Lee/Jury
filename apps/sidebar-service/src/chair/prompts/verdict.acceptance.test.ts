import { describe, it, expect } from 'vitest';
import { runVerdict, parseVerdictResponse } from './verdict.js';
import { fakeClientWithResponse, GeminiModelClient } from '../model-client.js';
import { splitVerdictInput, splitIdealVerdict, splitFixture } from './__fixtures__/verdict-fixtures.js';

// Spec 04 §6 acceptance test: given 4 fabricated stances with a 3-1 split, the
// verdict must name the dissenter, state their position fairly, produce a
// non-generic "what would change our mind", and a solution plan that
// demonstrably borrows from more than one member.

const GENERIC_CONDITION_PATTERNS = [/circumstances change/i, /if things change/i, /^if needed$/i];

const EXPECTED_BRIEF_SECTIONS = [
  '## Dilemma',
  '## Sidebar',
  '## Vote',
  '## Ruling',
  '## Solution Plan',
  '## Dissent',
  '## What Would Change Our Mind',
];

describe('verdict prompt — hand-authored fixture parses cleanly', () => {
  it('the ideal verdict satisfies the schema and names the correct dissenter', () => {
    const verdict = parseVerdictResponse(splitIdealVerdict);
    expect(verdict.dissent?.who).toBe('traditionalist');
  });
});

describe('verdict prompt — acceptance criteria (FakeModelClient, always runs)', () => {
  it('satisfies every spec-04 §6 acceptance criterion structurally', async () => {
    const client = fakeClientWithResponse(splitIdealVerdict);
    const { verdict, briefMd } = await runVerdict(client, splitVerdictInput);

    // 1. names the dissenter, states their position fairly
    expect(verdict.dissent).not.toBeNull();
    expect(verdict.dissent?.who).toBe('traditionalist');
    expect(verdict.dissent?.position.length).toBeGreaterThan(0);
    expect(verdict.dissent?.whyItMatters.length).toBeGreaterThan(0);

    // vote split matches the fixture's actual locked stances, not invented
    expect(new Set(verdict.voteSplit.for)).toEqual(new Set(['actuary', 'gambler', 'pragmatist']));
    expect(verdict.voteSplit.against).toEqual(['traditionalist']);
    expect(verdict.voteSplit.abstain).toEqual([]);

    // 2. solution plan demonstrably borrows from more than one member
    const mentionedMembers = splitFixture.members.filter((m) =>
      verdict.solutionPlan.some(
        (step) =>
          step.toLowerCase().includes(m.name.toLowerCase()) ||
          step.toLowerCase().includes(m.archetype.toLowerCase()),
      ),
    );
    expect(mentionedMembers.length).toBeGreaterThanOrEqual(2);

    // 3. non-generic, testable "what would change our mind"
    for (const condition of verdict.whatWouldChangeOurMind) {
      expect(GENERIC_CONDITION_PATTERNS.some((p) => p.test(condition))).toBe(false);
    }

    // exportable brief contains all the sections spec 04 describes
    for (const section of EXPECTED_BRIEF_SECTIONS) {
      expect(briefMd).toContain(section);
    }
  });
});

describe.skipIf(!process.env.GEMINI_API_KEY)(
  'verdict prompt — live Gemini Pro (spec 04 §6 real acceptance test)',
  () => {
    it('real model output satisfies the acceptance criteria', async () => {
      const client = new GeminiModelClient();
      const { verdict, briefMd } = await runVerdict(client, splitVerdictInput);

      expect(verdict.dissent).not.toBeNull();
      expect(verdict.dissent?.who).toBe('traditionalist');
      expect(verdict.voteSplit.against).toContain('traditionalist');
      expect(verdict.solutionPlan.length).toBeGreaterThanOrEqual(3);
      expect(verdict.whatWouldChangeOurMind.length).toBeGreaterThanOrEqual(2);
      for (const condition of verdict.whatWouldChangeOurMind) {
        expect(GENERIC_CONDITION_PATTERNS.some((p) => p.test(condition))).toBe(false);
      }

      // Structural checks only — read this manually for tone/quality (plan §Verification step 4).
      // eslint-disable-next-line no-console
      console.log('--- live verdict briefMd ---\n', briefMd);
    }, 30_000);
  },
);
