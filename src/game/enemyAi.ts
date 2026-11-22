import { sfx } from '../audio/sfx';
import type { Enemy } from './enemy';
import { clampX } from './hero';
import type { World } from './world';

export function updateEnemies(world: World, delta: number): void {
  for (const enemy of world.enemies) {
    enemy.tick(delta);
    if (!enemy.alive || enemy.frozen > 0) continue;

    const distance = Math.abs(world.hero.x - enemy.x);
    const towards = world.hero.x > enemy.x ? 1 : -1;
    if (enemy.state !== 'charge') enemy.facing = towards;

    if (enemy.def.tier === 'boss') {
      updateBoss(world, enemy, delta, distance, towards);
    } else if (enemy.def.behavior === 'ranged') {
      updateRanged(world, enemy, delta, distance, towards);
    } else {
      updateChaser(world, enemy, delta, distance, towards);
    }
  }
}

function updateChaser(
  world: World,
  enemy: Enemy,
  delta: number,
  distance: number,
  towards: 1 | -1,
): void {
  if (distance > enemy.def.attackRange) {
    const step = enemy.moveSpeed * delta;
    if (distance > step) enemy.x += towards * step;
    enemy.state = 'approach';
    return;
  }

  enemy.state = 'attack';
  if (enemy.cooldown > 0) return;
  enemy.cooldown = enemy.def.attackCooldown;
  enemy.attackAnim = 1;
  enemy.attackFlash = 0.16;
  world.damageHero(enemy.damage);
  world.addBurst(world.hero.x, world.groundY - 110, enemy.def.accent, 6, 120);
}

function updateRanged(
  world: World,
  enemy: Enemy,
  delta: number,
  distance: number,
  towards: 1 | -1,
): void {
  // Ranged enemies keep a firing lane: back off when crowded, close when too far.
  if (distance < 230) {
    enemy.x = clampX(enemy.x - towards * enemy.moveSpeed * 0.65 * delta);
    enemy.state = 'approach';
  } else if (distance > enemy.def.attackRange) {
    enemy.x = clampX(enemy.x + towards * enemy.moveSpeed * delta);
    enemy.state = 'approach';
  } else {
    enemy.state = 'attack';
  }

  if (distance > enemy.def.attackRange * 1.15) return;
  if (enemy.cooldown > 0) return;

  enemy.cooldown = enemy.def.attackCooldown;
  enemy.attackAnim = 1;
  const dir = world.hero.x > enemy.x ? 1 : -1;
  world.spawnProjectile({
    x: enemy.x + dir * 18,
    y: world.groundY - 104,
    vx: dir * enemy.def.projectileSpeed,
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
  sfx.play('hit');
}

function updateBoss(
  world: World,
  enemy: Enemy,
  delta: number,
  distance: number,
  towards: 1 | -1,
): void {
  const isGolem = enemy.def.id === 'crystal-golem';

  // Second phase at half health: faster patterns and a brief barrier.
  if (enemy.phase === 1 && enemy.hpRatio <= 0.5) {
    enemy.phase = 2;
    enemy.shield = 2.6;
    world.announceBossPhase(enemy);
  }

  // Charging: rush across the arena, hitting once.
  if (enemy.chargeTelegraph > 0) {
    enemy.chargeTelegraph -= delta;
    enemy.state = 'telegraph';
    if (enemy.chargeTelegraph <= 0) {
      enemy.chargeTime = 0.55;
      enemy.chargeHit = false;
      enemy.state = 'charge';
    }
    return;
  }

  if (enemy.chargeTime > 0) {
    enemy.chargeTime -= delta;
    enemy.state = 'charge';
    enemy.x = clampX(enemy.x + enemy.facing * 520 * delta);
    if (!enemy.chargeHit && Math.abs(world.hero.x - enemy.x) < enemy.radius + 46) {
      enemy.chargeHit = true;
      world.damageHero(enemy.damage * 1.4);
      world.shakeCamera(8);
    }
    world.addBurst(enemy.x, world.groundY - 40, enemy.def.accent, 2, 90);
    return;
  }

  // Ground-marked volley: telegraphed area under the heroine.
  enemy.volleyTimer -= delta;
  if (enemy.volleyTimer <= 0) {
    enemy.volleyTimer = isGolem ? 5.6 : 6.4;
    world.addImpact({
      x: world.hero.x,
      radius: isGolem ? 150 : 124,
      delay: 1.05,
      total: 1.55,
      power: 0,
      damage: enemy.damage * 1.25,
      from: 'enemy',
      color: enemy.def.accent,
    });
    sfx.play('boss');
  }

  enemy.chargeTimer -= delta;
  if (enemy.chargeTimer <= 0 && distance > 210) {
    enemy.chargeTimer = isGolem ? 9 : 11;
    enemy.chargeTelegraph = 0.72;
    enemy.state = 'telegraph';
    return;
  }

  if (!isGolem) {
    enemy.summonTimer -= delta;
    if (enemy.summonTimer <= 0) {
      enemy.summonTimer = 9.5;
      world.summonAdds(enemy, 3);
      sfx.play('boss');
    }
  }

  if (distance > enemy.def.attackRange) {
    const step = enemy.moveSpeed * delta;
    if (distance > step) enemy.x += towards * step;
    enemy.state = 'approach';
    return;
  }

  enemy.state = 'attack';
  if (enemy.cooldown > 0) return;
  enemy.cooldown = enemy.def.attackCooldown * (enemy.phase === 2 ? 0.75 : 1);
  enemy.attackAnim = 1;
  world.damageHero(enemy.damage * 1.1);
  world.addBurst(world.hero.x, world.groundY - 110, enemy.def.accent, 8, 150);
  world.shakeCamera(4);
}
