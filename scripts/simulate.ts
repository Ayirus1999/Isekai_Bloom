/**
 * Headless balance harness.
 *
 * Plays complete adventures with the same simulation the browser uses, automatically picks the
 * first upgrade card and prints the encounter log. Run with `npm run simulate`.
 */
import { getHeroine } from '../src/data/heroines';
import { getWorld } from '../src/data/worlds';
import { NO_BONUS } from '../src/game/hero';
import { rollUpgradeChoices } from '../src/game/upgrades';
import { World } from '../src/game/world';
import { HEROINES } from '../src/data/heroines';

const STEP = 1 / 60;
const MAX_SECONDS = 1200;

function play(worldId: string, heroineId: string, speed: 1 | 2): void {
  const heroine = getHeroine(heroineId);
  const worldDef = getWorld(worldId);
  const world = new World();
  let result = 'timeout';
  let pickTimer = 0;

  world.onRunEnd = (victory) => {
    result = victory ? 'victory' : 'defeat';
  };
  world.startRun(heroine, worldDef, NO_BONUS, bossMode ? worldDef.encounters.length - 1 : 0);
  world.clock.setScale(speed);

  for (let i = 0; i < prebuilt; i += 1) {
    const offers = rollUpgradeChoices(heroineId, world.owned, world.encounterIndex, world.rng, 3);
    if (offers[0]) world.chooseUpgrade(offers[0]);
  }
  if (bossMode) world.clock.setScale(speed);

  let lastEncounter = -1;
  let elapsed = 0;
  while (result === 'timeout' && elapsed < MAX_SECONDS) {
    world.update(STEP);
    elapsed += STEP;

    if (world.encounterIndex !== lastEncounter) {
      lastEncounter = world.encounterIndex;
      const enc = world.encounter;
      if (enc) {
        console.log(
          `  [${enc.kind.padEnd(8)}] ${String(world.encounterIndex + 1).padStart(2)}. ${enc.title} ` +
            `(hp ${Math.round(world.hero.hp)}/${world.hero.maxHp})`,
        );
      }
    }

    if (world.status === 'reward') {
      pickTimer += STEP;
      if (pickTimer > 0.1) {
        pickTimer = 0;
        const offers = rollUpgradeChoices(heroineId, world.owned, world.encounterIndex, world.rng, 3);
        const chosen = offers[0];
        if (chosen) world.chooseUpgrade(chosen);
        world.clock.resume();
      }
    }
  }

  const res = world.getResults(result === 'victory');
  const boss = world.enemies[0];
  const bossLine = boss
    ? ` · boss hp ${Math.round(boss.hp)}/${boss.maxHp} (${Math.round(boss.hpRatio * 100)}%)`
    : '';
  console.log(
    `  => ${result.toUpperCase()} at ${world.time.toFixed(1)}s · encounters ${res.encountersCleared}/10 · ` +
      `kills ${res.enemiesDefeated} · bosses ${res.bossesDefeated} · coins ${res.coins} · ` +
      `dealt ${res.damageDealt} taken ${res.damageTaken} · hp ${Math.round(world.hero.hp)}/${world.hero.maxHp}` +
      bossLine,
  );
  console.log(`     build: ${res.upgrades.join(', ') || 'none'}`);
}

const args = process.argv.slice(2);
const bossMode = args.includes('--boss');
const upgradesArg = args.find((arg) => arg.startsWith('--upgrades='));
const prebuilt = upgradesArg ? Number(upgradesArg.split('=')[1]) : 0;
const positional = args.filter((arg) => !arg.startsWith('--'));
const worldId = positional[0] ?? 'blossom';
const heroineId = positional[1] ?? 'yuzuki';
const speed = positional[2] === '2' ? 2 : 1;

if (args.includes('--all')) {
  for (const heroine of HEROINES) {
    console.log(`\n=== ${heroine.name} · ${getWorld('blossom').name} ===`);
    play('blossom', heroine.id, 2);
  }
} else {
  console.log(`=== ${getHeroine(heroineId).name} · ${getWorld(worldId).name} @ ${speed}x ===`);
  play(worldId, heroineId, speed);
}
