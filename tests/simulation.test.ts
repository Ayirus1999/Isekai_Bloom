import { describe, expect, it } from 'vitest';
import { getHeroine } from '../src/data/heroines';
import { getWorld } from '../src/data/worlds';
import { NO_BONUS } from '../src/game/hero';
import { World } from '../src/game/world';
import type { Enemy } from '../src/game/enemy';

const heroine = getHeroine('yuzuki');
const blossom = getWorld('blossom');

function freshWorld(startIndex = 0): World {
  const world = new World();
  world.startRun(heroine, blossom, NO_BONUS, startIndex);
  return world;
}

function simulate(world: World, seconds: number, step = 1 / 60): void {
  for (let elapsed = 0; elapsed < seconds; elapsed += step) world.update(step);
}

describe('centralised simulation speed', () => {
  it('produces exactly twice the simulated time at 2x for the same real time', () => {
    const normal = freshWorld();
    const fast = freshWorld();
    fast.clock.setScale(2);

    simulate(normal, 1.5);
    simulate(fast, 1.5);

    expect(normal.time).toBeGreaterThan(1.4);
    expect(fast.time).toBeCloseTo(normal.time * 2, 4);
  });

  it('applies the multiplier to enemy movement, not only to the clock', () => {
    const normal = freshWorld();
    const fast = freshWorld();
    fast.clock.setScale(2);

    const slowWolf = normal.spawnEnemy('shadow-wolf', 1150, 1, 1);
    const fastWolf = fast.spawnEnemy('shadow-wolf', 1150, 1, 1);

    simulate(normal, 0.25);
    simulate(fast, 0.25);

    const slowMoved = Math.abs(slowWolf.x - 1150);
    const fastMoved = Math.abs(fastWolf.x - 1150);
    expect(slowMoved).toBeGreaterThan(2);
    expect(fastMoved).toBeCloseTo(slowMoved * 2, 0);
  });

  it('freezes the whole simulation while paused', () => {
    const world = freshWorld();
    simulate(world, 1);
    const time = world.time;
    const positions = world.enemies.map((enemy) => enemy.x);
    const heroHp = world.hero.hp;

    world.clock.pause();
    simulate(world, 2);

    expect(world.time).toBe(time);
    expect(world.hero.hp).toBe(heroHp);
    expect(world.enemies.map((enemy) => enemy.x)).toEqual(positions);
  });

  it('resumes from the same simulated time after unpausing', () => {
    const world = freshWorld();
    simulate(world, 0.5);
    world.clock.pause();
    simulate(world, 1);
    const pausedAt = world.time;
    world.clock.resume();
    simulate(world, 0.5);
    expect(world.time).toBeGreaterThan(pausedAt);
    expect(world.time - pausedAt).toBeCloseTo(0.5, 1);
  });
});

describe('encounter composition', () => {
  it('counts an event encounter as cleared while still offering its reward', () => {
    const world = freshWorld(2);
    expect(world.encounter?.kind).toBe('event');
    expect(world.status).toBe('reward');
    expect(world.runStats.encountersCleared).toBe(1);
  });

  it('spawns several independent enemies in a group encounter', () => {
    const world = freshWorld(0);
    expect(world.encounter?.kind).toBe('group');
    expect(world.enemies.length).toBeGreaterThanOrEqual(3);

    const [first, second] = world.enemies;
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(first!.maxHp).toBe(second!.maxHp);
    expect(first!.hp).toBe(first!.maxHp);
    expect(second!.hp).toBe(second!.maxHp);

    world.damageEnemy(first!, 40, false);
    expect(first!.hp).toBeLessThan(first!.maxHp);
    expect(second!.hp).toBe(second!.maxHp);
  });

  it('enforces exactly one enemy for a mini-boss encounter', () => {
    const world = freshWorld(4);
    expect(world.encounter?.kind).toBe('miniboss');
    expect(world.enemies).toHaveLength(1);
    expect(world.enemies[0]!.def.tier).toBe('boss');
  });

  it('enforces exactly one enemy for a final-boss encounter and never adds minions', () => {
    const world = freshWorld(9);
    expect(world.encounter?.kind).toBe('final');
    expect(world.enemies).toHaveLength(1);
    const boss = world.enemies[0]!;
    expect(boss.def.tier).toBe('boss');

    simulate(world, 12);
    const bosses = world.enemies.filter((enemy: Enemy) => enemy.def.tier === 'boss');
    expect(bosses.length).toBeLessThanOrEqual(1);
    expect(world.enemies.every((enemy) => enemy.def.tier === 'boss')).toBe(true);
  });
});

describe('animation-synchronised damage', () => {
  it('does not damage the target before the impact event fires', () => {
    const world = freshWorld(0);
    const dummy = world.spawnEnemy('mushroomling', 430, 1, 0.2);
    simulate(world, 0.05);

    world.hero.startBasic('attack', 1, 1, dummy.id);
    const before = dummy.hp;
    simulate(world, 0.08);
    expect(dummy.hp).toBe(before);

    simulate(world, 0.3);
    expect(dummy.hp).toBeLessThan(before);
  });

  it('resolves a single-target strike against one enemy only', () => {
    const world = freshWorld(0);
    const a = world.spawnEnemy('mushroomling', 430, 1, 0.2);
    const b = world.spawnEnemy('mushroomling', 470, 1, 0.2);
    world.hero.startBasic('attack', 1, 1, a.id);
    simulate(world, 0.4);
    expect(a.hp).toBeLessThan(a.maxHp);
    expect(b.hp).toBe(b.maxHp);
  });

  it('lets an area ability damage several enemies at once', () => {
    const world = freshWorld(0);
    const targets = [
      world.spawnEnemy('mushroomling', 420, 1, 0.2),
      world.spawnEnemy('mushroomling', 455, 1, 0.2),
      world.spawnEnemy('mushroomling', 490, 1, 0.2),
    ];
    const ability = heroine.abilities.find((entry) => entry.kind === 'slashArc')!;
    world.hero.startAbility(0, ability, targets[0]!.id);
    simulate(world, 0.7);

    const damaged = targets.filter((enemy) => enemy.hp < enemy.maxHp);
    expect(damaged.length).toBeGreaterThanOrEqual(2);
  });
});

describe('run outcomes', () => {
  it('ends the run in defeat when the heroine dies', () => {
    const world = freshWorld(0);
    simulate(world, 0.3);
    world.damageHero(1_000_000);
    expect(world.hero.hp).toBe(0);
    expect(world.status).toBe('defeat');
    const results = world.getResults(false);
    expect(results.victory).toBe(false);
    expect(results.duration).toBeGreaterThan(0);
  });

  it('reports the boss bar through the HUD snapshot in a boss fight', () => {
    const world = freshWorld(4);
    const hud = world.getHud();
    expect(hud.boss).not.toBeNull();
    expect(hud.boss?.name).toBe('The Thorn Guardian');
    expect(hud.encounterKind).toBe('miniboss');
  });

  it('reports encounter progress for a group fight', () => {
    const world = freshWorld(0);
    simulate(world, 0.2);
    const hud = world.getHud();
    expect(hud.encounterNumber).toBe(1);
    expect(hud.encounterCount).toBe(10);
    expect(hud.progressLabel).toContain('remaining');
  });
});

describe('upgrades affect real calculations', () => {
  it('raises damage dealt when attack modifiers are applied', () => {
    const base = freshWorld(0);
    const buffed = freshWorld(0);
    buffed.mods.attackPct = 0.5;
    buffed.hero.mods = buffed.mods;

    const baseTarget = base.spawnEnemy('crystal-beetle', 430, 1, 0);
    const buffedTarget = buffed.spawnEnemy('crystal-beetle', 430, 1, 0);

    base.strike(baseTarget, 1, false);
    buffed.strike(buffedTarget, 1, false);

    expect(baseTarget.hp).toBeLessThan(baseTarget.maxHp);
    expect(buffedTarget.maxHp - buffedTarget.hp).toBeGreaterThan(baseTarget.maxHp - baseTarget.hp);
  });
});
