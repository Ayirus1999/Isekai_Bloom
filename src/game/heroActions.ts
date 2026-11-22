import { sfx } from '../audio/sfx';
import type { ClipEvent } from './anim';
import type { Hero, HeroAction } from './hero';
import type { World } from './world';
import type { AbilityDef, BasicAttackDef } from './types';

/** Begin a basic attack clip. No damage is dealt until its impact event fires. */
export function startBasic(
  world: World,
  target: { id: string; x: number },
  basic: BasicAttackDef,
  clipId: string,
): void {
  const hero = world.hero;
  const clip = hero.animator.set.clips[clipId] ?? hero.animator.set.attack;
  hero.faceToward(target.x);
  hero.startBasic(clipId, basic.power, Math.max(1, basic.hits), target.id);
  // The animation is the authority on timing, but a fast heroine may not out-pace her own clip.
  hero.attackCooldown = Math.max(clip.duration * 0.72, 1 / Math.max(0.2, hero.stats.attackSpeed));
}

export function startAbility(
  world: World,
  ability: AbilityDef,
  index: number,
  targetId: string,
): void {
  const hero = world.hero;
  hero.abilityCooldowns[ability.id] = Math.max(0.5, ability.cooldown * (1 - world.mods.cooldownPct));
  hero.startAbility(index, ability, targetId);
  if (ability.ultimate) {
    world.cinematic = 1.0;
    world.shakeCamera(5);
  }
}

/** Turn one animation event into gameplay. Called exactly once per crossed keyframe. */
export function resolveHeroEvent(world: World, event: ClipEvent): void {
  if (event.type === 'sfx') {
    if (event.sfx) sfx.play(event.sfx);
    return;
  }

  const hero = world.hero;
  const action = hero.action;
  if (!action) return;
  const ability = action.ability;

  switch (event.type) {
    case 'footstep':
      return;

    case 'dash':
      hero.invulnerable = Math.max(hero.invulnerable, 0.5);
      world.addRing(hero.x + 40, world.groundY - 90, 90, hero.def.palette.accent);
      world.addBurst(hero.x + 40, world.groundY - 70, hero.def.palette.glow, 10, 150);
      return;

    case 'buff':
      if (ability) applyBuff(world, hero, ability);
      return;

    case 'heal':
      world.healHero(hero.maxHp * 0.2);
      world.addRing(hero.x, world.groundY - 70, 130, '#a7f0c6');
      return;

    case 'shield':
      hero.addShield(hero.maxHp * 0.28, ability?.duration ?? 4);
      world.addRing(hero.x, world.groundY - 90, 140, hero.def.palette.accent);
      sfx.play('buff');
      return;

    case 'projectile':
      releaseProjectile(world, action);
      return;

    case 'rain':
      if (ability) castRain(world, ability);
      return;

    case 'aoe':
      if (ability) castArea(world, action, ability);
      return;

    case 'ultimate':
      world.cinematic = 1.2;
      world.shakeCamera(8);
      world.addRing(hero.x, world.groundY - 80, 260, hero.def.palette.accent);
      sfx.play('boss');
      return;

    case 'impact':
      resolveImpact(world, action);
      return;

    default:
      return;
  }
}

function resolveImpact(world: World, action: HeroAction): void {
  const hero = world.hero;
  const ability = action.ability;

  if (action.kind === 'basic') {
    const target = findTarget(world, action.targetId, hero.def.basic.range + 200);
    if (!target) return;
    const perHit = action.power / Math.max(1, action.hits);
    world.strike(target, perHit, false);
    world.addSlash(
      hero.x + 70,
      world.groundY - 116,
      hero.facing,
      Math.min(140, hero.def.basic.range * 0.55),
      hero.def.palette.accent,
    );
    sfx.play('slash');
    return;
  }

  if (!ability) return;
  if (ability.ultimate) return; // The ultimate resolves on its dedicated area event.

  switch (ability.kind) {
    case 'slashArc':
      world.hitEnemiesInFront(ability.range, ability.power);
      world.shakeCamera(3);
      break;
    case 'dash': {
      const target = findTarget(world, action.targetId, 600);
      const x = target ? target.x : hero.x + 220;
      world.hitEnemiesAt(x, ability.radius, ability.power);
      world.addBurst(x, world.groundY - 90, hero.def.palette.accent, 16, 220);
      break;
    }
    case 'aoe': {
      const target = findTarget(world, action.targetId, 900);
      const x = target ? target.x : hero.x + 260;
      world.hitEnemiesAt(x, ability.radius, ability.power);
      world.addRing(x, world.groundY - 50, ability.radius, hero.def.palette.accent);
      world.shakeCamera(4);
      break;
    }
    case 'buff':
      applyBuff(world, hero, ability);
      break;
    case 'heal':
      world.healHero(hero.maxHp * 0.2);
      break;
    case 'shield':
      hero.addShield(hero.maxHp * 0.28, ability.duration);
      break;
    default:
      break;
  }
}

function applyBuff(world: World, hero: Hero, ability: AbilityDef): void {
  const duration = ability.duration > 0 ? ability.duration : 6;
  hero.applyBuff(0.35, 0.2, duration);
  world.addRing(hero.x, world.groundY - 80, 150, hero.def.palette.accent);
  world.addBurst(hero.x, world.groundY - 110, hero.def.palette.glow, 22, 210);
  sfx.play('buff');
}

function releaseProjectile(world: World, action: HeroAction): void {
  const hero = world.hero;
  const ability = action.ability;
  const basic = hero.def.basic;

  if (action.kind === 'basic') {
    if (basic.kind !== 'projectile') return;
    world.spawnProjectile({
      x: hero.x + 42,
      y: world.groundY - 132,
      vx: basic.projectileSpeed || 620,
      vy: 0,
      radius: 13,
      power: basic.power,
      damage: 0,
      from: 'hero',
      color: hero.def.palette.accent,
      kind: 'shard',
      pierce: 0,
      angle: 0,
    });
    sfx.play('slash');
    return;
  }

  if (!ability) return;

  if (ability.kind === 'wave') {
    world.spawnProjectile({
      x: hero.x + 48,
      y: world.groundY - 138,
      vx: 640,
      vy: 0,
      radius: ability.radius * 0.8,
      power: ability.power,
      damage: 0,
      from: 'hero',
      color: hero.def.palette.accent,
      kind: 'wave',
      pierce: 8,
      angle: 0,
    });
  } else {
    world.spawnProjectile({
      x: hero.x + 46,
      y: world.groundY - 136,
      vx: 700,
      vy: 0,
      radius: 12,
      power: ability.power,
      damage: 0,
      from: 'hero',
      color: hero.def.palette.accent,
      kind: 'shard',
      pierce: 2,
      angle: 0,
    });
  }
  sfx.play('slash');
}

function castRain(world: World, ability: AbilityDef): void {
  const hero = world.hero;
  const targets = world.nearestEnemies(ability.count, ability.range);
  if (targets.length === 0) {
    world.addImpact({
      x: hero.x + 300,
      radius: ability.radius,
      delay: 0.25,
      total: 0.8,
      power: ability.power,
      damage: 0,
      from: 'hero',
      color: hero.def.palette.accent,
    });
    return;
  }
  targets.forEach((enemy, index) => {
    const delay = 0.18 + index * 0.18;
    world.addImpact({
      x: enemy.x,
      radius: ability.radius,
      delay,
      total: delay + 0.45,
      power: ability.power,
      damage: 0,
      from: 'hero',
      color: hero.def.palette.accent,
    });
  });
  sfx.play('buff');
}

function castArea(world: World, action: HeroAction, ability: AbilityDef): void {
  const hero = world.hero;
  const target = findTarget(world, action.targetId, 1000);
  const x = target ? target.x : hero.x + 300;

  if (ability.ultimate) {
    world.hitAllEnemies(ability.power);
    world.addRing(hero.x, world.groundY - 100, 380, hero.def.palette.accent);
    world.addRing(x, world.groundY - 40, 280, '#ffe6a8');
    world.addBurst(x, world.groundY - 100, hero.def.palette.glow, 40, 330);
    world.shakeCamera(12);
    sfx.play('crit');
    return;
  }

  world.hitEnemiesAt(x, ability.radius, ability.power);
  world.addBurst(x, world.groundY - 60, hero.def.palette.accent, 22, 250);
  world.shakeCamera(5);
  sfx.play('crit');
}

function findTarget(world: World, targetId: string | null, maxRange: number) {
  const hero = world.hero;
  if (targetId) {
    const target = world.enemies.find((enemy) => enemy.id === targetId && enemy.alive);
    if (target && Math.abs(target.x - hero.x) <= maxRange) return target;
  }
  return world.nearestEnemies(1, maxRange)[0] ?? null;
}
