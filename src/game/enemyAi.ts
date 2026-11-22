import { sfx } from '../audio/sfx';
import type { Enemy } from './enemy';
import type { World } from './world';
import type { BossPattern } from './types';

/** Where melee enemies settle relative to the heroine (screen-space distance). */
const MELEE_REACH = 238;
const RANGED_REACH = 470;

export function updateEnemies(world: World, delta: number): void {
  for (const enemy of world.enemies) {
    enemy.tick(delta);
    if (!enemy.alive) continue;
    if (enemy.frozen > 0) {
      enemy.state = 'idle';
      continue;
    }

    const distance = Math.abs(world.hero.x - enemy.x);
    const towards: 1 | -1 = world.hero.x > enemy.x ? 1 : -1;
    enemy.facing = towards;

    if (enemy.isBoss) {
      updateBoss(world, enemy, delta, distance);
    } else if (enemy.def.behavior === 'ranged') {
      updateRanged(world, enemy, delta, distance);
    } else {
      updateMelee(world, enemy, delta, distance);
    }
  }
}

function advance(world: World, enemy: Enemy, delta: number, distance: number, towards: 1 | -1, desired: number): void {
  if (distance > desired) {
    const step = enemy.moveSpeed * delta;
    enemy.x += towards * Math.min(step, distance - desired);
    enemy.state = 'approach';
    void world;
  }
}

function updateMelee(world: World, enemy: Enemy, delta: number, distance: number): void {
  const reach = MELEE_REACH + enemy.standOff;

  if (enemy.telegraph > 0) {
    enemy.telegraph -= delta;
    enemy.state = 'telegraph';
    if (enemy.telegraph <= 0) {
      enemy.state = 'recover';
      enemy.attackAnim = 1;
      if (Math.abs(world.hero.x - enemy.x) <= reach + 80) {
        world.damageHero(enemy.damage);
        world.addBurst(world.hero.x, world.groundY - 120, enemy.def.accent, 7, 140);
      }
      enemy.cooldown = enemy.def.attackCooldown;
      enemy.attackFlash = 0.16;
    }
    return;
  }

  if (distance > reach) {
    advance(world, enemy, delta, distance, world.hero.x > enemy.x ? 1 : -1, reach);
    return;
  }

  enemy.state = 'idle';
  if (enemy.cooldown > 0) return;
  enemy.telegraph = enemy.def.windup;
  enemy.state = 'telegraph';
  enemy.attackAnim = 1;
}

function updateRanged(world: World, enemy: Enemy, delta: number, distance: number): void {
  const desired = RANGED_REACH + enemy.standOff;

  if (enemy.telegraph > 0) {
    enemy.telegraph -= delta;
    enemy.state = 'telegraph';
    if (enemy.telegraph <= 0) {
      enemy.state = 'recover';
      enemy.attackAnim = 1;
      const dir = world.hero.x > enemy.x ? 1 : -1;
      world.spawnProjectile({
        x: enemy.x + dir * 24,
        y: world.groundY - 128,
        vx: dir * (enemy.def.projectileSpeed || 380),
        vy: 0,
        radius: 14,
        power: 0,
        damage: enemy.damage,
        from: 'enemy',
        color: enemy.def.accent,
        kind: 'orb',
        pierce: 0,
        angle: 0,
      });
      enemy.cooldown = enemy.def.attackCooldown;
      sfx.play('hit');
    }
    return;
  }

  if (distance < desired - 80) {
    enemy.x -= (world.hero.x > enemy.x ? 1 : -1) * enemy.moveSpeed * 0.6 * delta;
    enemy.state = 'approach';
    return;
  }
  if (distance > desired + 90) {
    advance(world, enemy, delta, distance, world.hero.x > enemy.x ? 1 : -1, desired);
    return;
  }

  enemy.state = 'idle';
  if (enemy.cooldown > 0) return;
  enemy.telegraph = enemy.def.windup;
  enemy.state = 'telegraph';
  enemy.attackAnim = 1;
}

// ---------------------------------------------------------------------------- bosses

function updateBoss(world: World, enemy: Enemy, delta: number, distance: number): void {
  if (enemy.phase === 1 && enemy.hpRatio <= 0.5) {
    enemy.phase = 2;
    enemy.shield = 2.4;
    enemy.patternTimer = 0.5;
    world.announceBossPhase(enemy);
    sfx.play('boss');
  }

  if (enemy.telegraph > 0) {
    enemy.telegraph -= delta;
    enemy.state = 'telegraph';
    if (enemy.telegraph <= 0) executePattern(world, enemy);
    return;
  }

  // Close the gap between patterns so the duel reads as a fight, not a firing squad.
  if (distance > 232) {
    advance(world, enemy, delta, distance, world.hero.x > enemy.x ? 1 : -1, 232);
  }

  enemy.patternTimer -= delta;
  if (enemy.patternTimer > 0) {
    if (enemy.state !== 'approach') enemy.state = 'idle';
    return;
  }

  const patterns = enemy.def.patterns.length > 0 ? enemy.def.patterns : (['sweep'] as BossPattern[]);
  const pattern = patterns[enemy.patternIndex % patterns.length]!;
  enemy.patternIndex += 1;
  enemy.pattern = pattern;
  enemy.telegraph = enemy.def.windup * (enemy.phase === 2 ? 0.8 : 1);
  enemy.patternTimer = enemy.def.attackCooldown * (enemy.phase === 2 ? 0.72 : 1);
  enemy.state = 'telegraph';
  enemy.attackAnim = 1;
}

function executePattern(world: World, enemy: Enemy): void {
  const pattern = enemy.pattern ?? 'sweep';
  const distance = Math.abs(world.hero.x - enemy.x);
  const dir = world.hero.x > enemy.x ? 1 : -1;
  enemy.state = 'recover';
  enemy.attackAnim = 1;
  sfx.play('boss');

  switch (pattern) {
    case 'sweep': {
      world.addSlash(world.hero.x - 30, world.groundY - 120, -1, 190, enemy.def.accent);
      if (distance < 330) {
        world.damageHero(enemy.damage * 1.2);
        world.addBurst(world.hero.x, world.groundY - 110, enemy.def.accent, 14, 200);
      } else {
        world.spawnProjectile({
          x: enemy.x + dir * 40,
          y: world.groundY - 70,
          vx: dir * 520,
          vy: 0,
          radius: enemy.def.radius * 0.7,
          power: 0,
          damage: enemy.damage * 1.1,
          from: 'enemy',
          color: enemy.def.accent,
          kind: 'wave',
          pierce: 0,
          angle: 0,
        });
      }
      break;
    }

    case 'volley': {
      for (let i = 0; i < 3; i += 1) {
        world.spawnProjectile({
          x: enemy.x - 20,
          y: world.groundY - 150 - i * 22,
          vx: dir * (400 + i * 40),
          vy: -40 + i * 40,
          radius: 15,
          power: 0,
          damage: enemy.damage * 0.72,
          from: 'enemy',
          color: enemy.def.accent,
          kind: 'orb',
          pierce: 0,
          angle: 0,
        });
      }
      break;
    }

    case 'slam': {
      world.addImpact({
        x: world.hero.x,
        radius: 155,
        delay: 0.6,
        total: 1.0,
        power: 0,
        damage: enemy.damage * 1.35,
        from: 'enemy',
        color: enemy.def.accent,
      });
      break;
    }

    case 'beam': {
      world.addSlash(enemy.x - 200, world.groundY - 150, -1, 420, enemy.def.accent);
      world.addRing(world.hero.x, world.groundY - 40, 120, enemy.def.accent);
      world.damageHero(enemy.damage * 1.1);
      world.shakeCamera(7);
      break;
    }

    case 'meteor': {
      world.addImpact({
        x: world.hero.x + (dir > 0 ? -70 : 70),
        radius: 130,
        delay: 0.45,
        total: 0.9,
        power: 0,
        damage: enemy.damage * 0.95,
        from: 'enemy',
        color: enemy.def.accent,
      });
      world.addImpact({
        x: world.hero.x,
        radius: 170,
        delay: 0.95,
        total: 1.4,
        power: 0,
        damage: enemy.damage * 1.15,
        from: 'enemy',
        color: enemy.def.accent,
      });
      break;
    }

    case 'drain': {
      world.addSlash(enemy.x - 60, world.groundY - 140, -1, 300, '#c76bff');
      world.damageHero(enemy.damage);
      enemy.heal(enemy.damage * 0.6);
      world.shakeCamera(5);
      break;
    }

    default:
      break;
  }
}
