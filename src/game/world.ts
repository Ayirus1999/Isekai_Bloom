import { sfx } from '../audio/sfx';
import { SimulationClock } from '../core/clock';
import { Rng } from '../core/rng';
import { getEnemyDef } from '../data/enemies';
import { BOSS_X, ENCOUNTER_CLEAR_DELAY, ENEMY_LANE_MAX, ENEMY_LANE_MIN, GROUND_Y, VICTORY_HOLD, VIEW_W } from './constants';
import { rollDamage, rollIncoming } from './combat';
import { Enemy } from './enemy';
import { updateEnemies } from './enemyAi';
import { Hero, type PermanentBonus } from './hero';
import { resolveHeroEvent } from './heroActions';
import { updateHeroAi } from './heroAi';
import { applyUpgrade } from './upgrades';
import {
  EMPTY_MODS,
  type EncounterDef,
  type HeroineDef,
  type RunMods,
  type UpgradeDef,
  type WorldDef,
} from './types';

export type RunStatus = 'idle' | 'combat' | 'clearing' | 'reward' | 'victory' | 'defeat';

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  power: number;
  damage: number;
  from: 'hero' | 'enemy';
  color: string;
  kind: 'wave' | 'shard' | 'orb' | 'star';
  pierce: number;
  life: number;
  angle: number;
  hit: Set<string>;
}

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
  tier: 'boss';
}

export interface HudSnapshot {
  heroineName: string;
  hp: number;
  maxHp: number;
  hpRatio: number;
  shield: number;
  encounterNumber: number;
  encounterCount: number;
  encounterTitle: string;
  encounterKind: EncounterDef['kind'] | 'none';
  progress: number;
  progressLabel: string;
  coins: number;
  upgrades: string[];
  boss: BossHud | null;
  empowered: boolean;
}

export interface RunResults {
  victory: boolean;
  encountersCleared: number;
  enemiesDefeated: number;
  bossesDefeated: number;
  damageDealt: number;
  damageTaken: number;
  duration: number;
  coins: number;
  upgrades: string[];
  heroine: string;
  world: string;
}

export interface RunStats {
  encountersCleared: number;
  enemiesDefeated: number;
  bossesDefeated: number;
  damageDealt: number;
  damageTaken: number;
  coins: number;
  bestEncounter: number;
  upgrades: string[];
}

/**
 * Owns one adventure: the encounter sequence, combatants, projectiles, effects and the simulation
 * clock. Group encounters may hold many independent enemies; mini-boss and final encounters are
 * hard-enforced to a single entity.
 */
export class World {
  readonly clock = new SimulationClock();
  readonly rng = new Rng(0x5eed1a7e);

  hero!: Hero;
  worldDef!: WorldDef;
  encounters: EncounterDef[] = [];
  encounterIndex = 0;
  encounter: EncounterDef | null = null;

  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  impacts: Impact[] = [];
  effects: VisualEffect[] = [];

  status: RunStatus = 'idle';
  mods: RunMods = { ...EMPTY_MODS };
  owned: Record<string, number> = {};

  runStats: RunStats = this.emptyStats();
  time = 0;
  shake = 0;
  cinematic = 0;

  private enemySeq = 0;
  private clearTimer = 0;
  private endTimer = 0;
  private ended = false;
  private spawned = false;

  onEncounterStart?: (encounter: EncounterDef, index: number) => void;
  onBossSpawn?: (name: string) => void;
  onBossPhase?: (name: string) => void;
  onReward?: (encounter: EncounterDef, index: number) => void;
  onRunEnd?: (victory: boolean) => void;

  private emptyStats(): RunStats {
    return {
      encountersCleared: 0,
      enemiesDefeated: 0,
      bossesDefeated: 0,
      damageDealt: 0,
      damageTaken: 0,
      coins: 0,
      bestEncounter: 0,
      upgrades: [],
    };
  }

  // ------------------------------------------------------------------ run flow

  startRun(heroine: HeroineDef, worldDef: WorldDef, bonus: PermanentBonus, startIndex = 0): void {
    this.worldDef = worldDef;
    this.encounters = worldDef.encounters;
    this.mods = { ...EMPTY_MODS };
    this.mods.coinPct = bonus.coinPct;
    this.owned = {};
    this.hero = new Hero(heroine, this.mods, bonus);
    this.enemies = [];
    this.projectiles = [];
    this.impacts = [];
    this.effects = [];
    this.runStats = this.emptyStats();
    this.encounterIndex = 0;
    this.time = 0;
    this.shake = 0;
    this.cinematic = 0;
    this.enemySeq = 0;
    this.ended = false;
    this.clock.reset();
    this.beginEncounter(startIndex);
  }

  get groundY(): number {
    return GROUND_Y;
  }

  get hasBoss(): boolean {
    return this.enemies.some((enemy) => enemy.isBoss && enemy.alive);
  }

  get encounterCount(): number {
    return this.encounters.length;
  }

  private beginEncounter(index: number): void {
    if (index >= this.encounters.length) {
      this.endRun(true);
      return;
    }
    this.encounterIndex = index;
    this.encounter = this.encounters[index]!;
    this.runStats.bestEncounter = Math.max(this.runStats.bestEncounter, index + 1);
    this.enemies = [];
    this.projectiles = [];
    this.impacts = [];
    this.spawned = false;

    if (this.encounter.kind === 'event') {
      this.runStats.encountersCleared += 1;
      this.awardCoins(this.encounter.reward);
      this.status = 'reward';
      this.clock.pause();
      sfx.play('clear');
      this.onEncounterStart?.(this.encounter, index);
      this.onReward?.(this.encounter, index);
      return;
    }

    this.status = 'combat';
    this.spawnEncounter(this.encounter);
    this.onEncounterStart?.(this.encounter, index);
    sfx.play(this.encounter.kind === 'group' ? 'click' : 'boss');
  }

  private spawnEncounter(encounter: EncounterDef): void {
    const solo = encounter.kind === 'miniboss' || encounter.kind === 'final';
    const ids: string[] = [];
    for (const group of encounter.groups) {
      for (let i = 0; i < group.count; i += 1) ids.push(group.id);
    }
    if (ids.length === 0) return;

    // A boss encounter may only ever contain its single boss, whatever the data says.
    const roster = solo ? ids.slice(0, 1) : ids;

    roster.forEach((id, index) => {
      const def = getEnemyDef(id);
      let x: number;
      if (solo) {
        x = BOSS_X;
      } else {
        const t = roster.length <= 1 ? 0.5 : index / (roster.length - 1);
        x = ENEMY_LANE_MIN + t * (ENEMY_LANE_MAX - ENEMY_LANE_MIN);
        // Small deterministic stagger keeps the formation from looking like a row of clones.
        x += ((index % 3) - 1) * 26;
      }
      const standOff = solo ? 0 : (index % 3) * 44;
      this.spawnEnemy(id, x, encounter.hpScale, encounter.damageScale, standOff);
      if (solo) this.onBossSpawn?.(def.name);
    });
    this.spawned = true;
  }

  private awardCoins(base: number): void {
    const amount = Math.round(base * (1 + this.mods.coinPct));
    this.runStats.coins += amount;
  }

  /** Main calls this after the player picks a card. Applies the upgrade, then advances. */
  chooseUpgrade(def: UpgradeDef): void {
    if (this.status !== 'reward') return;
    const beforeMax = this.hero.maxHp;
    applyUpgrade(this.mods, def);
    this.hero.mods = this.mods;
    this.owned[def.id] = (this.owned[def.id] ?? 0) + 1;
    this.runStats.upgrades.push(def.name);
    const gained = this.hero.maxHp - beforeMax;
    if (gained > 0) this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + gained);
    this.hero.heal(this.hero.maxHp * 0.2);
    this.status = 'combat';
    this.beginEncounter(this.encounterIndex + 1);
  }

  // ------------------------------------------------------------------ simulation

  update(realDelta: number): void {
    const delta = this.clock.advance(realDelta);
    if (delta <= 0) return;
    this.time += delta;
    this.cinematic = Math.max(0, this.cinematic - delta);
    this.shake = Math.max(0, this.shake - delta * 14);

    if (this.status === 'combat') {
      this.step(delta);
      return;
    }

    if (this.status === 'clearing') {
      this.hero.tickTimers(delta);
      this.advanceHeroAnimation(delta);
      this.updateEffects(delta);
      this.clearTimer -= delta;
      if (this.clearTimer <= 0) this.finishEncounter();
      return;
    }

    if (this.status === 'victory' || this.status === 'defeat') {
      this.hero.tickTimers(delta);
      this.advanceHeroAnimation(delta);
      this.updateEffects(delta);
      this.endTimer -= delta;
      if (this.endTimer <= 0 && !this.ended) {
        this.ended = true;
        this.onRunEnd?.(this.status === 'victory');
      }
    }
  }

  private step(delta: number): void {
    this.hero.tickTimers(delta);
    if (this.mods.regenPerSec > 0 && this.hero.alive) {
      this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + this.mods.regenPerSec * delta);
    }

    this.advanceHeroAnimation(delta);
    updateHeroAi(this, delta);
    updateEnemies(this, delta);
    this.updateProjectiles(delta);
    this.updateImpacts(delta);
    this.updateEffects(delta);

    if (!this.hero.alive) {
      this.endRun(false);
      return;
    }

    if (this.status === 'combat' && this.spawned && !this.enemies.some((enemy) => enemy.alive)) {
      this.status = 'clearing';
      this.clearTimer = ENCOUNTER_CLEAR_DELAY;
      sfx.play('clear');
    }
  }

  /** Advance the heroine's clip and resolve every gameplay event it crossed. */
  private advanceHeroAnimation(delta: number): void {
    if (!this.hero) return;
    const { events, finished } = this.hero.advanceAnimation(delta);
    for (const event of events) resolveHeroEvent(this, event);
    if (finished) this.hero.onClipFinished();
  }

  private finishEncounter(): void {
    const encounter = this.encounter;
    if (!encounter) return;
    this.runStats.encountersCleared += 1;
    this.awardCoins(encounter.reward);

    if (encounter.kind === 'final' || this.encounterIndex >= this.encounters.length - 1) {
      this.endRun(true);
      return;
    }

    this.status = 'reward';
    this.clock.pause();
    this.onReward?.(encounter, this.encounterIndex);
  }

  endRun(victory: boolean): void {
    if (this.status === 'victory' || this.status === 'defeat') return;
    this.status = victory ? 'victory' : 'defeat';
    this.endTimer = VICTORY_HOLD;
    this.ended = false;
    this.clearTimer = 0;
    if (victory) {
      this.hero.playVictory();
      this.cinematic = 0.8;
      sfx.play('clear');
    } else {
      this.hero.playDefeat();
      sfx.play('death');
    }
  }

  // ------------------------------------------------------------------ spawning

  spawnEnemy(defId: string, x: number, hpScale: number, damageScale: number, standOff = 0): Enemy {
    const def = getEnemyDef(defId);
    this.enemySeq += 1;
    // Boss stats are tuned for a solo duel; encounter scaling on top made the rift guardians
    // mathematically unwinnable, so only normal formations scale.
    const hp = def.tier === 'boss' ? 0.42 : hpScale;
    const damage = def.tier === 'boss' ? 0.88 : damageScale;
    const enemy = new Enemy(`${def.id}-${this.enemySeq}`, def, x, hp, damage, standOff);
    this.enemies.push(enemy);
    return enemy;
  }

  summonAdds(): void {
    // Boss fights are solo by design: this intentionally does nothing.
  }

  announceBossPhase(enemy: Enemy): void {
    this.addRing(enemy.x, GROUND_Y - enemy.def.height * 0.4, enemy.def.height * 0.9, enemy.def.accent);
    this.addBurst(enemy.x, GROUND_Y - enemy.def.height * 0.5, enemy.def.accent, 30, 260);
    this.shakeCamera(10);
    this.onBossPhase?.(enemy.def.name);
  }

  // ------------------------------------------------------------------ damage

  /** Resolve one hit from the heroine. Centralised so upgrades apply to every source. */
  strike(enemy: Enemy, power: number, ability: boolean): void {
    if (!enemy.alive) return;
    const stats = this.hero.stats;
    const scaledPower = power * (ability ? 1 + this.mods.abilityPowerPct : 1);
    const result = rollDamage(stats.attack, scaledPower, stats, enemy.def.defense, this.rng);
    let amount = result.amount;
    if (enemy.isBoss) amount *= 1 + this.mods.bossDamagePct;
    if (enemy.def.tier === 'elite') amount *= 1 + this.mods.eliteDamagePct;
    if (enemy.hpRatio <= this.mods.executePct) amount *= 1.6;
    if (this.rng.chance(this.mods.extraStrikeChance)) amount *= 2;
    this.damageEnemy(enemy, amount, result.crit);
  }

  damageEnemy(enemy: Enemy, amount: number, crit: boolean): void {
    const applied = enemy.takeDamage(amount);
    if (applied <= 0) return;
    this.runStats.damageDealt += applied;
    this.addText(
      enemy.x + this.rng.range(-12, 12),
      GROUND_Y - enemy.def.height * 0.72,
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
    if (this.mods.lifestealPct > 0) this.hero.heal(applied * this.mods.lifestealPct);

    if (!enemy.alive) {
      this.runStats.enemiesDefeated += 1;
      if (enemy.isBoss) this.runStats.bossesDefeated += 1;
      if (this.mods.healOnKillPct > 0) this.hero.heal(this.hero.maxHp * this.mods.healOnKillPct);
      this.addBurst(enemy.x, GROUND_Y - enemy.def.height * 0.45, enemy.def.accent, 16, 220);
      this.addRing(enemy.x, GROUND_Y - 30, enemy.def.radius * 2.6, enemy.def.accent);
      sfx.play('death');
    }
  }

  damageHero(rawDamage: number): void {
    if (!this.hero.alive) return;
    const amount = rollIncoming(rawDamage, this.hero.stats.defense);
    const taken = this.hero.takeDamage(amount);
    if (taken <= 0 && this.hero.shield <= 0) return;
    // Barrier absorption is still damage the heroine had to survive, so report it too.
    this.runStats.damageTaken += amount;
    if (taken > 0) {
      this.addText(this.hero.x, GROUND_Y - 236, `-${taken}`, false);
      this.hero.playHurt();
    }
    this.shakeCamera(3);
    sfx.play('hurt');
    if (!this.hero.alive) this.endRun(false);
  }

  healHero(amount: number, show = true): void {
    const healed = this.hero.heal(amount);
    if (healed <= 0) return;
    if (show) {
      this.addText(this.hero.x, GROUND_Y - 250, `+${Math.round(healed)}`, false);
      this.addRing(this.hero.x, GROUND_Y - 60, 110, '#9ff0c8');
      sfx.play('heal');
    }
  }

  /** Cone attack used by slash abilities. Returns the number of enemies hit. */
  hitEnemiesInFront(range: number, power: number, ability = true): number {
    let hits = 0;
    for (const enemy of [...this.enemies]) {
      if (!enemy.alive) continue;
      const dx = enemy.x - this.hero.x;
      if (dx < -30) continue;
      if (dx > range + enemy.radius) continue;
      this.strike(enemy, power, ability);
      hits += 1;
    }
    this.addSlash(
      this.hero.x + 70,
      GROUND_Y - 118,
      this.hero.facing,
      Math.min(220, range * 0.8),
      this.hero.def.palette.accent,
    );
    return hits;
  }

  hitEnemiesAt(x: number, radius: number, power: number, ability = true): number {
    let hits = 0;
    for (const enemy of [...this.enemies]) {
      if (!enemy.alive) continue;
      if (Math.abs(enemy.x - x) > radius + enemy.radius) continue;
      this.strike(enemy, power, ability);
      hits += 1;
    }
    return hits;
  }

  /** Every living enemy, used by the ultimate. */
  hitAllEnemies(power: number): number {
    let hits = 0;
    for (const enemy of [...this.enemies]) {
      if (!enemy.alive) continue;
      this.strike(enemy, power, true);
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

  // ------------------------------------------------------------------ projectiles

  spawnProjectile(projectile: Omit<Projectile, 'life' | 'hit'> & { life?: number }): void {
    this.projectiles.push({
      ...projectile,
      life: projectile.life ?? 2.4,
      hit: new Set<string>(),
    });
  }

  private updateProjectiles(delta: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = this.projectiles[i]!;
      projectile.x += projectile.vx * delta;
      projectile.y += projectile.vy * delta;
      projectile.life -= delta;

      let dead = projectile.life <= 0 || projectile.x < -100 || projectile.x > VIEW_W + 100;

      if (!dead && projectile.from === 'hero') {
        for (const enemy of [...this.enemies]) {
          if (!enemy.alive) continue;
          if (projectile.hit.has(enemy.id)) continue;
          if (Math.abs(projectile.x - enemy.x) > projectile.radius + enemy.radius) continue;
          this.strike(enemy, projectile.power, true);
          projectile.hit.add(enemy.id);
          projectile.pierce -= 1;
          if (projectile.pierce < 0) {
            dead = true;
            break;
          }
        }
      } else if (!dead && projectile.from === 'enemy') {
        if (Math.abs(projectile.x - this.hero.x) < projectile.radius + 44) {
          this.damageHero(projectile.damage);
          this.addRing(projectile.x, GROUND_Y - 120, 44, projectile.color);
          dead = true;
        }
      }

      if (dead) this.projectiles.splice(i, 1);
    }
  }

  // ------------------------------------------------------------------ impacts

  addImpact(impact: Impact): void {
    this.impacts.push(impact);
    this.effects.push({
      kind: 'ring',
      x: impact.x,
      y: GROUND_Y - 6,
      radius: impact.radius,
      life: Math.max(0.1, impact.delay),
      max: Math.max(0.1, impact.delay),
      color: impact.from === 'enemy' ? '#ff8fa8' : impact.color,
    });
  }

  private updateImpacts(delta: number): void {
    for (let i = this.impacts.length - 1; i >= 0; i -= 1) {
      const impact = this.impacts[i]!;
      impact.delay -= delta;
      if (impact.delay > 0) continue;
      this.impacts.splice(i, 1);
      if (impact.from === 'hero') {
        this.hitEnemiesAt(impact.x, impact.radius, impact.power, true);
        this.addBurst(impact.x, GROUND_Y - 60, impact.color, 18, 220);
        sfx.play('hit');
      } else if (Math.abs(this.hero.x - impact.x) <= impact.radius + 30) {
        this.damageHero(impact.damage);
      }
      this.addRing(impact.x, GROUND_Y - 20, impact.radius * 1.1, impact.color);
      this.shakeCamera(4);
    }
  }

  // ------------------------------------------------------------------ effects

  addSlash(x: number, y: number, facing: 1 | -1, radius: number, color: string): void {
    this.effects.push({ kind: 'slash', x, y, facing, radius, life: 0.26, max: 0.26, color });
  }

  addRing(x: number, y: number, radius: number, color: string): void {
    this.effects.push({ kind: 'ring', x, y, radius, life: 0.5, max: 0.5, color });
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
        life: this.rng.range(0.24, 0.62),
        max: 0.62,
        color,
        size: this.rng.range(1.8, 4.4),
      });
    }
  }

  addText(x: number, y: number, text: string, crit: boolean): void {
    this.effects.push({
      kind: 'text',
      x,
      y,
      vy: -52,
      text,
      crit,
      life: crit ? 1.05 : 0.85,
      max: crit ? 1.05 : 0.85,
    });
  }

  shakeCamera(amount: number): void {
    this.shake = Math.min(16, this.shake + amount);
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

  // ------------------------------------------------------------------ hud + results

  getHud(): HudSnapshot {
    const boss = this.enemies.find((enemy) => enemy.isBoss && enemy.alive);
    const total = this.enemies.length;
    const dead = this.enemies.filter((enemy) => !enemy.alive).length;
    const encounter = this.encounter;
    return {
      heroineName: this.hero?.def.name ?? '',
      hp: Math.ceil(this.hero?.hp ?? 0),
      maxHp: this.hero?.maxHp ?? 0,
      hpRatio: this.hero?.hpRatio ?? 0,
      shield: this.hero?.shield ?? 0,
      encounterNumber: Math.min(this.encounterIndex + 1, this.encounterCount),
      encounterCount: this.encounterCount,
      encounterTitle: encounter?.title ?? 'The rift stirs',
      encounterKind: encounter?.kind ?? 'none',
      progress: this.status === 'clearing' ? 1 : total === 0 ? 0 : dead / total,
      progressLabel:
        this.status === 'clearing'
          ? 'Rift sealed'
          : this.status === 'reward'
            ? 'A Star Petal remains'
            : `${Math.max(0, total - dead)} remaining`,
      coins: this.runStats.coins,
      upgrades: this.runStats.upgrades,
      boss: boss ? { name: boss.def.name, hpRatio: boss.hpRatio, phase: boss.phase, tier: 'boss' } : null,
      empowered: this.hero?.empowered ?? false,
    };
  }

  getResults(victory: boolean): RunResults {
    return {
      victory,
      encountersCleared: this.runStats.encountersCleared,
      enemiesDefeated: this.runStats.enemiesDefeated,
      bossesDefeated: this.runStats.bossesDefeated,
      damageDealt: Math.round(this.runStats.damageDealt),
      damageTaken: Math.round(this.runStats.damageTaken),
      duration: this.time,
      coins: this.runStats.coins,
      upgrades: [...this.runStats.upgrades],
      heroine: this.hero?.def.name ?? '',
      world: this.worldDef?.name ?? '',
    };
  }
}
