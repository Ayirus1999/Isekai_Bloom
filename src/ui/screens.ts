import { HEROINES } from '../data/heroines';
import { RARITY_COLORS } from '../data/upgrades';
import { ACHIEVEMENTS, PERMANENT_UPGRADES, permanentCost, permanentLevel } from '../game/save';
import { getWorld, WORLDS } from '../data/worlds';
import type { HeroineDef, SaveData, UpgradeDef, WorldDef } from '../game/types';
import type { HudSnapshot, RunResults } from '../game/world';
import { paintHeroinePortrait } from '../render/hero';

export interface UiCallbacks {
  onPlay(): void;
  onHeroines(): void;
  onSanctum(): void;
  onBackTitle(): void;
  onBackWorlds(): void;
  onWorldChosen(worldId: string): void;
  onStart(worldId: string, heroineId: string): void;
  onPickUpgrade(id: string): void;
  onRetry(): void;
  onQuit(): void;
  onRestart(): void;
  onResume(): void;
  onToggleSpeed(): void;
  onTogglePause(): void;
  onToggleMute(): void;
  onBuyPermanent(id: string): void;
  onUnlockHeroine(id: string): void;
  onUnlockWorld(id: string): void;
}

export interface ResultsView extends RunResults {
  totalCoins: number;
  newAchievements: string[];
}

type ScreenName = 'title' | 'worlds' | 'heroes' | 'upgrades' | 'results' | 'pause' | 'sanctum';

const ABILITY_GLYPH: Record<string, string> = {
  offense: '⚔',
  defense: '✧',
  magic: '✦',
  special: '★',
};

function el<T extends HTMLElement>(id: string): T {
  const node = document.querySelector<T>(`#${id}`);
  if (!node) throw new Error(`Missing interface element: #${id}`);
  return node;
}

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Owns every DOM screen. The canvas is the stage; all decision points live here. */
export class Ui {
  private readonly screens: Record<ScreenName, HTMLElement> = {
    title: el('screen-title'),
    worlds: el('screen-worlds'),
    heroes: el('screen-heroes'),
    upgrades: el('screen-upgrades'),
    results: el('screen-results'),
    pause: el('screen-pause'),
    sanctum: el('screen-sanctum'),
  };

  private readonly hud = el('hud');
  private readonly loading = el('loading');
  private readonly bannerEl = el('banner');
  private readonly bannerKicker = el('banner-kicker');
  private readonly bannerTitle = el('banner-title');

  private readonly heroGrid = el('hero-grid');
  private readonly worldGrid = el('world-grid');
  private readonly heroDetail = el('hero-detail');
  private readonly detailCopy = el('detail-copy');
  private readonly detailArt = document.querySelector<HTMLCanvasElement>('#detail-art');
  private readonly upgradeCards = el('upgrade-cards');
  private readonly upgradeKicker = el('upgrade-kicker');
  private readonly upgradeSubtitle = el('upgrade-subtitle');
  private readonly sanctumList = el('sanctum-list');
  private readonly achievements = el('achievements');

  private readonly hudPortrait = document.querySelector<HTMLCanvasElement>('#hud-portrait');
  private readonly hudHeroName = el('hud-hero-name');
  private readonly hudHpFill = el('hud-hp-fill');
  private readonly hudHpText = el('hud-hp-text');
  private readonly hudChips = el('hud-chips');
  private readonly hudEncounter = el('hud-encounter');
  private readonly hudEncounterTitle = el('hud-encounter-title');
  private readonly hudProgressFill = el('hud-progress-fill');
  private readonly hudProgressLabel = el('hud-progress-label');
  private readonly hudCoins = el('hud-coins');
  private readonly upgradeChips = el('upgrade-chips');
  private readonly bossBar = el('boss-bar');
  private readonly bossName = el('boss-name');
  private readonly bossFill = el('boss-fill');
  private readonly bossPhase = el('boss-phase');
  private readonly speedLabel = el('speed-label');
  private readonly speedButton = el('btn-speed');
  private readonly muteLabel = el('mute-label');

  private readonly coinsByScreen = {
    worlds: el('world-coins'),
    heroes: el('hero-coins'),
    sanctum: el('sanctum-coins'),
  };

  private selectedWorldId = 'blossom';
  private lastSave: SaveData | null = null;
  private bannerTimer = 0;
  private hudCache = '';

  constructor(private readonly callbacks: UiCallbacks) {
    document.addEventListener('click', (event) => this.handleClick(event));
    el('btn-speed').addEventListener('click', () => this.callbacks.onToggleSpeed());
    el('btn-pause').addEventListener('click', () => this.callbacks.onTogglePause());
  }

  // ------------------------------------------------------------------ screens

  private show(name: ScreenName): void {
    for (const key of Object.keys(this.screens) as ScreenName[]) {
      this.screens[key].classList.toggle('is-hidden', key !== name);
    }
  }

  hideLoading(): void {
    this.loading.classList.add('is-hidden');
  }

  showTitle(): void {
    this.show('title');
    this.hud.classList.add('is-hidden');
    this.heroDetail.classList.add('is-hidden');
    this.screens.pause.classList.add('is-hidden');
    this.bannerEl.classList.add('is-hidden');
  }

  showCombat(): void {
    for (const key of Object.keys(this.screens) as ScreenName[]) {
      this.screens[key].classList.add('is-hidden');
    }
    this.hud.classList.remove('is-hidden');
    this.screens.pause.classList.add('is-hidden');
    this.screens.upgrades.classList.add('is-hidden');
    this.screens.results.classList.add('is-hidden');
  }

  showWorlds(save: SaveData): void {
    this.lastSave = save;
    this.show('worlds');
    this.hud.classList.add('is-hidden');
    this.renderWorlds(save);
    this.setCoins(save.coins);
  }

  showHeroes(worldId: string, save: SaveData): void {
    this.selectedWorldId = worldId;
    this.lastSave = save;
    this.show('heroes');
    this.hud.classList.add('is-hidden');
    this.heroDetail.classList.add('is-hidden');
    const world = getWorld(worldId);
    el('heroes-world-label').textContent = `${world.name} · ${world.encounters.length} encounters`;
    this.renderHeroes(save);
    this.setCoins(save.coins);
  }

  openHeroDetail(id: string, save?: SaveData): void {
    const heroine = HEROINES.find((entry) => entry.id === id);
    if (!heroine) return;
    if (save) this.lastSave = save;
    const unlocked = this.lastSave?.unlockedHeroines.includes(heroine.id) ?? heroine.id === 'yuzuki';
    const coins = this.lastSave?.coins ?? 0;
    const cost = heroine.unlockCost;

    const abilities = heroine.abilities
      .map(
        (ability) =>
          `<div class="ability-row"><b>${ability.name}${ability.ultimate ? ' · Ultimate' : ''}</b>${ability.description}</div>`,
      )
      .join('');

    this.detailCopy.innerHTML = `
      <p class="kicker">Age ${heroine.age} · ${heroine.elementName} · ${heroine.role}</p>
      <h2>${heroine.name}</h2>
      <p class="detail-title">${heroine.title} · ${heroine.jp}</p>
      <p class="lore">${heroine.lore}</p>
      <p class="lore">${heroine.personality}</p>
      <div class="detail-stats">
        <span>Health <b>${heroine.stats.maxHp}</b></span>
        <span>Attack <b>${heroine.stats.attack}</b></span>
        <span>Speed <b>${heroine.stats.attackSpeed.toFixed(2)}/s</b></span>
        <span>Critical <b>${Math.round(heroine.stats.critChance * 100)}%</b></span>
        <span>Defence <b>${heroine.stats.defense}</b></span>
        <span>Weapon <b>${heroine.weaponName}</b></span>
      </div>
      <div class="ability-list">${abilities}</div>
      <div class="menu">
        ${
          unlocked
            ? `<button class="btn primary" type="button" data-start-hero="${heroine.id}">Fight with ${heroine.name.split(' ')[0]}</button>`
            : `<button class="btn primary" type="button" data-unlock-hero="${heroine.id}" ${
                coins < cost ? 'disabled' : ''
              }>Recruit · ${cost} ✦</button>`
        }
        <button class="btn ghost" type="button" data-action="close-detail">Back to roster</button>
      </div>
    `;
    if (this.detailArt) {
      this.detailArt.style.setProperty('--hero-accent', heroine.palette.accent);
      paintHeroinePortrait(this.detailArt, heroine, 300, 380);
    }
    this.heroDetail.classList.remove('is-hidden');
  }

  showUpgrades(offers: UpgradeDef[], subtitle: string): void {
    this.show('upgrades');
    this.hud.classList.add('is-hidden');
    this.upgradeKicker.textContent = 'The rift yields a Star Petal';
    this.upgradeSubtitle.textContent = subtitle;
    this.upgradeCards.innerHTML = offers
      .map((def) => {
        const rarity = RARITY_COLORS[def.rarity];
        return `
          <button class="upgrade-card" type="button" data-upgrade="${def.id}" style="--rarity:${rarity.accent}">
            <span class="upgrade-top">
              <span class="upgrade-icon">${ABILITY_GLYPH[def.category] ?? '✦'}</span>
              <span>
                <span class="upgrade-rarity">${rarity.label}</span>
                <span class="upgrade-name">${def.name}</span>
              </span>
            </span>
            <span class="upgrade-effect">${def.effectLabel}</span>
            <span class="upgrade-desc">${def.description}</span>
            <span class="upgrade-badges">
              ${def.heroine ? '<span class="badge">Guardian only</span>' : ''}
              ${def.evolved ? '<span class="badge evolved">Evolved</span>' : ''}
              <span class="badge">${def.category}</span>
            </span>
          </button>`;
      })
      .join('');
  }

  showResults(data: ResultsView): void {
    this.show('results');
    this.hud.classList.add('is-hidden');
    el('results-kicker').textContent = data.victory ? 'Adventure complete' : 'The petals fall';
    el('results-title').textContent = data.victory ? 'Victory' : 'Defeated';
    el('results-subtitle').textContent = `${data.heroine} · ${data.world}`;

    const rows: Array<[string, string]> = [
      ['Encounters', `${data.encountersCleared} / 10`],
      ['Enemies', `${data.enemiesDefeated}`],
      ['Guardians', `${data.bossesDefeated}`],
      ['Damage dealt', data.damageDealt.toLocaleString()],
      ['Damage taken', data.damageTaken.toLocaleString()],
      ['Time', formatDuration(data.duration)],
    ];
    el('results-stats').innerHTML = rows
      .map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`)
      .join('');
    el('results-coins').textContent = `✦ ${data.coins} Astral Coins earned · ${data.totalCoins} total`;
    el('results-upgrades').textContent =
      data.upgrades.length > 0 ? `Build: ${data.upgrades.join(' · ')}` : 'No Star Petals gathered.';
    const names = data.newAchievements
      .map((id) => ACHIEVEMENTS.find((entry) => entry.id === id)?.name)
      .filter(Boolean);
    el('results-achievements').textContent = names.length > 0 ? `New achievement: ${names.join(', ')}` : '';
  }

  setPaused(paused: boolean): void {
    this.screens.pause.classList.toggle('is-hidden', !paused);
  }

  showSanctum(save: SaveData): void {
    this.lastSave = save;
    this.show('sanctum');
    this.hud.classList.add('is-hidden');
    this.setCoins(save.coins);

    this.sanctumList.innerHTML = PERMANENT_UPGRADES.map((upgrade) => {
      const level = permanentLevel(save, upgrade.id);
      const maxed = level >= upgrade.maxLevel;
      const cost = permanentCost(upgrade, level);
      const affordable = save.coins >= cost;
      return `
        <div class="sanctum-row">
          <span class="sanctum-copy">
            <b>${upgrade.name}</b>
            <span class="muted">${upgrade.description}</span>
            <span class="muted">Level ${level} / ${upgrade.maxLevel}</span>
          </span>
          <button class="btn small" type="button" data-buy="${upgrade.id}" ${
            maxed || !affordable ? 'disabled' : ''
          }>${maxed ? 'Max' : `${cost} ✦`}</button>
        </div>`;
    }).join('');

    this.achievements.innerHTML = ACHIEVEMENTS.map((achievement) => {
      const unlocked = save.achievements.includes(achievement.id);
      return `<div class="achievement ${unlocked ? 'unlocked' : ''}"><b>${unlocked ? '✦ ' : ''}${
        achievement.name
      }</b>${achievement.description}</div>`;
    }).join('');
  }

  // ------------------------------------------------------------------ renders

  private setCoins(coins: number): void {
    this.coinsByScreen.worlds.textContent = `${coins} Astral`;
    this.coinsByScreen.heroes.textContent = `${coins} Astral`;
    this.coinsByScreen.sanctum.textContent = `${coins} Astral`;
  }

  private renderWorlds(save: SaveData): void {
    this.worldGrid.innerHTML = '';
    for (const world of WORLDS) {
      const unlocked = save.unlockedWorlds.includes(world.id);
      const card = document.createElement('div');
      card.className = `world-card ${unlocked ? '' : 'locked'}`;
      card.style.setProperty('--world-accent', world.accent);
      card.innerHTML = `
        <span class="world-jp">${world.jp}</span>
        <span class="world-name">${world.name}</span>
        <span class="world-meta">${world.subtitle}</span>
        <span class="world-meta">${world.encounters.length} encounters · final guardian ${getWorldBossName(world)}</span>
        <span class="lock-row">
          ${
            unlocked
              ? `<button class="btn small" type="button" data-world="${world.id}">Enter rift</button>`
              : `<span class="world-boss">Locked</span><button class="btn small" type="button" data-unlock-world="${world.id}" ${
                  save.coins < world.unlockCost ? 'disabled' : ''
                }>Unlock · ${world.unlockCost} ✦</button>`
          }
        </span>`;
      this.worldGrid.appendChild(card);
    }
  }

  private renderHeroes(save: SaveData): void {
    this.heroGrid.innerHTML = '';
    for (const heroine of HEROINES) {
      const unlocked = save.unlockedHeroines.includes(heroine.id);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `hero-card ${unlocked ? '' : 'locked'}`;
      card.dataset.hero = heroine.id;
      card.style.setProperty('--hero-glow', heroine.palette.glow);
      card.innerHTML = `
        <canvas aria-hidden="true"></canvas>
        ${unlocked ? '' : `<span class="lock-badge">${heroine.unlockCost} ✦</span>`}
        <span class="hero-card-body">
          <span class="hero-card-name">${heroine.name}</span>
          <span class="hero-card-title">${heroine.title}</span>
          <span class="hero-card-tags">
            <span class="tag element" style="--element-color:${heroine.palette.accent}44">${heroine.elementName}</span>
            <span class="tag">${heroine.role.split(' /')[0]}</span>
          </span>
        </span>`;
      this.heroGrid.appendChild(card);
      const canvas = card.querySelector('canvas');
      if (canvas) paintHeroinePortrait(canvas, heroine, 220, 260);
    }
  }

  // ------------------------------------------------------------------ HUD

  setHeroine(def: HeroineDef): void {
    this.hudHeroName.textContent = def.name;
    if (this.hudPortrait) paintHeroinePortrait(this.hudPortrait, def, 100, 124);
    this.hudCache = '';
  }

  setSpeed(scale: 1 | 2): void {
    this.speedLabel.textContent = `${scale}×`;
    this.speedButton.classList.toggle('fast', scale === 2);
    this.speedButton.setAttribute('aria-pressed', String(scale === 2));
  }

  setMuted(muted: boolean): void {
    this.muteLabel.textContent = muted ? 'Sound: Off' : 'Sound: On';
  }

  banner(kicker: string, title: string, durationMs = 1900): void {
    this.bannerKicker.textContent = kicker;
    this.bannerTitle.textContent = title;
    this.bannerEl.classList.remove('is-hidden');
    window.clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => this.bannerEl.classList.add('is-hidden'), durationMs);
  }

  updateHud(hud: HudSnapshot): void {
    const key = [
      hud.hp,
      hud.maxHp,
      hud.encounterNumber,
      hud.progress,
      hud.coins,
      hud.boss?.hpRatio ?? -1,
      hud.empowered,
      hud.shield,
      hud.upgrades.length,
    ].join('|');
    if (key === this.hudCache) return;
    this.hudCache = key;

    const pct = Math.round(hud.hpRatio * 100);
    this.hudHpFill.style.width = `${pct}%`;
    this.hudHpFill.classList.toggle('low', hud.hpRatio <= 0.3);
    this.hudHpText.textContent = `${hud.hp} / ${hud.maxHp}`;
    this.hudEncounter.textContent = `Encounter ${hud.encounterNumber} / ${hud.encounterCount}`;
    this.hudEncounterTitle.textContent = hud.encounterTitle;
    this.hudProgressFill.style.width = `${Math.round(hud.progress * 100)}%`;
    this.hudProgressLabel.textContent = hud.progressLabel;
    this.hudCoins.textContent = `${hud.coins}`;

    const chips: string[] = [];
    if (hud.empowered) chips.push('<span class="chip gold">Empowered</span>');
    if (hud.shield > 1) chips.push(`<span class="chip">Shield ${Math.round(hud.shield)}</span>`);
    this.hudChips.innerHTML = chips.join('');

    const recent = hud.upgrades.slice(-4).reverse();
    this.upgradeChips.innerHTML = recent.map((name) => `<span class="chip">${name}</span>`).join('');

    this.bossBar.classList.toggle('is-hidden', !hud.boss);
    if (hud.boss) {
      this.bossName.textContent = hud.boss.name;
      this.bossFill.style.width = `${Math.round(hud.boss.hpRatio * 100)}%`;
      this.bossPhase.textContent = hud.boss.phase === 2 ? 'Phase II' : 'Phase I';
    }
  }

  paintTitleArt(def: HeroineDef): void {
    const canvas = document.querySelector<HTMLCanvasElement>('#title-art');
    // Extra canvas width keeps the katana and hair inside the frame when the art is scaled down.
    if (canvas) paintHeroinePortrait(canvas, def, 560, 640);
  }

  // ------------------------------------------------------------------ events

  private handleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const upgrade = target.closest<HTMLElement>('[data-upgrade]');
    if (upgrade?.dataset.upgrade) {
      this.callbacks.onPickUpgrade(upgrade.dataset.upgrade);
      return;
    }

    const hero = target.closest<HTMLElement>('[data-hero]');
    if (hero?.dataset.hero) {
      this.openHeroDetail(hero.dataset.hero);
      return;
    }

    const start = target.closest<HTMLElement>('[data-start-hero]');
    if (start?.dataset.startHero) {
      this.callbacks.onStart(this.selectedWorldId, start.dataset.startHero);
      return;
    }

    const unlockHero = target.closest<HTMLElement>('[data-unlock-hero]');
    if (unlockHero?.dataset.unlockHero) {
      this.callbacks.onUnlockHeroine(unlockHero.dataset.unlockHero);
      return;
    }

    const world = target.closest<HTMLElement>('[data-world]');
    if (world?.dataset.world) {
      this.callbacks.onWorldChosen(world.dataset.world);
      return;
    }

    const unlockWorld = target.closest<HTMLElement>('[data-unlock-world]');
    if (unlockWorld?.dataset.unlockWorld) {
      this.callbacks.onUnlockWorld(unlockWorld.dataset.unlockWorld);
      return;
    }

    const buy = target.closest<HTMLElement>('[data-buy]');
    if (buy?.dataset.buy) {
      this.callbacks.onBuyPermanent(buy.dataset.buy);
      return;
    }

    const action = target.closest<HTMLElement>('[data-action]');
    if (!action?.dataset.action) return;
    switch (action.dataset.action) {
      case 'play':
        this.callbacks.onPlay();
        break;
      case 'heroines':
        this.callbacks.onHeroines();
        break;
      case 'sanctum':
        this.callbacks.onSanctum();
        break;
      case 'back-title':
        this.callbacks.onBackTitle();
        break;
      case 'back-worlds':
        this.callbacks.onBackWorlds();
        break;
      case 'close-detail':
        this.heroDetail.classList.add('is-hidden');
        break;
      case 'retry':
        this.callbacks.onRetry();
        break;
      case 'quit':
        this.callbacks.onQuit();
        break;
      case 'restart':
        this.callbacks.onRestart();
        break;
      case 'resume':
        this.callbacks.onResume();
        break;
      case 'mute':
        this.callbacks.onToggleMute();
        break;
      default:
        break;
    }
  }
}

function getWorldBossName(world: WorldDef): string {
  const boss = world.bossId;
  return boss
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

// Re-exported so main can keep a running reference without importing the data module twice.
export { HEROINES };
