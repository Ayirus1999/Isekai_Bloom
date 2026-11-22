import { HEROINES } from '../data/heroines';
import type { HudSnapshot } from '../game/world';
import type { HeroineDef } from '../game/types';

export interface UiCallbacks {
  onPlay: (heroineId: string) => void;
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
  onToggleSpeed: () => void;
  onTogglePause: () => void;
  onToggleMute: () => void;
}

export interface ResultsData {
  victory: boolean;
  stagesCleared: number;
  enemiesDefeated: number;
  bossesDefeated: number;
  damageDealt: number;
  duration: number;
}

function el<T extends Element>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Missing interface element: ${selector}`);
  return node;
}

/** Owns every DOM screen: title, roster, HUD, pause and results. */
export class Ui {
  private readonly titleScreen = el<HTMLElement>('#screen-title');
  private readonly rosterScreen = el<HTMLElement>('#screen-heroes');
  private readonly hud = el<HTMLElement>('#hud');
  private readonly pauseScreen = el<HTMLElement>('#screen-pause');
  private readonly resultsScreen = el<HTMLElement>('#screen-results');
  private readonly loading = el<HTMLElement>('#loading');
  private readonly heroGrid = el<HTMLElement>('#hero-grid');
  private readonly heroDetail = el<HTMLElement>('#hero-detail');
  private readonly heroDetailBody = el<HTMLElement>('#hero-detail-body');
  private readonly banner = el<HTMLElement>('#banner');
  private readonly bannerKicker = el<HTMLElement>('#banner-kicker');
  private readonly bannerTitle = el<HTMLElement>('#banner-title');
  private readonly bossBar = el<HTMLElement>('#boss-bar');
  private readonly bossName = el<HTMLElement>('#boss-name');
  private readonly bossFill = el<HTMLElement>('#boss-fill');
  private readonly bossPhase = el<HTMLElement>('#boss-phase');

  private readonly hudPortrait = el<HTMLImageElement>('#hud-portrait');
  private readonly hudHeroName = el<HTMLElement>('#hud-hero-name');
  private readonly hudHpFill = el<HTMLElement>('#hud-hp-fill');
  private readonly hudHpText = el<HTMLElement>('#hud-hp-text');
  private readonly hudBuffRow = el<HTMLElement>('#hud-buffs');
  private readonly hudStageLabel = el<HTMLElement>('#hud-stage-label');
  private readonly hudStageName = el<HTMLElement>('#hud-stage-name');
  private readonly hudStageFill = el<HTMLElement>('#hud-stage-fill');
  private readonly hudProgressText = el<HTMLElement>('#hud-progress-text');
  private readonly speedButton = el<HTMLElement>('#btn-speed');
  private readonly speedLabel = el<HTMLElement>('#speed-label');
  private readonly muteLabel = el<HTMLElement>('#mute-label');

  private bannerTimer = 0;

  constructor(private readonly callbacks: UiCallbacks) {
    this.renderRoster();
    document.addEventListener('click', (event) => this.handleClick(event));
  }

  hideLoading(): void {
    this.loading.classList.add('is-hidden');
  }

  showTitle(): void {
    this.setScreen('title');
    this.pauseScreen.classList.add('is-hidden');
    this.resultsScreen.classList.add('is-hidden');
    this.bossBar.classList.add('is-hidden');
  }

  showRoster(): void {
    this.setScreen('roster');
    this.heroDetail.classList.add('is-hidden');
  }

  showCombat(): void {
    this.heroDetail.classList.add('is-hidden');
    this.setScreen('combat');
  }

  setPaused(paused: boolean): void {
    this.pauseScreen.classList.toggle('is-hidden', !paused);
  }

  setSpeedLabel(scale: 1 | 2): void {
    this.speedLabel.textContent = `${scale}×`;
    this.speedButton.classList.toggle('is-fast', scale === 2);
    this.speedButton.setAttribute('aria-pressed', String(scale === 2));
  }

  setMuted(muted: boolean): void {
    this.muteLabel.textContent = muted ? 'Sound: Off' : 'Sound: On';
  }

  showBanner(kicker: string, title: string, durationMs = 1800): void {
    this.bannerKicker.textContent = kicker;
    this.bannerTitle.textContent = title;
    this.banner.classList.remove('is-hidden');
    window.clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => this.banner.classList.add('is-hidden'), durationMs);
  }

  showResults(data: ResultsData): void {
    el<HTMLElement>('#results-kicker').textContent = data.victory ? 'Run complete' : 'The petals fall';
    el<HTMLElement>('#results-title').textContent = data.victory ? 'Victory' : 'Defeated';
    el<HTMLElement>('#results-subtitle').textContent = data.victory
      ? 'The rift closes. Asteria breathes again.'
      : 'Yuzuki falls — but the stars remember.';

    const rows: Array<[string, string]> = [
      ['Stages Cleared', `${data.stagesCleared} / 10`],
      ['Enemies Defeated', String(data.enemiesDefeated)],
      ['Bosses Felled', String(data.bossesDefeated)],
      ['Damage Dealt', Math.round(data.damageDealt).toLocaleString('en-US')],
      ['Run Time', formatDuration(data.duration)],
    ];
    el<HTMLElement>('#results-stats').innerHTML = rows
      .map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`)
      .join('');

    this.hud.classList.add('is-hidden');
    this.bossBar.classList.add('is-hidden');
    this.resultsScreen.classList.remove('is-hidden');
  }

  hideResults(): void {
    this.resultsScreen.classList.add('is-hidden');
  }

  updateHud(hud: HudSnapshot): void {
    this.hudPortrait.src = this.heroPortrait;
    this.hudHeroName.textContent = hud.heroineName;
    this.hudHpFill.style.width = `${(hud.hpRatio * 100).toFixed(1)}%`;
    this.hudHpFill.classList.toggle('is-low', hud.hpRatio <= 0.3);
    this.hudHpText.textContent = `${hud.hp} / ${hud.maxHp}`;
    this.hudStageLabel.textContent = `Stage ${hud.stageNumber} / ${hud.stageCount}`;
    this.hudStageName.textContent = hud.stageName;
    this.hudStageFill.style.width = `${(hud.progress * 100).toFixed(1)}%`;
    this.hudProgressText.textContent = hud.progressLabel;

    if (hud.empowered) {
      this.hudBuffRow.innerHTML = '<span class="buff-pill">Celestial Awakening</span>';
    } else if (this.hudBuffRow.childElementCount > 0) {
      this.hudBuffRow.replaceChildren();
    }

    if (hud.boss) {
      this.bossBar.classList.remove('is-hidden');
      this.bossName.textContent = hud.boss.name;
      this.bossFill.style.width = `${(hud.boss.hpRatio * 100).toFixed(1)}%`;
      this.bossPhase.textContent = `Phase ${hud.boss.phase === 1 ? 'I' : 'II'}`;
    } else {
      this.bossBar.classList.add('is-hidden');
    }
  }

  private heroPortrait = HEROINES[0]?.portrait ?? '';

  private setScreen(screen: 'title' | 'roster' | 'combat'): void {
    this.titleScreen.classList.toggle('is-hidden', screen !== 'title');
    this.rosterScreen.classList.toggle('is-hidden', screen !== 'roster');
    this.hud.classList.toggle('is-hidden', screen !== 'combat');
  }

  private renderRoster(): void {
    this.heroGrid.innerHTML = HEROINES.map((heroine) => this.heroCard(heroine)).join('');
  }

  private heroCard(heroine: HeroineDef): string {
    const locked = heroine.locked ? ' is-locked' : '';
    const disabled = heroine.locked ? ' disabled' : '';
    const art = heroine.locked
      ? `<div class="hero-card-art"><div class="lock-plate">${heroine.unlockHint}</div></div>`
      : `<div class="hero-card-art"><img src="${heroine.portrait}" alt="${heroine.name}" loading="lazy" /></div>`;
    return `
      <button class="hero-card${locked}" type="button" data-hero-id="${heroine.id}"${disabled}>
        ${art}
        <span class="hero-card-body">
          <span class="hero-card-name">${heroine.name}</span>
          <span class="hero-card-title">${heroine.title}</span>
          <span class="hero-card-role">${heroine.elementName} · ${heroine.role}</span>
        </span>
      </button>`;
  }

  private showHeroDetail(heroineId: string): void {
    const heroine = HEROINES.find((entry) => entry.id === heroineId);
    if (!heroine || heroine.locked) return;
    this.heroPortrait = heroine.portrait;

    const abilities = heroine.abilities
      .map(
        (ability) => `
        <div class="ability-row">
          <div class="ability-name">${ability.name}</div>
          <div class="ability-desc">${ability.description}</div>
        </div>`,
      )
      .join('');

    this.heroDetailBody.innerHTML = `
      <div class="detail-portrait"><img src="${heroine.portrait}" alt="${heroine.name}" /></div>
      <div class="detail-copy">
        <p class="eyebrow">${heroine.jp} · Age ${heroine.age}</p>
        <h3 class="detail-name">${heroine.name}</h3>
        <p class="detail-title">${heroine.title}</p>
        <div class="detail-tags">
          <span class="tag">${heroine.elementName}</span>
          <span class="tag">${heroine.role}</span>
          <span class="tag">${heroine.weapon}</span>
        </div>
        <p class="detail-lore">${heroine.lore}</p>
        <div class="detail-hero-stats">
          <span class="stat-chip">ATK <strong>${heroine.stats.attack}</strong></span>
          <span class="stat-chip">SPD <strong>${heroine.stats.attackSpeed.toFixed(2)}</strong></span>
          <span class="stat-chip">HP <strong>${heroine.stats.maxHp}</strong></span>
          <span class="stat-chip">CRIT <strong>${Math.round(heroine.stats.critChance * 100)}%</strong></span>
          <span class="stat-chip">DEF <strong>${heroine.stats.defense}</strong></span>
          <span class="stat-chip">RNG <strong>${heroine.stats.range}</strong></span>
        </div>
        <div class="detail-abilities">${abilities}</div>
        <div class="menu">
          <button class="btn primary" type="button" data-action="play-hero" data-hero-id="${heroine.id}">
            Play as ${heroine.name.split(' ')[0]}
          </button>
        </div>
      </div>`;
    this.heroDetail.classList.remove('is-hidden');
  }

  private handleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const actionEl = target.closest<HTMLElement>('[data-action]');
    if (actionEl) {
      this.handleAction(actionEl.dataset.action ?? '', actionEl);
      return;
    }

    const card = target.closest<HTMLElement>('.hero-card');
    if (card?.dataset.heroId && !card.classList.contains('is-locked')) {
      this.showHeroDetail(card.dataset.heroId);
    }
  }

  private handleAction(action: string, source: HTMLElement): void {
    switch (action) {
      case 'play':
        this.callbacks.onPlay(HEROINES[0]!.id);
        break;
      case 'play-hero': {
        const id = source.dataset.heroId;
        if (id) this.callbacks.onPlay(id);
        break;
      }
      case 'heroes':
        this.showRoster();
        break;
      case 'back':
        this.showTitle();
        break;
      case 'close-detail':
        this.heroDetail.classList.add('is-hidden');
        break;
      case 'resume':
        this.callbacks.onResume();
        break;
      case 'restart':
        this.callbacks.onRestart();
        break;
      case 'retry':
        this.callbacks.onRestart();
        break;
      case 'quit':
        this.callbacks.onQuit();
        break;
      case 'mute':
        this.callbacks.onToggleMute();
        break;
      default:
        break;
    }
  }
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}

export function bindCombatControls(callbacks: {
  onSpeed: () => void;
  onPause: () => void;
}): void {
  el<HTMLElement>('#btn-speed').addEventListener('click', callbacks.onSpeed);
  el<HTMLElement>('#btn-pause').addEventListener('click', callbacks.onPause);
}
