import './style.css';
import { sfx } from './audio/sfx';
import { getHeroine } from './data/heroines';
import { World } from './game/world';
import { loadAssets } from './render/assets';
import { Renderer } from './render/renderer';
import { Ui, bindCombatControls } from './ui/screens';

async function boot(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#game');
  if (!canvas) throw new Error('Missing game canvas');

  const assets = await loadAssets();
  const world = new World(getHeroine('yuzuki'));
  const renderer = new Renderer(canvas, assets);

  let paused = false;

  const ui = new Ui({
    onPlay: (heroineId) => beginRun(heroineId),
    onResume: () => setPaused(false),
    onRestart: () => beginRun(world.hero.def.id),
    onQuit: () => quitToTitle(),
    onToggleSpeed: () => toggleSpeed(),
    onTogglePause: () => setPaused(!paused),
    onToggleMute: () => {
      sfx.setMuted(!sfx.isMuted);
      ui.setMuted(sfx.isMuted);
    },
  });

  function beginRun(heroineId: string): void {
    const heroine = getHeroine(heroineId);
    if (heroine.locked) return;
    world.startRun(heroine);
    paused = false;
    ui.hideResults();
    ui.setPaused(false);
    ui.showCombat();
    ui.setSpeedLabel(world.clock.scale);
    ui.showBanner(`Stage ${world.stageIndex + 1}`, world.stageName, 2100);
    sfx.play('click');
  }

  function setPaused(next: boolean): void {
    if (world.status !== 'combat') return;
    if (next === paused) return;
    paused = next;
    if (next) world.clock.pause();
    else world.clock.resume();
    ui.setPaused(next);
    sfx.play('click');
  }

  function toggleSpeed(): void {
    const scale = world.clock.toggleScale();
    ui.setSpeedLabel(scale);
    sfx.play('click');
  }

  function quitToTitle(): void {
    world.status = 'idle';
    world.clock.pause();
    paused = false;
    ui.setPaused(false);
    ui.hideResults();
    ui.showTitle();
    sfx.play('click');
  }

  bindCombatControls({
    onSpeed: () => toggleSpeed(),
    onPause: () => setPaused(!paused),
  });

  window.addEventListener('keydown', (event) => {
    if (world.status !== 'combat') return;
    const key = event.key.toLowerCase();
    if (key === 'escape' || key === 'p') {
      event.preventDefault();
      setPaused(!paused);
    } else if (key === 't') {
      event.preventDefault();
      toggleSpeed();
    }
  });

  // Browsers only allow audio after a gesture; the first interaction unlocks the sound board.
  document.addEventListener('pointerdown', () => sfx.unlock(), { once: true });

  ui.setSpeedLabel(world.clock.scale);
  ui.setMuted(sfx.isMuted);
  ui.showTitle();
  ui.hideLoading();

  let last = performance.now();
  const frame = (now: number): void => {
    const delta = Math.min(0.1, (now - last) / 1000);
    last = now;
    world.update(delta);
    renderer.draw(world, now / 1000, delta);
    ui.updateHud(world.getHud());
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

void boot().catch((error: unknown) => {
  console.error(error);
  const loadingText = document.querySelector('.loading-text');
  if (loadingText) loadingText.textContent = 'Failed to load the meadow. Check the console.';
});
