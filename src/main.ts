import './style.css';
import { sfx } from './audio/sfx';
import { getHeroine } from './data/heroines';
import { UPGRADES } from './data/upgrades';
import { getWorld } from './data/worlds';
import { grantAchievement, loadSave, permanentBonuses, persist, recordRun, unlockHeroine, unlockWorld, buyPermanent } from './game/save';
import { rollUpgradeChoices } from './game/upgrades';
import { World } from './game/world';
import type { HeroineId, WorldId } from './game/types';
import { Renderer } from './render/renderer';
import { Ui } from './ui/screens';

async function boot(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#game');
  if (!canvas) throw new Error('Missing game canvas');

  const save = loadSave();
  sfx.setMuted(save.settings.muted);

  const world = new World();
  const renderer = new Renderer(canvas);
  let paused = false;
  let selectedWorld = 'blossom';
  let selectedHeroine = 'yuzuki';

  const ui = new Ui({
    onPlay: () => {
      sfx.play('click');
      ui.showWorlds(save);
    },
    onHeroines: () => {
      sfx.play('click');
      ui.showHeroes(selectedWorld, save);
    },
    onSanctum: () => {
      sfx.play('click');
      ui.showSanctum(save);
    },
    onBackTitle: () => ui.showTitle(),
    onBackWorlds: () => ui.showWorlds(save),
    onWorldChosen: (worldId) => {
      selectedWorld = worldId;
      sfx.play('click');
      ui.showHeroes(worldId, save);
    },
    onStart: (worldId, heroineId) => startRun(worldId, heroineId),
    onPickUpgrade: (id) => pickUpgrade(id),
    onRetry: () => startRun(selectedWorld, selectedHeroine),
    onRestart: () => startRun(selectedWorld, selectedHeroine),
    onQuit: () => quitToTitle(),
    onResume: () => setPaused(false),
    onToggleSpeed: () => toggleSpeed(),
    onTogglePause: () => setPaused(!paused),
    onToggleMute: () => {
      sfx.setMuted(!sfx.isMuted);
      save.settings.muted = sfx.isMuted;
      persist(save);
      ui.setMuted(sfx.isMuted);
    },
    onBuyPermanent: (id) => {
      if (buyPermanent(save, id)) {
        sfx.play('buff');
        ui.showSanctum(save);
      }
    },
    onUnlockHeroine: (id) => {
      if (unlockHeroine(save, id as HeroineId)) {
        sfx.play('buff');
        ui.showHeroes(selectedWorld, save);
        ui.openHeroDetail(id, save);
      }
    },
    onUnlockWorld: (id) => {
      if (unlockWorld(save, id as WorldId)) {
        sfx.play('buff');
        ui.showWorlds(save);
      }
    },
  });

  world.onEncounterStart = (encounter, index) => {
    ui.banner(
      `Encounter ${index + 1} of ${world.encounterCount}`,
      `${encounter.title} · ${encounter.subtitle}`,
      2000,
    );
  };
  world.onBossSpawn = (name) => {
    ui.banner('Rift guardian', name, 2400);
    world.cinematic = 1.1;
    sfx.play('boss');
  };
  world.onBossPhase = (name) => {
    ui.banner('Second phase', name, 1700);
    sfx.play('boss');
  };
  world.onReward = (encounter, index) => {
    const offers = rollUpgradeChoices(world.hero.def.id, world.owned, index, world.rng, 3);
    ui.showUpgrades(offers, `${encounter.title} — ${encounter.subtitle}`);
  };
  world.onRunEnd = (victory) => {
    const results = world.getResults(victory);
    save.settings.speed = world.clock.scale;
    const newAchievements = recordRun(save, {
      victory,
      coins: results.coins,
      enemiesDefeated: results.enemiesDefeated,
      bossesDefeated: results.bossesDefeated,
      bestEncounter: results.encountersCleared,
    });
    persist(save);
    ui.showResults({ ...results, totalCoins: save.coins, newAchievements });
    sfx.play(victory ? 'clear' : 'death');
  };

  function startRun(worldId: string, heroineId: string): void {
    const heroine = getHeroine(heroineId);
    const worldDef = getWorld(worldId);
    selectedWorld = worldId;
    selectedHeroine = heroineId;
    paused = false;
    ui.setHeroine(heroine);
    ui.showCombat();
    ui.setSpeed(save.settings.speed);
    world.startRun(heroine, worldDef, permanentBonuses(save));
    world.clock.setScale(save.settings.speed);
    sfx.play('click');
  }

  function pickUpgrade(id: string): void {
    const def = UPGRADES.find((entry) => entry.id === id);
    if (!def || world.status !== 'reward') return;
    world.chooseUpgrade(def);
    if (def.evolved && grantAchievement(save, 'evolved')) persist(save);
    ui.setHeroine(world.hero.def);
    ui.setSpeed(world.clock.scale);
    if (world.status !== 'reward') {
      ui.showCombat();
      world.clock.resume();
    }
    sfx.play('buff');
  }

  function setPaused(next: boolean): void {
    if (world.status !== 'combat' && world.status !== 'clearing') return;
    paused = next;
    if (next) world.clock.pause();
    else world.clock.resume();
    ui.setPaused(next);
    sfx.play('click');
  }

  function toggleSpeed(): void {
    const scale = world.clock.toggleScale();
    save.settings.speed = scale;
    persist(save);
    ui.setSpeed(scale);
    sfx.play('click');
  }

  function quitToTitle(): void {
    world.status = 'idle';
    world.clock.pause();
    paused = false;
    ui.setPaused(false);
    ui.showTitle();
    sfx.play('click');
  }

  document.addEventListener('pointerdown', () => sfx.unlock(), { once: true });

  window.addEventListener('keydown', (event) => {
    if (world.status !== 'combat' && world.status !== 'clearing') return;
    const key = event.key.toLowerCase();
    if (key === 'escape' || key === 'p') {
      event.preventDefault();
      setPaused(!paused);
    } else if (key === 't') {
      event.preventDefault();
      toggleSpeed();
    }
  });

  window.addEventListener('beforeunload', () => {
    save.settings.speed = world.clock.scale;
    persist(save);
  });

  // Dispose of the dev handle when a hot reload replaces the module.
  if (import.meta.env.DEV) {
    (window as Window & { __hnh?: { world: World; save: typeof save } }).__hnh = { world, save };
  }

  ui.setSpeed(save.settings.speed === 2 ? 2 : 1);
  ui.setMuted(sfx.isMuted);
  ui.paintTitleArt(getHeroine('yuzuki'));
  ui.showTitle();
  ui.hideLoading();

  let last = performance.now();
  const frame = (now: number): void => {
    const delta = Math.min(0.1, (now - last) / 1000);
    last = now;
    world.update(delta);
    renderer.draw(world, now / 1000, delta);
    if (world.status !== 'idle') ui.updateHud(world.getHud());
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

}

void boot().catch((error: unknown) => {
  console.error(error);
  const loadingText = document.querySelector('.loading-text');
  if (loadingText) loadingText.textContent = 'Failed to gather the petals. Check the console.';
});
