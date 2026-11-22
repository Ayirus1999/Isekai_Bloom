/** Shared shapes for the simulation. Data modules and systems both depend on these types. */

export type ElementId = 'light' | 'fire' | 'moon' | 'nature' | 'shadow' | 'ice';

export interface Stats {
  maxHp: number;
  attack: number;
  /** Basic attacks per second. */
  attackSpeed: number;
  /** 0..1 chance for a critical hit. */
  critChance: number;
  /** Damage multiplier on a critical hit. */
  critDamage: number;
  /** Ground movement speed in pixels per simulated second. */
  moveSpeed: number;
  /** Basic-attack reach in pixels. */
  range: number;
  defense: number;
}

/** Combat state of a heroine. Mirrors the state machine documented in the design doc. */
export type HeroPhase =
  | 'idle'
  | 'searching'
  | 'moving'
  | 'attacking'
  | 'casting'
  | 'repositioning'
  | 'defeated'
  | 'victory';

export type AbilityKind = 'meleeArc' | 'wave' | 'rain' | 'dash' | 'buff' | 'projectile' | 'aoe';

/** How an ability decides it is worth using. */
export type AbilityTrigger =
  | 'inRange'
  | 'crowd'
  | 'bossOrHurt'
  | 'hurtAndClose'
  | 'always';

export interface AbilitySpec {
  id: string;
  name: string;
  kind: AbilityKind;
  /** Cooldown in simulated seconds. */
  cooldown: number;
  /** Damage multiplier applied to the heroine's attack stat. */
  power: number;
  /** Reach in pixels, for abilities that travel or strike forward. */
  range: number;
  /** Radius in pixels, for arcs, explosions and auras. */
  radius: number;
  /** Projectile or hit count where relevant. */
  count: number;
  /** Buff duration in simulated seconds. */
  duration: number;
  trigger: AbilityTrigger;
  /** Minimum live enemies for `crowd` abilities. */
  minEnemies: number;
  /** Health fraction (0..1) below which defensive abilities may fire. */
  hpBelow: number;
  description: string;
}

export interface BasicAttackSpec {
  name: string;
  kind: 'melee' | 'projectile';
  power: number;
  range: number;
  projectileSpeed: number;
}

export interface HeroinePalette {
  hair: string;
  hairShade: string;
  outfit: string;
  outfitShade: string;
  accent: string;
  glow: string;
}

export interface HeroineDef {
  id: string;
  name: string;
  title: string;
  /** Japanese rendering of the title, shown as flavour in the roster. */
  jp: string;
  age: number;
  element: ElementId;
  elementName: string;
  role: string;
  weapon: string;
  personality: string;
  lore: string;
  stats: Stats;
  basic: BasicAttackSpec;
  abilities: AbilitySpec[];
  palette: HeroinePalette;
  portrait: string;
  /** Chroma-keyed at load time; empty while the heroine is still locked. */
  sprite: string;
  locked: boolean;
  unlockHint: string;
}

export type EnemyShape =
  | 'slime'
  | 'sprite'
  | 'bunny'
  | 'mushroom'
  | 'beetle'
  | 'flame'
  | 'knight'
  | 'golem'
  | 'wolf'
  | 'treant'
  | 'guardian'
  | 'queen';

export type EnemyTier = 'normal' | 'elite' | 'boss';

export type EnemyBehavior = 'chaser' | 'ranged' | 'boss';

/** Data definition for one enemy archetype. Stats are per-unit before stage scaling. */
export interface EnemyDef {
  id: string;
  name: string;
  shape: EnemyShape;
  element: ElementId;
  color: string;
  accent: string;
  maxHp: number;
  /** Ground speed in pixels per simulated second. */
  speed: number;
  damage: number;
  /** Distance at which the enemy stops and attacks. */
  attackRange: number;
  /** Seconds between attacks. */
  attackCooldown: number;
  /** Body half-width used for hit detection. */
  radius: number;
  /** Drawn height in pixels. */
  height: number;
  behavior: EnemyBehavior;
  projectileSpeed: number;
  tier: EnemyTier;
  defense: number;
}
