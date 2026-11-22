import { getStage, type StageDef, type WaveSpec } from '../data/stages';
import type { World } from './world';

/** Seconds a due wave may wait for the arena to clear before it arrives anyway. */
const WAVE_GRACE_SECONDS = 18;

/** Fraction of maximum health restored each time a wave is cleared inside a stage. */
const WAVE_CLEAR_HEAL = 0.2;

/**
 * Runs one stage: spawns its waves on the simulation clock and reports when every enemy is gone.
 * The world owns the transition to the next stage.
 */
export class StageRunner {
  readonly stage: StageDef;
  readonly totalEnemies: number;

  time = 0;
  waveCursor = 0;
  defeated = 0;
  clearTimer = 0;
  private lastSpawnTime = 0;
  private clearRewardPending = false;
  state: 'fighting' | 'clear' = 'fighting';

  constructor(
    private readonly world: World,
    readonly index: number,
  ) {
    this.stage = getStage(index);
    this.totalEnemies = this.stage.waves.reduce(
      (total, wave) => total + wave.enemies.reduce((sum, group) => sum + group.count, 0),
      0,
    );
  }

  get progress(): number {
    if (this.totalEnemies === 0) return 0;
    return Math.min(1, this.defeated / this.totalEnemies);
  }

  get progressLabel(): string {
    const wave = Math.min(this.waveCursor, this.stage.waves.length);
    const remaining = Math.max(0, this.totalEnemies - this.defeated);
    if (this.state === 'clear') return 'Rift sealed';
    return `Wave ${wave} / ${this.stage.waves.length} · ${remaining} remaining`;
  }

  onEnemyDefeated(): void {
    this.defeated += 1;
  }

  update(delta: number): void {
    if (this.state === 'clear') {
      this.clearTimer -= delta;
      if (this.clearTimer <= 0) this.world.advanceStage();
      return;
    }

    this.time += delta;

    // Breathing room between waves: without this the late stages have no recovery at all inside a
    // fight, and a single elite wave decided the whole run. Checked before spawning so the reward
    // is not swallowed by a wave that arrives on the same frame.
    if (this.clearRewardPending && this.world.enemies.length === 0) {
      this.clearRewardPending = false;
      this.world.healHero(this.world.hero.maxHp * WAVE_CLEAR_HEAL);
    }

    while (this.waveCursor < this.stage.waves.length) {
      const wave = this.stage.waves[this.waveCursor]!;
      if (wave.at > this.time) break;
      // Waves are gated: the next group only arrives once the arena is clear, or after a grace
      // window if the fight is dragging. Without this the later stages stacked three elite
      // groups on top of each other (observed: stage 9 unloads two knights onto the previous
      // wave), which made the run unwinnable regardless of tuning.
      const sinceLastSpawn = this.time - this.lastSpawnTime;
      const arenaClear = this.world.enemies.length === 0;
      if (this.waveCursor > 0 && !arenaClear && sinceLastSpawn < WAVE_GRACE_SECONDS) break;
      this.spawnWave(wave);
      this.lastSpawnTime = this.time;
      this.clearRewardPending = true;
      this.waveCursor += 1;
    }

    if (this.waveCursor >= this.stage.waves.length && this.world.enemies.length === 0) {
      this.state = 'clear';
      this.clearTimer = 2.4;
      this.world.notifyStageCleared();
    }
  }

  private spawnWave(wave: WaveSpec): void {
    for (const group of wave.enemies) {
      for (let i = 0; i < group.count; i += 1) {
        this.world.spawnEnemyAtEdge(group.id, this.stage.hpScale, this.stage.damageScale);
      }
    }
  }
}
