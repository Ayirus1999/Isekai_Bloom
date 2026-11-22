import { ARENA_MAX_X, ARENA_MIN_X } from './constants';
import type { HeroPhase, HeroineDef, Stats } from './types';

/**
 * A Blossom Guardian in the world: position, health, cooldowns and the animation/timing state the
 * AI and renderer both read. Behaviour lives in the AI modules; this class owns state only.
 */
export class Hero {
  readonly def: HeroineDef;

  x: number;
  hp: number;
  facing: 1 | -1 = 1;
  phase: HeroPhase = 'idle';

  /** Seconds until the next basic attack is allowed. */
  attackCooldown = 0;
  /** Remaining cooldown per ability id. */
  readonly abilityCooldowns: Record<string, number> = {};

  /** Empower buff (Celestial Awakening and friends). */
  buffTime = 0;
  buffAttack = 0;
  buffSpeed = 0;

  /** Cosmetic + gameplay timers. */
  attackAnim = 0;
  hurtFlash = 0;
  invulnerable = 0;
  walkPhase = 0;
  moving = false;

  /** Current target, kept across frames so target selection can avoid oscillation. */
  targetId: string | null = null;
  targetLock = 0;

  constructor(def: HeroineDef, x: number) {
    this.def = def;
    this.x = x;
    this.hp = def.stats.maxHp;
    for (const ability of def.abilities) this.abilityCooldowns[ability.id] = 0;
  }

  get maxHp(): number {
    return this.def.stats.maxHp;
  }

  get hpRatio(): number {
    return Math.max(0, Math.min(1, this.hp / this.maxHp));
  }

  get alive(): boolean {
    return this.hp > 0;
  }

  /** Base stats with active buffs folded in. */
  get stats(): Stats {
    const base = this.def.stats;
    if (this.buffTime <= 0) return base;
    return {
      ...base,
      attack: base.attack * (1 + this.buffAttack),
      attackSpeed: base.attackSpeed * (1 + this.buffSpeed),
    };
  }

  get empowered(): boolean {
    return this.buffTime > 0;
  }

  applyBuff(attackBonus: number, speedBonus: number, duration: number): void {
    this.buffAttack = attackBonus;
    this.buffSpeed = speedBonus;
    this.buffTime = Math.max(this.buffTime, duration);
  }

  /** Returns the damage actually taken (0 while invulnerable). */
  takeDamage(amount: number): number {
    if (this.invulnerable > 0 || !this.alive) return 0;
    const taken = Math.max(1, Math.round(amount));
    this.hp = Math.max(0, this.hp - taken);
    this.hurtFlash = 0.22;
    if (this.hp === 0) this.phase = 'defeated';
    return taken;
  }

  heal(amount: number): number {
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    return this.hp - before;
  }

  /** Advance timers that are not gameplay-decision related. */
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
    this.attackAnim = Math.max(0, this.attackAnim - dt * 3.4);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.targetLock = Math.max(0, this.targetLock - dt);
  }

  /** Walk toward a world x, respecting arena bounds. Returns true when still moving. */
  moveToward(targetX: number, dt: number): boolean {
    const speed = this.stats.moveSpeed;
    const dx = targetX - this.x;
    const step = speed * dt;
    if (Math.abs(dx) <= step) {
      this.x = clampX(targetX);
      this.moving = false;
      return false;
    }
    this.facing = dx > 0 ? 1 : -1;
    this.x = clampX(this.x + Math.sign(dx) * step);
    this.walkPhase += dt * 11;
    this.moving = true;
    return true;
  }

  faceToward(x: number): void {
    if (Math.abs(x - this.x) < 0.5) return;
    this.facing = x > this.x ? 1 : -1;
  }
}

export function clampX(x: number): number {
  return Math.max(ARENA_MIN_X, Math.min(ARENA_MAX_X, x));
}
