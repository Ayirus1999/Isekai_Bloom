import { performBasicAttack, tryAbilities } from './heroActions';
import { selectTarget, type TargetCandidate } from './targeting';
import type { World } from './world';

/**
 * The heroine's autonomous brain. Runs every simulated step:
 * acquire a target, cast a readiness-gated ability, close to attack range, attack.
 * The player never issues movement or attack input.
 */
export function updateHeroAi(world: World, delta: number): void {
  const hero = world.hero;

  if (!hero.alive) {
    hero.phase = 'defeated';
    hero.moving = false;
    return;
  }

  const candidates: TargetCandidate[] = world.enemies.map((enemy) => ({
    id: enemy.id,
    x: enemy.x,
    tier: enemy.def.tier,
    alive: enemy.alive,
    hpRatio: enemy.hpRatio,
  }));

  const chosen = selectTarget(candidates, hero.x, hero.targetId);
  hero.targetId = chosen?.id ?? null;

  if (!chosen) {
    hero.phase = 'searching';
    hero.moving = false;
    hero.faceToward(world.hero.x + hero.facing);
    return;
  }

  const target = world.enemies.find((enemy) => enemy.id === chosen.id);
  if (!target) {
    hero.phase = 'searching';
    return;
  }

  hero.faceToward(target.x);
  const distance = Math.abs(target.x - hero.x);

  // 1. Abilities take priority: they are on long cooldowns and should not be wasted.
  if (tryAbilities(world, target)) {
    hero.moving = false;
    return;
  }

  // 2. Close the distance, stopping slightly inside attack range so she does not jitter.
  const preferred = Math.max(40, hero.stats.range * 0.78);
  if (distance > preferred) {
    hero.phase = 'moving';
    const approachX = target.x - Math.sign(target.x - hero.x) * preferred;
    hero.moveToward(approachX, delta);
    return;
  }

  // 3. In range: attack whenever the basic-attack cooldown allows.
  hero.moving = false;
  hero.phase = 'attacking';
  if (hero.attackCooldown <= 0) performBasicAttack(world, target);
}
