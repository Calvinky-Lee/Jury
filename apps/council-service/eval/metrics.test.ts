import { describe, it, expect } from 'vitest';
import { diversityRatio, hasGenuineDissent, genuineDissentRate, stanceUpdateRate } from './metrics.js';

describe('diversityRatio', () => {
  it('reads baselineRatio straight off casting_done', () => {
    expect(diversityRatio({ diversityScore: 0.8, baselineRatio: 1.45 })).toBe(1.45);
  });
});

describe('hasGenuineDissent', () => {
  it('true when opening stances show >=2 distinct recommendations', () => {
    const events = [
      { personaId: 'a', stance: { recommendation: 'Switch to annual billing.' } },
      { personaId: 'b', stance: { recommendation: 'Keep monthly billing.' } },
    ];
    expect(hasGenuineDissent(events)).toBe(true);
  });

  it('false when every member converges on the same recommendation (normalized)', () => {
    const events = [
      { personaId: 'a', stance: { recommendation: 'Accept the offer.' } },
      { personaId: 'b', stance: { recommendation: '  accept the offer.  ' } },
      { personaId: 'c', stance: { recommendation: 'ACCEPT THE OFFER.' } },
    ];
    expect(hasGenuineDissent(events)).toBe(false);
  });
});

describe('genuineDissentRate', () => {
  it('aggregates per-session booleans into a percentage', () => {
    expect(genuineDissentRate([true, true, false, true])).toBe(0.75);
  });

  it('is 0 for an empty run rather than dividing by zero', () => {
    expect(genuineDissentRate([])).toBe(0);
  });
});

describe('stanceUpdateRate', () => {
  it('divides stance_updated count by total rebuttals', () => {
    expect(stanceUpdateRate(2, 8)).toBe(0.25);
  });

  it('is 0 when there were no rebuttals rather than dividing by zero', () => {
    expect(stanceUpdateRate(0, 0)).toBe(0);
  });
});
