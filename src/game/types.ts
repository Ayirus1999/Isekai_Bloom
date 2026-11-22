/** Shared data shapes. Every system is data-driven from these definitions. */

export type ElementId = 'light' | 'fire' | 'moon' | 'nature' | 'shadow' | 'ice';

/** Animation / combat phase of the heroine, used by the renderer for expressions. */
export type HeroPhase =
  | 'idle'
  | 'moving'
  | 'attacking'
  | 'casting'
  | 'ultimate'
  | 'hurt'
  | 'healing'
  | 'victory'
  | 'defeated';

export type HeroineId = 'yuzuki' | 'akari' | 'shiori' | 'miyu' | 'rin' | 'airi';

export type WeaponKind = 'katana' | 'twinBlades' | 'longsword' | 'petalBlades' | 'rapier' | 'staff';

export type HairStyle = 'silverLong' | 'coralBob' | 'inkBraid' | 'peachWaves' | 'chestnutPony' | 'aquaBraids';

export type OutfitStyle = 'celestialCoat' | 'blazeJacket' | 'moonDress' | 'petalDress' | 'crimsonCoat' | 'frostDress';

export interface Stats {
  maxHp: number;
  attack: number;
  /** Basic attacks per second. */
  attackSpeed: number;
  critChance: number;
  critDamage: number;
  defense: number;
  range: number;
}

/** Legacy alias used by older heroine-action modules. */
export type AbilitySpec = AbilityDef;

/** Run-scoped modifiers produced by roguelite upgrades. Percentages are fractions (0.1 = +10%). */
export interface RunMods {
  attackPct: number;
  attackSpeedPct: number;
  critChance: number;
  critDamage: number;
  maxHpPct: number;
  defense: number;
  abilityPowerPct: number;
  cooldownPct: number;
  areaPct: number;
  bossDamagePct: number;
  eliteDamagePct: number;
  lifestealPct: number;
  regenPerSec: number;
  healOnKillPct: number;
  executePct: number;
  shieldOnHurtPct: number;
  extraStrikeChance: number;
  coinPct: number;
}

export const EMPTY_MODS: RunMods = {
  attackPct: 0,
  attackSpeedPct: 0,
  critChance: 0,
  critDamage: 0,
  maxHpPct: 0,
  defense: 0,
  abilityPowerPct: 0,
  cooldownPct: 0,
  areaPct: 0,
  bossDamagePct: 0,
  eliteDamagePct: 0,
  lifestealPct: 0,
  regenPerSec: 0,
  healOnKillPct: 0,
  executePct: 0,
  shieldOnHurtPct: 0,
  extraStrikeChance: 0,
  coinPct: 0,
};

export type AbilityKind =
  | 'slashArc'
  | 'wave'
  | 'rain'
  | 'dash'
  | 'buff'
  | 'projectile'
  | 'aoe'
  | 'heal'
  | 'shield';

/** How an ability decides it is worth using while combat runs itself. */
export type AbilityTrigger = 'inRange' | 'crowd' | 'bossOrHurt' | 'hurt' | 'always';

export interface AbilityDef {
  id: string;
  name: string;
  kind: AbilityKind;
  /** Cooldown in simulated seconds before cooldown reduction. */
  cooldown: number;
  /** Damage multiplier applied to attack. */
  power: number;
  range: number;
  radius: number;
  count: number;
  /** Buff / shield / heal duration in simulated seconds. */
  duration: number;
  trigger: AbilityTrigger;
  minEnemies: number;
  /** Health fraction below which the ability may fire. */
  hpBelow: number;
  description: string;
  /** The signature ability, presented with a cinematic clip and heavier effects. */
  ultimate?: boolean;
}

export type BasicKind = 'slash' | 'thrust' | 'twin' | 'spin' | 'projectile';

export interface BasicAttackDef {
  name: string;
  kind: BasicKind;
  power: number;
  range: number;
  projectileSpeed: number;
  /** Number of visual strikes in the combo animation. Damage is still one hit. */
  hits: number;
}

export interface Palette {
  hair: string;
  hairDark: string;
  hairLight: string;
  skin: string;
  skinShade: string;
  outfit: string;
  outfitDark: string;
  accent: string;
  glow: string;
  eye: string;
  eyeDark: string;
  lip: string;
}

export interface HeroineDef {
  id: HeroineId;
  name: string;
  title: string;
  jp: string;
  age: number;
  element: ElementId;
  elementName: string;
  role: string;
  weaponName: string;
  weapon: WeaponKind;
  hair: HairStyle;
  outfit: OutfitStyle;
  personality: string;
  lore: string;
  /** Optional ready-made portrait asset; the game draws its own when absent. */
  portrait?: string;
  locked?: boolean;
  unlockHint?: string;
  /** Astral Coins required to unlock; 0 means available from the start. */
  unlockCost: number;
  stats: Stats;
  basic: BasicAttackDef;
  abilities: AbilityDef[];
  palette: Palette;
  /** Secondary motion tuning: hair length/weight and stance character. */
  sway: number;
  stance: number;
}

export type EnemyShape =
  | 'slime'
  | 'sprite'
  | 'bunny'
  | 'mushroom'
  | 'beetle'
  | 'flame'
  | 'wisp'
  | 'fairy'
  | 'knight'
  | 'golem'
  | 'wolf'
  | 'treant'
  | 'guardian'
  | 'thornGuardian'
  | 'warden'
  | 'emberBeast'
  | 'sentinel'
  | 'queen'
  | 'dragon'
  | 'fallen'
  | 'empress'
  | 'celestial';

export type EnemyTier = 'normal' | 'elite' | 'boss';

export type EnemyBehavior = 'melee' | 'ranged' | 'boss';

/** Boss attack patterns. Bosses cycle these, and swap to a faster set at half health. */
export type BossPattern = 'sweep' | 'volley' | 'slam' | 'beam' | 'meteor' | 'drain';

export interface EnemyDef {
  id: string;
  name: string;
  shape: EnemyShape;
  element: ElementId;
  tier: EnemyTier;
  behavior: EnemyBehavior;
  color: string;
  accent: string;
  glow: string;
  maxHp: number;
  damage: number;
  defense: number;
  /** Seconds between attacks before stage scaling. */
  attackCooldown: number;
  /** Movement speed in logical pixels per second; defaults from tier when omitted. */
  speed?: number;
  /** Distance at which the enemy stops to attack; defaults from behaviour when omitted. */
  attackRange?: number;
  /** Telegraph length in seconds. */
  windup: number;
  radius: number;
  height: number;
  projectileSpeed: number;
  patterns: BossPattern[];
  lore?: string;
}

export type WorldId = 'blossom' | 'forest' | 'crystal' | 'ember' | 'celestial';

export type EncounterKind = 'group' | 'miniboss' | 'final' | 'event';

export interface EnemyGroup {
  id: string;
  count: number;
}

export interface EncounterDef {
  kind: EncounterKind;
  title: string;
  subtitle: string;
  groups: EnemyGroup[];
  hpScale: number;
  damageScale: number;
  /** Base Astral Coins granted on completion. */
  reward: number;
}

export interface WorldDef {
  id: WorldId;
  name: string;
  jp: string;
  subtitle: string;
  element: ElementId;
  accent: string;
  skyTop: string;
  skyBottom: string;
  ground: string;
  groundDark: string;
  /** Background motif handled by the renderer. */
  motif: 'meadow' | 'forest' | 'crystal' | 'ember' | 'celestial';
  minibossId: string;
  bossId: string;
  unlockCost: number;
  encounters: EncounterDef[];
}

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type UpgradeCategory = 'offense' | 'defense' | 'magic' | 'special';

export interface UpgradeDef {
  id: string;
  name: string;
  rarity: Rarity;
  category: UpgradeCategory;
  /** Only offered to this heroine when set. */
  heroine?: HeroineId;
  description: string;
  effects: Partial<RunMods>;
  /** Both prerequisites must be owned for an evolved skill to enter the pool. */
  requires?: [string, string];
  /** Marks this entry as an evolution result. */
  evolved?: boolean;
  maxStacks: number;
  /** Short display of the numeric effect. */
  effectLabel: string;
}

/** Persisted meta progression. */
export interface SaveData {
  version: number;
  coins: number;
  unlockedHeroines: HeroineId[];
  unlockedWorlds: WorldId[];
  permanent: Record<string, number>;
  achievements: string[];
  stats: {
    runs: number;
    victories: number;
    enemiesDefeated: number;
    bossesDefeated: number;
    bestEncounter: number;
  };
  settings: {
    muted: boolean;
    speed: 1 | 2;
  };
}
