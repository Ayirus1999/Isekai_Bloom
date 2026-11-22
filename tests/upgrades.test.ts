import { describe, expect, it } from 'vitest';
import { UPGRADES } from '../src/data/upgrades';
import { Rng } from '../src/core/rng';
import { applyUpgrade, rollUpgradeChoices } from '../src/game/upgrades';
import { EMPTY_MODS } from '../src/game/types';

describe('upgrade pool', () => {
  it('offers three distinct cards', () => {
    const offers = rollUpgradeChoices('yuzuki', {}, 0, new Rng(11), 3);
    expect(offers).toHaveLength(3);
    expect(new Set(offers.map((offer) => offer.id)).size).toBe(3);
  });

  it('keeps character cards to their own heroine', () => {
    const offers = rollUpgradeChoices('yuzuki', {}, 3, new Rng(23), 3);
    expect(offers.every((offer) => !offer.heroine || offer.heroine === 'yuzuki')).toBe(true);
  });

  it('never offers an upgrade beyond its stack limit', () => {
    const def = UPGRADES.find((entry) => entry.id === 'sharpened-edge')!;
    const owned = { [def.id]: def.maxStacks };
    const offers = rollUpgradeChoices('yuzuki', owned, 2, new Rng(7), 3);
    expect(offers.some((offer) => offer.id === def.id)).toBe(false);
  });

  it('unlocks an evolution once both prerequisites are owned', () => {
    const evolved = UPGRADES.find((entry) => entry.evolved)!;
    const [a, b] = evolved.requires!;
    const offers = rollUpgradeChoices(evolved.heroine!, { [a!]: 1, [b!]: 1 }, 6, new Rng(4), 3);
    expect(offers.some((offer) => offer.id === evolved.id)).toBe(true);
  });

  it('does not offer an evolution before its prerequisites', () => {
    const evolved = UPGRADES.find((entry) => entry.evolved)!;
    const offers = rollUpgradeChoices(evolved.heroine!, {}, 9, new Rng(5), 3);
    expect(offers.some((offer) => offer.id === evolved.id)).toBe(false);
  });

  it('applies every numeric effect to the run modifiers', () => {
    const def = UPGRADES.find((entry) => entry.id === 'sharpened-edge')!;
    const mods = { ...EMPTY_MODS };
    applyUpgrade(mods, def);
    expect(mods.attackPct).toBeCloseTo(0.12);
  });
});
