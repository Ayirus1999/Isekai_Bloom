import { describe, expect, it } from 'vitest';
import { getHeroine } from '../src/data/heroines';
import { Hero } from '../src/game/hero';
import { HERO_X } from '../src/game/constants';
import { EMPTY_MODS } from '../src/game/types';

const yuzuki = getHeroine('yuzuki');

describe('Hero', () => {
  it('starts at full health with every ability off cooldown', () => {
    const hero = new Hero(yuzuki);
    expect(hero.x).toBe(HERO_X);
    expect(hero.hp).toBe(yuzuki.stats.maxHp);
    expect(hero.hpRatio).toBe(1);
    for (const ability of yuzuki.abilities) {
      expect(hero.abilityCooldowns[ability.id]).toBe(0);
    }
  });

  it('clamps health at zero and reports defeat', () => {
    const hero = new Hero(yuzuki);
    hero.takeDamage(99999);
    expect(hero.hp).toBe(0);
    expect(hero.phase).toBe('defeated');
    expect(hero.alive).toBe(false);
  });

  it('ignores damage while invulnerable', () => {
    const hero = new Hero(yuzuki);
    hero.invulnerable = 0.3;
    expect(hero.takeDamage(500)).toBe(0);
    expect(hero.hp).toBe(yuzuki.stats.maxHp);
  });

  it('absorbs damage with a shield before health', () => {
    const hero = new Hero(yuzuki);
    hero.addShield(200);
    hero.invulnerable = 0;
    hero.shield = 200;
    const before = hero.hp;
    hero.takeDamage(120);
    expect(hero.shield).toBe(80);
    expect(hero.hp).toBe(before);
  });

  it('never heals above maximum health', () => {
    const hero = new Hero(yuzuki);
    hero.takeDamage(300);
    const healed = hero.heal(99999);
    expect(hero.hp).toBe(yuzuki.stats.maxHp);
    expect(healed).toBe(300);
  });

  it('applies an empowerment buff and expires it on the simulation clock', () => {
    const hero = new Hero(yuzuki);
    hero.applyBuff(0.35, 0.2, 1);
    expect(hero.stats.attack).toBeCloseTo(yuzuki.stats.attack * 1.35);
    expect(hero.stats.attackSpeed).toBeCloseTo(yuzuki.stats.attackSpeed * 1.2);
    hero.tickTimers(1.1);
    expect(hero.empowered).toBe(false);
    expect(hero.stats.attack).toBe(yuzuki.stats.attack);
  });

  it('counts down attack and ability cooldowns', () => {
    const hero = new Hero(yuzuki);
    hero.attackCooldown = 0.5;
    hero.abilityCooldowns['starfall'] = 3;
    hero.tickTimers(0.5);
    expect(hero.attackCooldown).toBe(0);
    expect(hero.abilityCooldowns['starfall']).toBeCloseTo(2.5);
  });

  it('folds run modifiers into her stats without mutating the definition', () => {
    const hero = new Hero(yuzuki, { ...EMPTY_MODS, attackPct: 0.2, maxHpPct: 0.1 });
    expect(hero.stats.attack).toBeCloseTo(yuzuki.stats.attack * 1.2);
    expect(hero.maxHp).toBe(Math.round(yuzuki.stats.maxHp * 1.1));
    expect(yuzuki.stats.attack).toBe(50);
  });

  it('keeps her at the anchor and never chases a target', () => {
    const hero = new Hero(yuzuki);
    hero.faceToward(1100);
    expect(hero.facing).toBe(1);
    expect(hero.x).toBe(HERO_X);
  });

  it('emits attack impact events only when the clip reaches them', () => {
    const hero = new Hero(yuzuki);
    hero.startBasic('attack', 1, 1, 'target');
    const early = hero.advanceAnimation(0.08);
    expect(early.events).toHaveLength(0);
    const later = hero.advanceAnimation(0.3);
    expect(later.events.some((event) => event.type === 'impact')).toBe(true);
  });

  it('lets a committed basic attack finish instead of cancelling it with a flinch', () => {
    const hero = new Hero(yuzuki);
    hero.startBasic('attack', 1, 1, 'target');
    expect(hero.playHurt()).toBe(false);
    expect(hero.action?.kind).toBe('basic');
    expect(hero.phase).not.toBe('hurt');
  });

  it('does not interrupt an ultimate with a damage reaction', () => {
    const hero = new Hero(yuzuki);
    const ultimate = yuzuki.abilities.find((ability) => ability.ultimate)!;
    hero.startAbility(4, ultimate, 'target');
    expect(hero.ultimateLock).toBe(true);
    expect(hero.playHurt()).toBe(false);
    expect(hero.action?.ability?.id).toBe(ultimate.id);
  });
});
