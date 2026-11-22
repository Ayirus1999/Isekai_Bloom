import { buildClipSet, Animator, type ClipEvent, type Pose } from './anim';
import { GROUND_Y, HERO_X, VIEW_W } from './constants';
import { EMPTY_MODS, type AbilityDef, type HeroPhase, type HeroineDef, type RunMods, type Stats } from './types';

/** Permanent, save-scoped bonuses folded into every run. */
export interface PermanentBonus {
  maxHpPct: number;
  attackPct: number;
  attackSpeedPct: number;
  critChance: number;
  coinPct: number;
}

export const NO_BONUS: PermanentBonus = {
  maxHpPct: 0,
  attackPct: 0,
  attackSpeedPct: 0,
  critChance: 0,
  coinPct: 0,
};

export interface HeroAction {
  kind: 'basic' | 'ability';
  abilityIndex?: number;
  ability?: AbilityDef;
  targetId: string | null;
  clipId: string;
  hits: number;
  power: number;
}

/**
 * A Blossom Guardian at her fixed battle anchor.
 *
 * She never chases enemies: the layout stays heroine-left / enemies-right and her attack
 * animations lunge forward visually only. Combat is resolved from the animation clip's event
 * timeline, so a hit lands exactly on its impact frame at both 1x and 2x.
 */
export class Hero {
  readonly def: HeroineDef;
  readonly x = HERO_X;
  readonly groundY = GROUND_Y;
  readonly animator: Animator;
  readonly permanent: PermanentBonus;

  mods: RunMods;
  hp: number;
  facing: 1 | -1 = 1;
  phase: HeroPhase = 'idle';
  pose: Pose;

  shield = 0;
  invulnerable = 0;
  buffTime = 0;
  buffAttack = 0;
  buffSpeed = 0;

  attackCooldown = 0;
  readonly abilityCooldowns: Record<string, number> = {};

  /** The action whose events are still being resolved from the current clip. */
  action: HeroAction | null = null;
  ultimateLock = false;
  private hurtLock = 0;
  private combo = 0;
  private clipDone = false;

  targetId: string | null = null;
  targetLock = 0;
  hurtFlash = 0;

  constructor(def: HeroineDef, mods: RunMods = EMPTY_MODS, permanent: PermanentBonus = NO_BONUS) {
    this.def = def;
    this.mods = mods;
    this.permanent = permanent;
    this.animator = new Animator(buildClipSet(def));
    this.hp = this.maxHp;
    for (const ability of def.abilities) this.abilityCooldowns[ability.id] = 0;
    this.pose = this.animator.update(0).pose;
  }

  // ------------------------------------------------------------------ stats

  get maxHp(): number {
    return Math.round(this.def.stats.maxHp * (1 + this.mods.maxHpPct + this.permanent.maxHpPct));
  }

  get hpRatio(): number {
    return Math.max(0, Math.min(1, this.hp / Math.max(1, this.maxHp)));
  }

  get alive(): boolean {
    return this.hp > 0;
  }

  get empowered(): boolean {
    return this.buffTime > 0;
  }

  get stats(): Stats {
    const base = this.def.stats;
    return {
      ...base,
      attack: base.attack * (1 + this.mods.attackPct + this.permanent.attackPct + this.buffAttack),
      attackSpeed: base.attackSpeed * (1 + this.mods.attackSpeedPct + this.permanent.attackSpeedPct + this.buffSpeed),
      critChance: Math.min(1, base.critChance + this.mods.critChance + this.permanent.critChance),
      critDamage: base.critDamage + this.mods.critDamage,
      defense: base.defense + this.mods.defense,
    };
  }

  /** Keep the current health inside a newly raised or lowered maximum. */
  syncMaxHp(): void {
    this.hp = Math.max(1, Math.min(this.maxHp, this.hp));
  }

  faceToward(x: number): void {
    if (Math.abs(x - this.x) < 0.5) return;
    this.facing = x > this.x ? 1 : -1;
  }

  // ------------------------------------------------------------------ state

  get canAct(): boolean {
    return this.alive && this.action === null && this.hurtLock <= 0 && this.phase !== 'defeated';
  }

  startBasic(clipId: string, power: number, hits: number, targetId: string): void {
    this.combo += 1;
    this.action = { kind: 'basic', clipId, targetId, hits, power };
    this.phase = 'attacking';
    this.animator.play(clipId, true);
    this.clipDone = false;
  }

  startAbility(index: number, ability: AbilityDef, targetId: string): void {
    this.action = {
      kind: 'ability',
      abilityIndex: index,
      ability,
      clipId: `cast${index}`,
      targetId,
      hits: 1,
      power: ability.power,
    };
    this.phase = ability.ultimate ? 'ultimate' : 'casting';
    this.ultimateLock = Boolean(ability.ultimate);
    this.animator.play(`cast${index}`, true);
    this.clipDone = false;
  }

  nextAttackClip(): string {
    const variant = this.combo % 3;
    return variant === 0 ? 'attack' : `attack${variant + 1}`;
  }

  /** Advance the hero's clip. Returns events that must be resolved this step. */
  advanceAnimation(dt: number): { events: ClipEvent[]; finished: boolean } {
    const frame = this.animator.update(dt);
    this.pose = frame.pose;
    this.clipDone = frame.finished;
    return { events: frame.events, finished: frame.finished };
  }

  /** Called when a non-looping clip reaches its final frame. */
  onClipFinished(): void {
    if (!this.clipDone) return;
    if (this.phase === 'victory' || this.phase === 'defeated') return;
    this.action = null;
    this.ultimateLock = false;
    this.phase = this.alive ? 'idle' : 'defeated';
    this.animator.play('idle');
  }

  playVictory(): void {
    this.action = null;
    this.phase = 'victory';
    this.animator.play('victory', true);
  }

  playDefeat(): void {
    this.action = null;
    this.phase = 'defeated';
    this.animator.play('defeat', true);
  }

  playHeal(): void {
    if (!this.alive || this.ultimateLock) return;
    this.animator.play('heal', true);
  }

  /**
   * Damage reaction. A committed attack or cast keeps its timing (otherwise boss pressure would
   * cancel almost every swing and silently delete the heroine's damage); she flinches whenever
   * she is between actions. Ultimates are never interrupted.
   */
  playHurt(): boolean {
    if (!this.alive || this.ultimateLock) return false;
    if (this.action) return false;
    this.hurtLock = 0.18;
    this.phase = 'hurt';
    this.animator.play('hurt', true);
    return true;
  }

  // ------------------------------------------------------------------ combat math

  /** Returns total damage taken (shield absorption included). */
  takeDamage(amount: number): number {
    if (!this.alive || this.invulnerable > 0) return 0;
    let incoming = Math.max(1, Math.round(amount));
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, incoming);
      this.shield -= absorbed;
      incoming -= absorbed;
    }
    const taken = Math.max(0, incoming);
    if (taken > 0) {
      this.hp = Math.max(0, this.hp - taken);
      this.hurtFlash = 0.24;
    }
    if (this.hp === 0) this.phase = 'defeated';
    return taken;
  }

  heal(amount: number): number {
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + Math.max(0, amount));
    return this.hp - before;
  }

  addShield(amount: number, duration = 4): void {
    this.shield = Math.min(this.maxHp * 0.6, this.shield + Math.max(0, amount));
    this.invulnerable = Math.max(this.invulnerable, duration * 0.35);
  }

  applyBuff(attackBonus: number, speedBonus: number, duration: number): void {
    this.buffAttack = Math.max(this.buffAttack, attackBonus);
    this.buffSpeed = Math.max(this.buffSpeed, speedBonus);
    this.buffTime = Math.max(this.buffTime, duration);
  }

  tickTimers(dt: number): void {
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    for (const id of Object.keys(this.abilityCooldowns)) {
      this.abilityCooldowns[id] = Math.max(0, (this.abilityCooldowns[id] ?? 0) - dt);
    }
    this.buffTime = Math.max(0, this.buffTime - dt);
    if (this.buffTime === 0) {
      this.buffAttack = 0;
      this.buffSpeed = 0;
    }
    this.hurtLock = Math.max(0, this.hurtLock - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.targetLock = Math.max(0, this.targetLock - dt);
    if (this.shield > 0 && this.invulnerable <= 0) this.shield = Math.max(0, this.shield - dt * 6);
  }
}

export function clampX(x: number): number {
  return Math.max(80, Math.min(VIEW_W - 80, x));
}
