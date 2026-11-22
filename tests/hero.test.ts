import { describe, expect, it } from 'vitest';
import { getHeroine } from '../src/data/heroines';
import { Hero, clampX } from '../src/game/hero';
import { ARENA_MAX_X, ARENA_MIN_X } from '../src/game/constants';

const yuzuki = getHeroine('yuzuki');

describe('Hero', () => {
  it('starts at full health with every ability off cooldown', () => {
    const hero = new Hero(yuzuki, 800);
    expect(hero.hp).toBe(yuzuki.stats.maxHp);
    expect(hero.hpRatio).toBe(1);
    for (const ability of yuzuki.abilities) {
      expect(hero.abilityCooldowns[ability.id]).toBe(0);
    }
  });

  it('clamps health at zero and reports defeat', () => {
    const hero = new Hero(yuzuki, 800);
    hero.takeDamage(99999);
    expect(hero.hp).toBe(0);
    expect(hero.phase).toBe('defeated');
    expect(hero.alive).toBe(false);
  });

  it('ignores damage while invulnerable', () => {
    const hero = new Hero(yuzuki, 800);
    hero.invulnerable = 0.3;
    expect(hero.takeDamage(500)).toBe(0);
    expect(hero.hp).toBe(yuzuki.stats.maxHp);
  });

  it('never heals above maximum health', () => {
    const hero = new Hero(yuzuki, 800);
    hero.takeDamage(300);
    const healed = hero.heal(99999);
    expect(hero.hp).toBe(yuzuki.stats.maxHp);
    expect(healed).toBe(300);
  });

  it('applies an empowerment buff and expires it on the simulation clock', () => {
    const hero = new Hero(yuzuki, 800);
    hero.applyBuff(0.35, 0.2, 1);
    expect(hero.stats.attack).toBeCloseTo(yuzuki.stats.attack * 1.35);
    expect(hero.stats.attackSpeed).toBeCloseTo(yuzuki.stats.attackSpeed * 1.2);
    hero.tickTimers(1.1);
    expect(hero.empowered).toBe(false);
    expect(hero.stats.attack).toBe(yuzuki.stats.attack);
  });

  it('counts down attack and ability cooldowns', () => {
    const hero = new Hero(yuzuki, 800);
    hero.attackCooldown = 0.5;
    hero.abilityCooldowns['starfall'] = 3;
    hero.tickTimers(0.5);
    expect(hero.attackCooldown).toBe(0);
    expect(hero.abilityCooldowns['starfall']).toBeCloseTo(2.5);
  });

  it('walks toward a target without leaving the arena', () => {
    const hero = new Hero(yuzuki, 800);
    hero.moveToward(2000, 0.5);
    expect(hero.x).toBeGreaterThan(800);
    expect(hero.x).toBeLessThanOrEqual(ARENA_MAX_X);
    hero.moveToward(-5000, 30);
    expect(hero.x).toBe(ARENA_MIN_X);
    hero.moveToward(99999, 60);
    expect(hero.x).toBe(ARENA_MAX_X);
  });

  it('faces the direction of travel', () => {
    const hero = new Hero(yuzuki, 800);
    hero.moveToward(400, 0.2);
    expect(hero.facing).toBe(-1);
    hero.moveToward(1200, 0.2);
    expect(hero.facing).toBe(1);
  });
});

describe('clampX', () => {
  it('keeps positions inside the playable span', () => {
    expect(clampX(-10)).toBe(ARENA_MIN_X);
    expect(clampX(99999)).toBe(ARENA_MAX_X);
    expect(clampX(1000)).toBe(1000);
  });
});
