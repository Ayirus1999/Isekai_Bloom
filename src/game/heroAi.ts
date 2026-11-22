import { selectTarget, type TargetCandidate } from './targeting';
import type { Hero } from './hero';
import { startAbility, startBasic } from './heroActions';
import type { World } from './world';
import type { AbilityDef } from './types';

/** Extra reach granted by her lunge so a melee heroine can strike an enemy standing at bay. */
const LUNGE_REACH = 92;

/**
 * The heroine's autonomous brain. She never moves from her anchor: she acquires a target,
 * fires any ready ability whose condition is met, and otherwise attacks when the enemy is in
 * reach. Everything the player does is strategic (upgrades), never input during combat.
 */
export function updateHeroAi(world: World, delta: number): void {
  const hero = world.hero;
  hero.targetLock = Math.max(0, hero.targetLock - delta);

  if (!hero.alive) return;
  if (hero.action !== null) return;
  if (!hero.canAct) return;

  const candidates: TargetCandidate[] = world.enemies
    .filter((enemy) => enemy.alive)
    .map((enemy) => ({ id: enemy.id, x: enemy.x, tier: enemy.def.tier, alive: enemy.alive, hpRatio: enemy.hpRatio }));

  const chosen = selectTarget(candidates, hero.x, hero.targetId);
  hero.targetId = chosen?.id ?? null;
  if (!chosen) {
    hero.phase = 'idle';
    return;
  }

  const target = world.enemies.find((enemy) => enemy.id === chosen.id);
  if (!target) return;
  hero.faceToward(target.x);

  const distance = Math.abs(target.x - hero.x);
  const basic = hero.def.basic;
  const basicReach = basic.range + LUNGE_REACH + target.radius;

  if (tryAbility(world, hero, target, distance)) return;

  if (hero.attackCooldown <= 0 && distance <= basicReach) {
    const clipId = hero.nextAttackClip();
    startBasic(world, target, basic, clipId);
  } else {
    hero.phase = 'idle';
  }
}

function tryAbility(world: World, hero: Hero, target: { id: string; x: number; radius: number }, distance: number): boolean {
  const living = world.enemies.filter((enemy) => enemy.alive).length;

  for (let index = 0; index < hero.def.abilities.length; index += 1) {
    const ability = hero.def.abilities[index]!;
    if ((hero.abilityCooldowns[ability.id] ?? 0) > 0) continue;
    if (!conditionMet(world, ability, distance, living)) continue;
    if (!inCastRange(ability, distance, target.radius)) continue;
    startAbility(world, ability, index, target.id);
    return true;
  }
  return false;
}

function inCastRange(ability: AbilityDef, distance: number, radius: number): boolean {
  if (isSelfAbility(ability)) return true;
  if (ability.range <= 0) return true;
  return distance <= ability.range + radius + 40;
}

function isSelfAbility(ability: AbilityDef): boolean {
  return ability.kind === 'heal' || ability.kind === 'shield' || ability.kind === 'buff' || ability.kind === 'dash';
}

function conditionMet(world: World, ability: AbilityDef, distance: number, living: number): boolean {
  const hero = world.hero;
  const hpBelow = ability.hpBelow > 0 ? ability.hpBelow : 0.5;

  switch (ability.trigger) {
    case 'inRange':
      return distance <= ability.range + 80 || isSelfAbility(ability);
    case 'crowd':
      return living >= Math.max(2, ability.minEnemies) && distance <= Math.max(ability.range, 620);
    case 'bossOrHurt':
      if (ability.ultimate) {
        return (world.hasBoss && hero.hpRatio <= 0.94) || hero.hpRatio <= hpBelow;
      }
      return world.hasBoss || hero.hpRatio <= hpBelow || living >= Math.max(2, ability.minEnemies);
    case 'hurt':
      return hero.hpRatio <= hpBelow || (Boolean(ability.ultimate) && hero.hpRatio <= 0.75);
    case 'always':
      return true;
    default:
      return false;
  }
}
