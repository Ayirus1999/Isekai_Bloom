import type { EnemyDef } from './types';

export type EnemyState = 'approach' | 'attack' | 'telegraph' | 'charge' | 'dead';

/** A single enemy in the arena. Behaviour lives in `enemyAi`; this class holds state. */
export class Enemy {
  readonly def: EnemyDef;
  readonly maxHp: number;
  readonly damage: number;

  x: number;
  hp: number;
  facing: 1 | -1 = -1;
  state: EnemyState = 'approach';

  cooldown = 0;
  hitFlash = 0;
  attackAnim = 0;
  attackFlash = 0;
  frozen = 0;
  slow = 0;

  /** Boss mechanics. */
  phase = 1;
  shield = 0;
  summonTimer = 7;
  volleyTimer = 5;
  chargeTimer = 10;
  chargeTime = 0;
  chargeHit = false;
  chargeTelegraph = 0;

  constructor(
    readonly id: string,
    def: EnemyDef,
    x: number,
    hpScale: number,
    damageScale: number,
  ) {
    this.def = def;
    this.maxHp = Math.round(def.maxHp * hpScale);
    this.hp = this.maxHp;
    this.damage = def.damage * damageScale;
    this.x = x;
  }

  get alive(): boolean {
    return this.hp > 0;
  }

  get hpRatio(): number {
    return Math.max(0, Math.min(1, this.hp / this.maxHp));
  }

  get radius(): number {
    return this.def.radius;
  }

  /** Returns damage actually applied, after any boss shield. */
  takeDamage(amount: number): number {
    if (!this.alive) return 0;
    const applied = Math.max(1, Math.round(amount * (this.shield > 0 ? 0.35 : 1)));
    this.hp = Math.max(0, this.hp - applied);
    this.hitFlash = 0.18;
    if (this.hp === 0) this.state = 'dead';
    return applied;
  }

  tick(delta: number): void {
    this.cooldown = Math.max(0, this.cooldown - delta);
    this.hitFlash = Math.max(0, this.hitFlash - delta);
    this.attackAnim = Math.max(0, this.attackAnim - delta * 3);
    this.attackFlash = Math.max(0, this.attackFlash - delta);
    this.frozen = Math.max(0, this.frozen - delta);
    this.slow = Math.max(0, this.slow - delta);
    this.shield = Math.max(0, this.shield - delta);
  }

  get moveSpeed(): number {
    const slowFactor = this.slow > 0 ? 0.55 : 1;
    return this.def.speed * (this.phase === 2 ? 1.25 : 1) * slowFactor;
  }
}
