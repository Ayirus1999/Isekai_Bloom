import { sfx } from '../audio/sfx';
import { clampX } from './hero';
import type { Enemy } from './enemy';
import type { AbilitySpec } from './types';
import type { World } from './world';

/** Execute one basic attack against the current target, with hit detection and feedback. */
export function performBasicAttack(world: World, target: Enemy): void {
  const hero = world.hero;
  const stats = hero.stats;
  const basic = hero.def.basic;
  const color = hero.def.palette.accent;

  hero.attackCooldown = 1 / Math.max(0.2, stats.attackSpeed);
  hero.attackAnim = 1;
  hero.phase = 'attacking';
  hero.faceToward(target.x);

  world.addSlash(
    hero.x + hero.facing * (stats.range * 0.45),
    world.groundY - 90,
    hero.facing,
    stats.range * 0.7,
    color,
  );

  if (basic.kind === 'projectile') {
    world.spawnProjectile({
      x: hero.x + hero.facing * 26,
      y: world.groundY - 108,
      vx: hero.facing * basic.projectileSpeed,
      vy: 0,
      radius: 14,
      power: basic.power,
      damage: 0,
      from: 'hero',
      color,
      kind: 'shard',
      pierce: 0,
      angle: 0,
    });
    sfx.play('slash');
    return;
  }

  world.hitEnemiesInFront(stats.range, basic.power, 1);
  sfx.play('slash');
}

/**
 * Try every ability in order. An ability fires only when its cooldown is ready and its trigger
 * condition is satisfied, so the heroine's kit plays itself without input.
 */
export function tryAbilities(world: World, target: Enemy): boolean {
  const hero = world.hero;
  for (const ability of hero.def.abilities) {
    if ((hero.abilityCooldowns[ability.id] ?? 0) > 0) continue;
    if (!shouldUse(world, ability, target)) continue;
    castAbility(world, ability, target);
    return true;
  }
  return false;
}

function shouldUse(world: World, ability: AbilitySpec, target: Enemy): boolean {
  const hero = world.hero;
  const distance = Math.abs(target.x - hero.x);
  const alive = world.enemies.length;

  switch (ability.trigger) {
    case 'inRange':
      return distance <= ability.range;
    case 'crowd':
      return alive >= ability.minEnemies && distance <= Math.max(ability.range, 460);
    case 'bossOrHurt':
      return world.hasBoss || hero.hpRatio <= ability.hpBelow || alive >= ability.minEnemies;
    case 'hurtAndClose':
      return hero.hpRatio <= ability.hpBelow && distance <= ability.radius + 140;
    case 'always':
      return true;
    default:
      return false;
  }
}

function castAbility(world: World, ability: AbilitySpec, target: Enemy): void {
  const hero = world.hero;
  const color = hero.def.palette.accent;

  hero.abilityCooldowns[ability.id] = ability.cooldown;
  hero.attackAnim = 1;
  hero.faceToward(target.x);

  switch (ability.kind) {
    case 'meleeArc': {
      hero.phase = 'casting';
      world.addSlash(hero.x + hero.facing * ability.range * 0.45, world.groundY - 96, hero.facing, ability.radius * 0.8, color);
      const hits = world.hitEnemiesInFront(ability.range, ability.power, ability.count);
      if (hits > 0) world.shakeCamera(3);
      sfx.play('slash');
      break;
    }
    case 'wave': {
      hero.phase = 'casting';
      world.spawnProjectile({
        x: hero.x + hero.facing * 34,
        y: world.groundY - 110,
        vx: hero.facing * 620,
        vy: 0,
        radius: ability.radius,
        power: ability.power,
        damage: 0,
        from: 'hero',
        color,
        kind: 'wave',
        pierce: 8,
        angle: 0,
      });
      sfx.play('slash');
      break;
    }
    case 'rain': {
      hero.phase = 'casting';
      const targets = world.nearestEnemies(ability.count, ability.range);
      if (targets.length === 0) targets.push(target);
      targets.forEach((enemy, index) => {
        world.addImpact({
          x: enemy.x,
          radius: ability.radius,
          delay: 0.28 + index * 0.16,
          total: 0.28 + index * 0.16 + 0.5,
          power: ability.power,
          damage: 0,
          from: 'hero',
          color,
        });
      });
      sfx.play('buff');
      break;
    }
    case 'dash': {
      hero.phase = 'repositioning';
      const retreat = Math.abs(hero.facing) * ability.range;
      hero.x = clampX(hero.x - hero.facing * retreat * 0.65);
      hero.invulnerable = Math.max(hero.invulnerable, ability.duration);
      hero.facing = target.x > hero.x ? 1 : -1;
      world.addRing(hero.x, world.groundY - 70, 96, color);
      world.addBurst(hero.x, world.groundY - 90, color, 12, 180);
      sfx.play('buff');
      break;
    }
    case 'buff': {
      hero.phase = 'casting';
      hero.applyBuff(0.35, 0.22, ability.duration);
      world.addRing(hero.x, world.groundY - 96, 130, color);
      world.addBurst(hero.x, world.groundY - 110, color, 22, 200);
      sfx.play('buff');
      break;
    }
    case 'projectile': {
      hero.phase = 'casting';
      const spread = ability.count > 1 ? 70 : 0;
      for (let i = 0; i < Math.max(1, ability.count); i += 1) {
        const offset = (i - (ability.count - 1) / 2) * spread;
        world.spawnProjectile({
          x: hero.x + hero.facing * 30,
          y: world.groundY - 120 + offset * 0.12,
          vx: hero.facing * 520,
          vy: 0,
          radius: ability.radius,
          power: ability.power,
          damage: 0,
          from: 'hero',
          color,
          kind: 'shard',
          pierce: 0,
          angle: 0,
        });
      }
      sfx.play('slash');
      break;
    }
    case 'aoe': {
      hero.phase = 'casting';
      world.hitEnemiesAround(ability.radius, ability.power);
      world.addRing(hero.x, world.groundY - 70, ability.radius, color);
      world.addBurst(hero.x, world.groundY - 90, color, 26, 240);
      world.shakeCamera(5);
      sfx.play('crit');
      break;
    }
    default:
      break;
  }
}
