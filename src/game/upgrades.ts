import { UPGRADES } from '../data/upgrades';
import type { Rng } from '../core/rng';
import type { HeroineId, Rarity, RunMods, UpgradeDef } from './types';

const RARITY_WEIGHT: Record<Rarity, number> = {
  common: 100,
  uncommon: 48,
  rare: 22,
  epic: 8,
  legendary: 2,
};

/** Deeper encounters tilt the roll toward rarer cards. */
function weightFor(def: UpgradeDef, depth: number): number {
  const base = RARITY_WEIGHT[def.rarity];
  const bias =
    def.rarity === 'common'
      ? 1
      : def.rarity === 'uncommon'
        ? 1 + depth * 0.05
        : def.rarity === 'rare'
          ? 1 + depth * 0.09
          : def.rarity === 'epic'
            ? 1 + depth * 0.13
            : 1 + depth * 0.17;
  return base * bias;
}

export function applyUpgrade(mods: RunMods, def: UpgradeDef): void {
  for (const key of Object.keys(def.effects) as Array<keyof RunMods>) {
    const value = def.effects[key];
    if (typeof value !== 'number') continue;
    mods[key] = (mods[key] ?? 0) + value;
  }
  mods.critChance = Math.min(1, mods.critChance);
}

export function ownedEvolvedIds(owned: Record<string, number>): string[] {
  return Object.keys(owned).filter((id) => UPGRADES.find((entry) => entry.id === id)?.evolved);
}

/**
 * Draw three distinct cards. Evolved skills only enter the pool once both prerequisites are
 * owned, and character cards only appear for that heroine.
 */
export function rollUpgradeChoices(
  heroine: HeroineId,
  owned: Record<string, number>,
  depth: number,
  rng: Rng,
  count = 3,
): UpgradeDef[] {
  const pool = UPGRADES.filter((def) => {
    if (def.heroine && def.heroine !== heroine) return false;
    if ((owned[def.id] ?? 0) >= def.maxStacks) return false;
    if (def.requires) {
      const [a, b] = def.requires;
      if (!a || !b) return false;
      if ((owned[a] ?? 0) <= 0 || (owned[b] ?? 0) <= 0) return false;
    }
    return true;
  });

  const picks: UpgradeDef[] = [];
  const taken = new Set<string>();

  // An unlocked evolution always appears: it is the payoff of committing to two skills.
  const evolutions = pool.filter((def) => def.evolved);
  if (evolutions.length > 0) {
    const choice = evolutions[rng.int(0, evolutions.length - 1)]!;
    picks.push(choice);
    taken.add(choice.id);
  }

  // One character-flavoured slot increases build identity without removing shared options.
  const personal = pool.filter((def) => def.heroine === heroine && !def.evolved);
  if (personal.length > 0 && rng.chance(0.42)) {
    const choice = personal[rng.int(0, personal.length - 1)]!;
    picks.push(choice);
    taken.add(choice.id);
  }

  while (picks.length < count) {
    const remaining = pool.filter((def) => !taken.has(def.id));
    if (remaining.length === 0) break;
    let total = 0;
    for (const def of remaining) total += weightFor(def, depth);
    let roll = rng.range(0, total);
    let chosen = remaining[remaining.length - 1]!;
    for (const def of remaining) {
      roll -= weightFor(def, depth);
      if (roll <= 0) {
        chosen = def;
        break;
      }
    }
    picks.push(chosen);
    taken.add(chosen.id);
  }

  return picks.slice(0, count);
}
