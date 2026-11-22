import { sfx } from '../audio/sfx';
import { SimulationClock } from '../core/clock';
import { Rng } from '../core/rng';
import { getEnemyDef } from '../data/enemies';
import { STAGES, type StageDef } from '../data/stages';
import { ARENA_MAX_X, ARENA_WIDTH, CAMERA_LERP, GROUND_Y, VIEW_W } from './constants';
import { rollDamage, rollIncoming } from './combat';
import { Enemy } from './enemy';
import { updateEnemies } from './enemyAi';
import { Hero, clampX } from './hero';
import { updateHeroAi } from './heroAi';
import { StageRunner } from './stageRunner';
import type { HeroineDef } from './types';

export type RunStatus = 'idle' | 'combat' | 'victory' | 'defeat';

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  /** Attack multiplier for heroine projectiles. */
  power: number;
  /** Flat damage for enemy projectiles. */
  damage: number;
  from: 'hero' | 'enemy';
  color: string;
  kind: 'wave' | 'shard' | 'orb' | 'star';
  pierce: number;
  life: number;
  angle: number;
  hit: Set<string>;
}

/** A delayed area strike, telegraphed before it lands. */
export interface Impact {
  x: number;
  radius: number;
  delay: number;
  total: number;
  power: number;
  damage: number;
  from: 'hero' | 'enemy';
  color: string;
}

export type VisualEffect =
  | { kind: 'spark'; x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }
  | { kind: 'slash'; x: number; y: number; facing: 1 | -1; radius: number; life: number; max: number; color: string }
  | { kind: 'ring'; x: number; y: number; radius: number; life: number; max: number; color: string }
  | { kind: 'text'; x: number; y: number; vy: number; text: string; crit: boolean; life: number; max: number };

export interface BossHud {
  name: string;
  hpRatio: number;
  phase: number;
}

export interface HudSnapshot {
  heroineName: string;
  hp: number;
  maxHp: number;
  hpRatio: number;
  stageNumber: number;
  stageCount: number;
  stageName: string;
  progress: number;
  progressLabel: string;
  empowered: boolean;
  boss: BossHud | null;
}

export interface RunResults {
  victory: boolean;
  stagesCleared: number;
  enemiesDefeated: number;
  bossesDefeated: number;
  damageDealt: number;
  duration: number;
}

export interface RunStats {
  stagesCleared: number;
  enemiesDefeated: number;
  bossesDefeated: number;
  damageDealt: number;
}

/**
 * Owns the simulation. Every system advances from the delta produced by `SimulationClock`, so
 * pause and the 1x / 2x multiplier apply to movement, cooldowns, projectiles, damage-over-time and
 * stage timers uniformly.
 */
export class World {
  readonly clock = new SimulationClock();
  readonly rng = new Rng(0x5eed1a7e);
  hero: Hero;

  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  impacts: Impact[] = [];
  effects: VisualEffect[] = [];

  status: RunStatus = 'idle';
  stageIndex = 0;
  stageRunner: StageRunner | null = null;
  runStats: RunStats = { stagesCleared: 0, enemiesDefeated: 0, bossesDefeated: 0, damageDealt: 0 };

  cameraX = 0;
  shake = 0;
  /** Simulated seconds in the current run. */
  time = 0;

  onStageStart?: (stage: StageDef, index: number) => void;
  onStageCleared?: (stage: StageDef) => void;
  onBossSpawn?: (name: string) => void;
  onBossPhase?: (name: string) => void;
  onRunEnd?: (victory: boolean) => void;

  private enemySeq = 0;

  constructor(def: HeroineDef) {
    this.hero = new Hero(def, ARENA_WIDTH * 0.5);
    this.cameraX = clampCamera(this.hero.x);
  }

  get groundY(): number {
    return GROUND_Y;
  }

  get stageName(): string {
    return this.stageRunner?.stage.name ?? 'Blossom Meadow';
  }

  get hasBoss(): boolean {
    return this.enemies.some((enemy) => enemy.def.tier === 'boss' && enemy.alive);
  }

  startRun(def: HeroineDef): void {
    this.hero = new Hero(def, ARENA_WIDTH * 0.5);
    this.enemies = [];
    this.projectiles = [];
    this.impacts = [];
    this.effects = [];
    this.runStats = { stagesCleared: 0, enemiesDefeated: 0, bossesDefeated: 0, damageDealt: 0 };
    this.stageIndex = 0;
    this.time = 0;
    this.shake = 0;
    this.enemySeq = 0;
    this.status = 'combat';
    this.cameraX = clampCamera(this.hero.x);
    this.clock.reset();
    this.startStage(0);
  }

  update(realDelta: number): void {
    const delta = this.clock.advance(realDelta);
    if (delta > 0 && this.status === 'combat') {
      this.time += delta;
      this.step(delta);
    }
    this.updateCamera(realDelta);
  }

  private step(delta: number): void {
    this.hero.tickTimers(delta);
    updateHeroAi(this, delta);
    updateEnemies(this, delta);
    this.updateProjectiles(delta);
    this.updateImpacts(delta);
    this.reapEnemies();
    this.stageRunner?.update(delta);
    this.updateEffects(delta);
    if (!this.hero.alive && this.status === 'combat') this.endRun(false);
  }

  // ---------------------------------------------------------------- stage flow

  private startStage(index: number): void {
    this.stageIndex = index;
    this.stageRunner = new StageRunner(this, index);
    const stage = this.stageRunner.stage;
    this.onStageStart?.(stage, index);
  }

  notifyStageCleared(): void {
    const stage = this.stageRunner?.stage;
    if (stage) this.onStageCleared?.(stage);
    sfx.play('clear');
  }

  advanceStage(): void {
    if (this.status !== 'combat') return;
    this.runStats.stagesCleared += 1;
    if (this.stageIndex + 1 >= STAGES.length) {
      this.endRun(true);
      return;
    }
    // A no-upgrade Phase 1 run has no other sustain, so each sealed rift mends over half her health.
    this.hero.heal(this.hero.maxHp * 0.55);
    this.startStage(this.stageIndex + 1);
  }

  endRun(victory: boolean): void {
    if (this.status !== 'combat') return;
    this.status = victory ? 'victory' : 'defeat';
    this.clock.pause();
    this.onRunEnd?.(victory);
  }

  // ---------------------------------------------------------------- spawning

  spawnEnemy(defId: string, x: number, hpScale: number, damageScale: number): Enemy {
    const def = getEnemyDef(defId);
    this.enemySeq += 1;
    // Bosses carry their own tuned stats; stage scaling on top of them made the mini-boss and the
    // final boss mathematically unwinnable (observed: defeat at stage 5 with the golem at 30%).
    const scaledHp = def.tier === 'boss' ? 1 : hpScale;
    const scaledDamage = def.tier === 'boss' ? 1 : damageScale;
    const enemy = new Enemy(`${def.id}-${this.enemySeq}`, def, clampX(x), scaledHp, scaledDamage);
    this.enemies.push(enemy);
    if (def.tier === 'boss') this.onBossSpawn?.(def.name);
    return enemy;
  }

  spawnEnemyAtEdge(defId: string, hpScale: number, damageScale: number): Enemy {
    const side = this.rng.chance(0.5) ? 1 : -1;
    const distance = VIEW_W * 0.58 + this.rng.range(0, 120);
    let x = this.hero.x + side * distance;
    if (x > ARENA_MAX_X || x < 160) x = this.hero.x - side * distance;
    return this.spawnEnemy(defId, x, hpScale, damageScale);
  }

  summonAdds(origin: Enemy, count: number): void {
    const stage = this.stageRunner?.stage;
    const hpScale = (stage?.hpScale ?? 1) * 0.8;
    const damageScale = (stage?.damageScale ?? 1) * 0.8;
    const addIds = ['star-slime', 'shadow-bunny', 'forest-sprite'];
    for (let i = 0; i < count; i += 1) {
      const id = addIds[i % addIds.length]!;
      const offset = (i - (count - 1) / 2) * 110;
      const enemy = this.spawnEnemy(id, origin.x + offset, hpScale, damageScale);
      enemy.x += this.rng.range(-30, 30);
      this.addRing(enemy.x, GROUND_Y - 20, 60, origin.def.accent);
    }
  }

  announceBossPhase(enemy: Enemy): void {
    this.addRing(enemy.x, GROUND_Y - enemy.def.height * 0.4, enemy.def.height * 0.9, enemy.def.accent);
    this.addBurst(enemy.x, GROUND_Y - enemy.def.height * 0.5, enemy.def.accent, 30, 260);
    this.shakeCamera(10);
    this.onBossPhase?.(enemy.def.name);
  }

  private reapEnemies(): void {
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.enemies[i]!;
      if (enemy.alive) continue;
      this.enemies.splice(i, 1);
      this.stageRunner?.onEnemyDefeated();
      this.runStats.enemiesDefeated += 1;
      if (enemy.def.tier === 'boss') this.runStats.bossesDefeated += 1;
      this.addBurst(enemy.x, GROUND_Y - enemy.def.height * 0.45, enemy.def.accent, 14, 200);
      this.addRing(enemy.x, GROUND_Y - 26, enemy.def.radius * 2.4, enemy.def.accent);
      sfx.play('death');
    }
  }

  // ---------------------------------------------------------------- damage

  damageEnemy(enemy: Enemy, amount: number, crit: boolean): void {
    const applied = enemy.takeDamage(amount);
    if (applied <= 0) return;
    this.runStats.damageDealt += applied;
    this.addText(
      enemy.x + this.rng.range(-10, 10),
      GROUND_Y - enemy.def.height * 0.65,
      `${applied}`,
      crit,
    );
    this.addBurst(
      enemy.x,
      GROUND_Y - enemy.def.height * 0.55,
      crit ? '#ffe6a3' : enemy.def.accent,
      crit ? 12 : 6,
      crit ? 240 : 150,
    );
    sfx.play(crit ? 'crit' : 'hit');
    if (crit) this.shakeCamera(4);
  }

  damageHero(rawDamage: number): void {
    const amount = rollIncoming(rawDamage, this.hero.stats.defense);
    const taken = this.hero.takeDamage(amount);
    if (taken <= 0) return;
    this.addText(this.hero.x, GROUND_Y - 210, `-${taken}`, false);
    this.shakeCamera(3);
    sfx.play('hurt');
  }

  /** Mend the heroine and show it, used when a wave is cleared. */
  healHero(amount: number): void {
    const healed = this.hero.heal(amount);
    if (healed <= 0) return;
    this.addText(this.hero.x, GROUND_Y - 232, `+${Math.round(healed)}`, false);
    this.addRing(this.hero.x, GROUND_Y - 60, 110, '#9ff0c8');
    sfx.play('heal');
  }

  /** Damage every enemy in front of the heroine. Returns the number of enemies hit. */
  hitEnemiesInFront(range: number, power: number, strikes = 1): number {
    const hero = this.hero;
    const stats = hero.stats;
    let hits = 0;
    for (const enemy of [...this.enemies]) {
      const dx = enemy.x - hero.x;
      if (Math.sign(dx) !== hero.facing && Math.abs(dx) > 18) continue;
      if (Math.abs(dx) > range + enemy.radius) continue;
      const result = rollDamage(stats.attack, power, stats, enemy.def.defense, this.rng);
      this.damageEnemy(enemy, result.amount, result.crit);
      hits += 1;
    }
    for (let i = 0; i < strikes; i += 1) {
      this.addSlash(hero.x + hero.facing * range * 0.45, GROUND_Y - 96, hero.facing, range * 0.7, hero.def.palette.accent);
    }
    return hits;
  }

  /** Damage every enemy within a radius regardless of facing. */
  hitEnemiesAround(radius: number, power: number): number {
    const hero = this.hero;
    const stats = hero.stats;
    let hits = 0;
    for (const enemy of [...this.enemies]) {
      if (Math.abs(enemy.x - hero.x) > radius + enemy.radius) continue;
      const result = rollDamage(stats.attack, power, stats, enemy.def.defense, this.rng);
      this.damageEnemy(enemy, result.amount, result.crit);
      hits += 1;
    }
    return hits;
  }

  nearestEnemies(count: number, range: number): Enemy[] {
    return [...this.enemies]
      .filter((enemy) => enemy.alive && Math.abs(enemy.x - this.hero.x) <= range)
      .sort((a, b) => Math.abs(a.x - this.hero.x) - Math.abs(b.x - this.hero.x))
      .slice(0, count);
  }

  // ---------------------------------------------------------------- projectiles

  spawnProjectile(projectile: Omit<Projectile, 'life' | 'hit'> & { life?: number }): void {
    this.projectiles.push({
      ...projectile,
      life: projectile.life ?? 2.2,
      hit: new Set<string>(),
    });
  }

  private updateProjectiles(delta: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = this.projectiles[i]!;
      projectile.x += projectile.vx * delta;
      projectile.y += projectile.vy * delta;
      projectile.life -= delta;

      let dead = projectile.life <= 0 || projectile.x < -80 || projectile.x > ARENA_WIDTH + 80;

      if (!dead && projectile.from === 'hero') {
        for (const enemy of [...this.enemies]) {
          if (projectile.hit.has(enemy.id)) continue;
          if (Math.abs(projectile.x - enemy.x) > projectile.radius + enemy.radius) continue;
          const stats = this.hero.stats;
          const result = rollDamage(stats.attack, projectile.power, stats, enemy.def.defense, this.rng);
          this.damageEnemy(enemy, result.amount, result.crit);
          projectile.hit.add(enemy.id);
          projectile.pierce -= 1;
          if (projectile.pierce < 0) {
            dead = true;
            break;
          }
        }
      } else if (!dead && projectile.from === 'enemy') {
        if (Math.abs(projectile.x - this.hero.x) < projectile.radius + 42) {
          this.damageHero(projectile.damage);
          this.addRing(projectile.x, GROUND_Y - 100, 44, projectile.color);
          dead = true;
        }
      }

      if (dead) this.projectiles.splice(i, 1);
    }
  }

  // ---------------------------------------------------------------- impacts

  addImpact(impact: Impact): void {
    this.impacts.push(impact);
    this.effects.push({
      kind: 'ring',
      x: impact.x,
      y: GROUND_Y - 6,
      radius: impact.radius,
      life: impact.delay,
      max: impact.delay,
      color: impact.color,
    });
  }

  private updateImpacts(delta: number): void {
    for (let i = this.impacts.length - 1; i >= 0; i -= 1) {
      const impact = this.impacts[i]!;
      impact.delay -= delta;
      if (impact.delay > 0) continue;
      this.impacts.splice(i, 1);
      if (impact.from === 'hero') {
        for (const enemy of [...this.enemies]) {
          if (Math.abs(enemy.x - impact.x) > impact.radius + enemy.radius) continue;
          const stats = this.hero.stats;
          const result = rollDamage(stats.attack, impact.power, stats, enemy.def.defense, this.rng);
          this.damageEnemy(enemy, result.amount, result.crit);
        }
        this.addBurst(impact.x, GROUND_Y - 60, impact.color, 18, 220);
      } else if (Math.abs(this.hero.x - impact.x) <= impact.radius + 30) {
        this.damageHero(impact.damage);
      }
      this.addRing(impact.x, GROUND_Y - 20, impact.radius * 1.1, impact.color);
      this.shakeCamera(4);
    }
  }

  // ---------------------------------------------------------------- visuals

  addSlash(x: number, y: number, facing: 1 | -1, radius: number, color: string): void {
    this.effects.push({ kind: 'slash', x, y, facing, radius, life: 0.24, max: 0.24, color });
  }

  addRing(x: number, y: number, radius: number, color: string): void {
    this.effects.push({ kind: 'ring', x, y, radius, life: 0.45, max: 0.45, color });
  }

  addBurst(x: number, y: number, color: string, count: number, speed: number): void {
    for (let i = 0; i < count; i += 1) {
      const angle = this.rng.range(0, Math.PI * 2);
      const power = speed * this.rng.range(0.35, 1);
      this.effects.push({
        kind: 'spark',
        x,
        y,
        vx: Math.cos(angle) * power,
        vy: Math.sin(angle) * power - 40,
        life: this.rng.range(0.24, 0.6),
        max: 0.6,
        color,
        size: this.rng.range(1.8, 4.2),
      });
    }
  }

  addText(x: number, y: number, text: string, crit: boolean): void {
    this.effects.push({
      kind: 'text',
      x,
      y,
      vy: -46,
      text,
      crit,
      life: crit ? 1 : 0.8,
      max: crit ? 1 : 0.8,
    });
  }

  shakeCamera(amount: number): void {
    this.shake = Math.min(14, this.shake + amount);
  }

  private updateEffects(delta: number): void {
    for (let i = this.effects.length - 1; i >= 0; i -= 1) {
      const effect = this.effects[i]!;
      effect.life -= delta;
      if (effect.kind === 'spark') {
        effect.x += effect.vx * delta;
        effect.y += effect.vy * delta;
        effect.vy += 320 * delta;
      } else if (effect.kind === 'text') {
        effect.y += effect.vy * delta;
        effect.vy *= 0.94;
      }
      if (effect.life <= 0) this.effects.splice(i, 1);
    }
  }

  // ---------------------------------------------------------------- camera + hud

  private updateCamera(realDelta: number): void {
    if (!this.hero) return;
    const target = clampCamera(this.hero.x);
    const t = Math.min(1, CAMERA_LERP * realDelta);
    this.cameraX += (target - this.cameraX) * t;
    this.shake = Math.max(0, this.shake - realDelta * 12);
  }

  getHud(): HudSnapshot {
    const runner = this.stageRunner;
    const boss = this.enemies.find((enemy) => enemy.def.tier === 'boss' && enemy.alive);
    return {
      heroineName: this.hero.def.name,
      hp: Math.ceil(this.hero.hp),
      maxHp: this.hero.maxHp,
      hpRatio: this.hero.hpRatio,
      stageNumber: this.stageIndex + 1,
      stageCount: STAGES.length,
      stageName: this.stageName,
      progress: runner?.progress ?? 0,
      progressLabel: runner?.progressLabel ?? 'Awaiting the rift',
      empowered: this.hero.empowered,
      boss: boss
        ? { name: boss.def.name, hpRatio: boss.hpRatio, phase: boss.phase }
        : null,
    };
  }

  getResults(victory: boolean): RunResults {
    return {
      victory,
      stagesCleared: this.runStats.stagesCleared,
      enemiesDefeated: this.runStats.enemiesDefeated,
      bossesDefeated: this.runStats.bossesDefeated,
      damageDealt: this.runStats.damageDealt,
      duration: this.time,
    };
  }
}

function clampCamera(x: number): number {
  return Math.max(0, Math.min(ARENA_WIDTH - VIEW_W, x - VIEW_W * 0.5));
}
