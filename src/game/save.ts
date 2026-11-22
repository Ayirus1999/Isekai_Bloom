import type { HeroineId, SaveData, WorldId } from './types';
import { HEROINES } from '../data/heroines';
import { WORLDS } from '../data/worlds';

const STORAGE_KEY = 'hoshi-no-hanabira.save';
export const SAVE_VERSION = 1;

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    coins: 0,
    unlockedHeroines: ['yuzuki'],
    unlockedWorlds: ['blossom'],
    permanent: {},
    achievements: [],
    stats: { runs: 0, victories: 0, enemiesDefeated: 0, bossesDefeated: 0, bestEncounter: 0 },
    settings: { muted: false, speed: 1 },
  };
}

/** Read the versioned save, tolerating missing or corrupt storage. */
export function loadSave(): SaveData {
  const base = defaultSave();
  if (typeof localStorage === 'undefined') return base;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    if (!parsed || typeof parsed !== 'object') return base;
    return {
      ...base,
      ...parsed,
      version: SAVE_VERSION,
      unlockedHeroines: Array.isArray(parsed.unlockedHeroines) && parsed.unlockedHeroines.length > 0
        ? parsed.unlockedHeroines.filter((id) => HEROINES.some((heroine) => heroine.id === id))
        : base.unlockedHeroines,
      unlockedWorlds: Array.isArray(parsed.unlockedWorlds) && parsed.unlockedWorlds.length > 0
        ? parsed.unlockedWorlds.filter((id) => WORLDS.some((world) => world.id === id))
        : base.unlockedWorlds,
      permanent: { ...base.permanent, ...(parsed.permanent ?? {}) },
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
      stats: { ...base.stats, ...(parsed.stats ?? {}) },
      settings: { ...base.settings, ...(parsed.settings ?? {}) },
    };
  } catch {
    return base;
  }
}

export function persist(save: SaveData): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    // A full or unavailable store must never break a run.
  }
}

export interface PermanentUpgrade {
  id: string;
  name: string;
  description: string;
  stat: 'maxHpPct' | 'attackPct' | 'attackSpeedPct' | 'critChance' | 'coinPct';
  perLevel: number;
  maxLevel: number;
  baseCost: number;
}

export const PERMANENT_UPGRADES: PermanentUpgrade[] = [
  {
    id: 'vitality',
    name: 'Star Vitality',
    description: '+6% maximum health at the start of every run.',
    stat: 'maxHpPct',
    perLevel: 0.06,
    maxLevel: 8,
    baseCost: 120,
  },
  {
    id: 'might',
    name: 'Celestial Might',
    description: '+4% attack at the start of every run.',
    stat: 'attackPct',
    perLevel: 0.04,
    maxLevel: 8,
    baseCost: 150,
  },
  {
    id: 'haste',
    name: 'Petal Haste',
    description: '+3% attack speed at the start of every run.',
    stat: 'attackSpeedPct',
    perLevel: 0.03,
    maxLevel: 6,
    baseCost: 180,
  },
  {
    id: 'insight',
    name: 'Starlit Insight',
    description: '+2% critical chance at the start of every run.',
    stat: 'critChance',
    perLevel: 0.02,
    maxLevel: 5,
    baseCost: 200,
  },
  {
    id: 'prosperity',
    name: 'Prosperity',
    description: '+10% Astral Coins earned.',
    stat: 'coinPct',
    perLevel: 0.1,
    maxLevel: 5,
    baseCost: 220,
  },
];

export function permanentLevel(save: SaveData, id: string): number {
  return Math.max(0, Math.min(99, save.permanent[id] ?? 0));
}

export function permanentCost(upgrade: PermanentUpgrade, level: number): number {
  return Math.round(upgrade.baseCost * Math.pow(1.55, level));
}

export function permanentBonuses(save: SaveData): {
  maxHpPct: number;
  attackPct: number;
  attackSpeedPct: number;
  critChance: number;
  coinPct: number;
} {
  const totals = { maxHpPct: 0, attackPct: 0, attackSpeedPct: 0, critChance: 0, coinPct: 0 };
  for (const upgrade of PERMANENT_UPGRADES) {
    const level = permanentLevel(save, upgrade.id);
    if (level <= 0) continue;
    const capped = Math.min(level, upgrade.maxLevel);
    totals[upgrade.stat] += upgrade.perLevel * capped;
  }
  return totals;
}

export function buyPermanent(save: SaveData, id: string): boolean {
  const upgrade = PERMANENT_UPGRADES.find((entry) => entry.id === id);
  if (!upgrade) return false;
  const level = permanentLevel(save, id);
  if (level >= upgrade.maxLevel) return false;
  const cost = permanentCost(upgrade, level);
  if (save.coins < cost) return false;
  save.coins -= cost;
  save.permanent[id] = level + 1;
  persist(save);
  return true;
}

export function unlockHeroine(save: SaveData, id: HeroineId): boolean {
  if (save.unlockedHeroines.includes(id)) return true;
  const heroine = HEROINES.find((entry) => entry.id === id);
  if (!heroine) return false;
  if (save.coins < heroine.unlockCost) return false;
  save.coins -= heroine.unlockCost;
  save.unlockedHeroines.push(id);
  persist(save);
  return true;
}

export function unlockWorld(save: SaveData, id: WorldId): boolean {
  if (save.unlockedWorlds.includes(id)) return true;
  const world = WORLDS.find((entry) => entry.id === id);
  if (!world) return false;
  if (save.coins < world.unlockCost) return false;
  save.coins -= world.unlockCost;
  save.unlockedWorlds.push(id);
  persist(save);
  return true;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-step', name: 'First Petal', description: 'Complete your first encounter.' },
  { id: 'guardian-slayer', name: 'Guardian Slayer', description: 'Defeat a mini-boss.' },
  { id: 'rift-sealed', name: 'Rift Sealed', description: 'Defeat a final boss and finish an adventure.' },
  { id: 'evolved', name: 'Beyond the Petals', description: 'Discover an evolved skill.' },
  { id: 'full-bloom', name: 'Full Bloom', description: 'Unlock all six Blossom Guardians.' },
  { id: 'starfarer', name: 'Starfarer', description: 'Unlock every world of Asteria.' },
  { id: 'centurion', name: 'Hundred Blooms', description: 'Defeat 100 enemies across all runs.' },
];

export function grantAchievement(save: SaveData, id: string): boolean {
  if (save.achievements.includes(id)) return false;
  if (!ACHIEVEMENTS.some((entry) => entry.id === id)) return false;
  save.achievements.push(id);
  persist(save);
  return true;
}

export function recordRun(
  save: SaveData,
  result: {
    victory: boolean;
    coins: number;
    enemiesDefeated: number;
    bossesDefeated: number;
    bestEncounter: number;
  },
): string[] {
  const unlocked: string[] = [];
  save.coins += Math.max(0, Math.round(result.coins));
  save.stats.runs += 1;
  save.stats.enemiesDefeated += result.enemiesDefeated;
  save.stats.bossesDefeated += result.bossesDefeated;
  save.stats.bestEncounter = Math.max(save.stats.bestEncounter, result.bestEncounter);
  if (result.victory) save.stats.victories += 1;

  const grant = (id: string) => {
    if (grantAchievement(save, id)) unlocked.push(id);
  };
  if (result.enemiesDefeated > 0) grant('first-step');
  if (result.bossesDefeated > 0) grant('guardian-slayer');
  if (result.victory) grant('rift-sealed');
  if (save.stats.enemiesDefeated >= 100) grant('centurion');
  if (HEROINES.every((heroine) => save.unlockedHeroines.includes(heroine.id))) grant('full-bloom');
  if (WORLDS.every((world) => save.unlockedWorlds.includes(world.id))) grant('starfarer');
  persist(save);
  return unlocked;
}
