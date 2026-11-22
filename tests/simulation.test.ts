import { describe, expect, it } from 'vitest';
import { getHeroine } from '../src/data/heroines';
import { STAGES } from '../src/data/stages';
import { World } from '../src/game/world';

const heroine = getHeroine('yuzuki');

function freshWorld(): World {
  const world = new World(heroine);
  world.startRun(heroine);
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

    simulate(normal, 2);
    simulate(fast, 2);

    expect(normal.time).toBeGreaterThan(1.9);
    expect(fast.time).toBeCloseTo(normal.time * 2, 4);
  });

  it('applies the multiplier to enemy movement, not only to the clock', () => {
    const normal = freshWorld();
    const fast = freshWorld();
    fast.clock.setScale(2);

    // One far-away enemy per world so movement is unobstructed by the heroine.
    const slowGolem = normal.spawnEnemy('crystal-golem', 2400, 1, 1);
    const fastGolem = fast.spawnEnemy('crystal-golem', 2400, 1, 1);
    simulate(normal, 0.5);
    simulate(fast, 0.5);

    const slowDistance = Math.abs(slowGolem.x - 2400);
    const fastDistance = Math.abs(fastGolem.x - 2400);
    expect(slowDistance).toBeGreaterThan(10);
    expect(fastDistance).toBeCloseTo(slowDistance * 2, 0);
  });

  it('freezes the whole simulation while paused', () => {
    const world = freshWorld();
    simulate(world, 1);
    const time = world.time;
    const runnerTime = world.stageRunner?.time ?? 0;
    const positions = world.enemies.map((enemy) => enemy.x);
    const heroX = world.hero.x;

    world.clock.pause();
    simulate(world, 2);

    expect(world.time).toBe(time);
    expect(world.stageRunner?.time ?? 0).toBe(runnerTime);
    expect(world.hero.x).toBe(heroX);
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

describe('run outcomes', () => {
  it('ends the run in defeat when the heroine dies', () => {
    const world = freshWorld();
    simulate(world, 0.5);
    world.damageHero(1_000_000);
    expect(world.hero.hp).toBe(0);
    world.update(1 / 60);
    expect(world.status).toBe('defeat');

    const results = world.getResults(false);
    expect(results.victory).toBe(false);
    expect(results.duration).toBeGreaterThan(0);
  });

  it('ends the run in victory after the final stage', () => {
    const world = freshWorld();
    world.stageIndex = STAGES.length - 1;
    world.advanceStage();
    expect(world.status).toBe('victory');
    expect(world.getResults(true).stagesCleared).toBe(1);
  });

  it('reports stage progress and the boss bar through the HUD snapshot', () => {
    const world = freshWorld();
    simulate(world, 0.2);
    const hud = world.getHud();
    expect(hud.stageNumber).toBe(1);
    expect(hud.stageCount).toBe(STAGES.length);
    expect(hud.progressLabel).toContain('Wave');
    expect(hud.boss).toBeNull();
  });
});
