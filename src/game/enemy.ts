import type { BossPattern, EnemyDef } from './types';

export type EnemyState = 'idle' | 'approach' | 'telegraph' | 'strike' | 'recover' | 'dead';

/**
 * One independent enemy instance. Every normal enemy in a group owns its own health, timers and
 * animation state; bosses are always spawned alone.
 */
export class Enemy {
  readonly def: EnemyDef;
  readonly maxHp: number;
  readonly damage: number;
  readonly standOff: number;

  hp: number;
  x: number;
  facing: 1 | -1 = -1;
  state: EnemyState = 'approach';

  cooldown = 0;
  telegraph = 0;
  hitFlash = 0;
  attackAnim = 0;
  attackFlash = 0;
  deathTimer = 0;
  frozen = 0;
  slow = 0;

  /** Boss mechanics. */
  phase = 1;
  shield = 0;
  patternIndex = 0;
  pattern: BossPattern | null = null;
  patternTimer: number;

  constructor(
    readonly id: string,
    def: EnemyDef,
    x: number,
    hpScale: number,
    damageScale: number,
    standOff = 0,
  ) {
    this.def = def;
    this.maxHp = Math.round(def.maxHp * hpScale);
    this.hp = this.maxHp;
    this.damage = def.damage * damageScale;
    this.x = x;
    this.standOff = standOff;
    this.patternTimer = 1.6;
  }

  get alive(): boolean {
    return this.hp > 0;
  }

  get hpRatio(): number {
    return Math.max(0, Math.min(1, this.hp / Math.max(1, this.maxHp)));
  }

  get radius(): number {
    return this.def.radius;
  }

  get isBoss(): boolean {
    return this.def.tier === 'boss';
  }

  get speed(): number {
    if (this.def.speed !== undefined) return this.def.speed;
    if (this.def.tier === 'boss') return 26;
    if (this.def.tier === 'elite') return 46;
    return this.def.behavior === 'ranged' ? 38 : 64;
  }

  get attackRange(): number {
    if (this.def.attackRange !== undefined) return this.def.attackRange;
    if (this.def.tier === 'boss') return 340;
    if (this.def.behavior === 'ranged') return 430;
    return 74;
  }

  get moveSpeed(): number {
    const slowFactor = this.slow > 0 ? 0.55 : 1;
    return this.speed * (this.phase === 2 ? 1.25 : 1) * slowFactor;
  }

  /** Returns damage actually applied. */
  takeDamage(amount: number): number {
    if (!this.alive) return 0;
    const applied = Math.max(1, Math.round(amount * (this.shield > 0 ? 0.4 : 1)));
    this.hp = Math.max(0, this.hp - applied);
    this.hitFlash = 0.18;
    if (this.hp === 0) {
      this.state = 'dead';
      this.deathTimer = 0.55;
    }
    return applied;
  }

  heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  tick(delta: number): void {
    this.cooldown = Math.max(0, this.cooldown - delta);
    this.hitFlash = Math.max(0, this.hitFlash - delta);
    this.attackAnim = Math.max(0, this.attackAnim - delta * 2.6);
    this.attackFlash = Math.max(0, this.attackFlash - delta);
    this.frozen = Math.max(0, this.frozen - delta);
    this.slow = Math.max(0, this.slow - delta);
    this.shield = Math.max(0, this.shield - delta);
    if (!this.alive) this.deathTimer = Math.max(0, this.deathTimer - delta);
  }
}
