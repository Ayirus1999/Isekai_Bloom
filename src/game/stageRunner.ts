import { getStage, type StageDef, type WaveSpec } from '../data/stages';
import type { World } from './world';

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
    while (this.waveCursor < this.stage.waves.length) {
      const wave = this.stage.waves[this.waveCursor]!;
      if (wave.at > this.time) break;
      this.spawnWave(wave);
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
