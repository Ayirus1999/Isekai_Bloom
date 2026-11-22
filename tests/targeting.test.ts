import { describe, expect, it } from 'vitest';
import { scoreTarget, selectTarget, type TargetCandidate } from '../src/game/targeting';

function candidate(id: string, x: number, tier: TargetCandidate['tier'] = 'normal'): TargetCandidate {
  return { id, x, tier, alive: true, hpRatio: 1 };
}

describe('scoreTarget', () => {
  it('prefers the closer of two normal enemies', () => {
    const near = scoreTarget(candidate('near', 120), 100, null);
    const far = scoreTarget(candidate('far', 600), 100, null);
    expect(near).toBeGreaterThan(far);
  });

  it('keeps a loyalty bonus for the current target', () => {
    const current = scoreTarget(candidate('a', 300), 100, 'a');
    const other = scoreTarget(candidate('b', 260), 100, 'a');
    expect(current).toBeGreaterThan(other);
  });

  it('values elites and bosses above normal enemies at the same distance', () => {
    const base = scoreTarget(candidate('n', 400), 100, null);
    const elite = scoreTarget(candidate('e', 400, 'elite'), 100, null);
    const boss = scoreTarget(candidate('b', 400, 'boss'), 100, null);
    expect(elite).toBeGreaterThan(base);
    expect(boss).toBeGreaterThan(elite);
  });
});

describe('selectTarget', () => {
  it('returns nothing when every enemy is dead', () => {
    expect(selectTarget([{ ...candidate('a', 200), alive: false }], 100, 'a')).toBeNull();
  });

  it('does not flip-flop between nearby enemies', () => {
    const enemies = [candidate('a', 320), candidate('b', 340)];
    expect(selectTarget(enemies, 100, 'a')?.id).toBe('a');
    expect(selectTarget(enemies, 100, 'b')?.id).toBe('b');
  });

  it('switches when another enemy is decisively closer', () => {
    const enemies = [candidate('a', 500), candidate('b', 150)];
    expect(selectTarget(enemies, 100, 'a')?.id).toBe('b');
  });

  it('switches to a boss that arrives next to the current target', () => {
    const enemies = [candidate('slime', 300), candidate('queen', 320, 'boss')];
    expect(selectTarget(enemies, 100, 'slime')?.id).toBe('queen');
  });

  it('recovers when the current target dies', () => {
    const enemies = [{ ...candidate('a', 200), alive: false }, candidate('b', 380)];
    expect(selectTarget(enemies, 100, 'a')?.id).toBe('b');
  });
});
