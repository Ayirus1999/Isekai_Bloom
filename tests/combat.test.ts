import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { mitigate, rollDamage, rollIncoming } from '../src/game/combat';

describe('mitigate', () => {
  it('leaves damage untouched without defence', () => {
    expect(mitigate(100, 0)).toBe(100);
  });

  it('halves damage at 120 defence and keeps improving', () => {
    expect(mitigate(100, 120)).toBeCloseTo(50);
    expect(mitigate(100, 240)).toBeLessThan(mitigate(100, 120));
    expect(mitigate(100, 100000)).toBeGreaterThan(0);
  });
});

describe('rollDamage', () => {
  it('applies attack, power and mitigation', () => {
    const rng = new Rng(7);
    const result = rollDamage(50, 2, { critChance: 0, critDamage: 2 }, 120, rng);
    expect(result.crit).toBe(false);
    expect(result.amount).toBe(50);
  });

  it('multiplies by critical damage on a guaranteed critical', () => {
    const rng = new Rng(7);
    const result = rollDamage(50, 1, { critChance: 1, critDamage: 2.5 }, 0, rng);
    expect(result.crit).toBe(true);
    expect(result.amount).toBe(125);
  });

  it('never deals zero damage', () => {
    const rng = new Rng(7);
    const result = rollDamage(0.1, 0.1, { critChance: 0, critDamage: 1 }, 5000, rng);
    expect(result.amount).toBeGreaterThanOrEqual(1);
  });
});

describe('rollIncoming', () => {
  it('mitigates enemy damage with the heroine defence stat', () => {
    expect(rollIncoming(60, 0)).toBe(60);
    expect(rollIncoming(60, 120)).toBe(30);
    expect(rollIncoming(1, 10000)).toBe(1);
  });
});
