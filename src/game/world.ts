import { SimulationClock } from '../core/clock';
import { ARENA_MAX_X, ARENA_MIN_X, ARENA_WIDTH, CAMERA_LERP, VIEW_W } from './constants';
import { Hero, clampX } from './hero';
import type { HeroineDef } from './types';

export type RunStatus = 'idle' | 'combat' | 'stage-clear' | 'victory' | 'defeat';

export const STAGE_COUNT = 10;

export interface BossHud {
  name: string;
  hpRatio: number;
  phase: number;
}

/** Everything the interface needs to draw the HUD, computed once per frame. */
export interface HudSnapshot {
  heroineName: string;
  hp: number;
  maxHp: number;
  hpRatio: number;
  stageNumber: number;
  stageCount: number;
  stageName: string;
  progress: number;
  progressLabel: string;
  empowered: boolean;
  boss: BossHud | null;
}

/**
 * The world owns the simulation: clock, heroine, camera and run status. Systems added in later
 * milestones (enemies, projectiles, effects, stage script) hang off `step`, so the 1x / 2x clock
 * keeps driving everything from one place.
 */
export class World {
  readonly clock = new SimulationClock();
  hero: Hero;

  status: RunStatus = 'idle';
  stageIndex = 0;
  cameraX = 0;
  /** Camera shake amplitude in pixels, decayed over real time. */
  shake = 0;
  /** Total simulated seconds this run has been running. */
  time = 0;

  private idleTarget: number;
  private idleWait = 1.2;

  constructor(def: HeroineDef) {
    this.hero = new Hero(def, ARENA_WIDTH * 0.5);
    this.idleTarget = this.hero.x;
    this.cameraX = clampCamera(this.hero.x);
  }

  get stageName(): string {
    return 'Blossom Meadow';
  }

  startRun(def: HeroineDef): void {
    this.hero = new Hero(def, ARENA_WIDTH * 0.5);
    this.idleTarget = this.hero.x;
    this.idleWait = 1.2;
    this.status = 'combat';
    this.stageIndex = 0;
    this.time = 0;
    this.cameraX = clampCamera(this.hero.x);
    this.clock.reset();
  }

  /** Advance the simulation. Real-time presentation smoothing happens outside the clock. */
  update(realDelta: number): void {
    const delta = this.clock.advance(realDelta);
    if (delta > 0 && this.status === 'combat') {
      this.time += delta;
      this.step(delta);
    }
    this.updateCamera(realDelta);
  }

  private step(delta: number): void {
    this.hero.tickTimers(delta);
    this.wander(delta);
  }

  /** Idle behaviour before enemies exist: stroll to a new spot now and then, with a breath. */
  private wander(delta: number): void {
    if (this.hero.phase === 'defeated') return;
    if (this.idleWait > 0) {
      this.idleWait -= delta;
      this.hero.moving = false;
      this.hero.phase = 'idle';
      return;
    }
    const arrived = !this.hero.moveToward(this.idleTarget, delta);
    if (arrived) {
      this.hero.phase = 'idle';
      this.idleWait = 2.4 + Math.random() * 2.6;
      const span = (ARENA_MAX_X - ARENA_MIN_X) * 0.28;
      this.idleTarget = clampX(this.hero.x + (Math.random() * 2 - 1) * span);
    } else {
      this.hero.phase = 'moving';
    }
  }

  private updateCamera(realDelta: number): void {
    const target = clampCamera(this.hero.x);
    const t = Math.min(1, CAMERA_LERP * realDelta);
    this.cameraX += (target - this.cameraX) * t;
    this.shake = Math.max(0, this.shake - realDelta * 7);
  }

  getHud(): HudSnapshot {
    return {
      heroineName: this.hero.def.name,
      hp: Math.ceil(this.hero.hp),
      maxHp: this.hero.maxHp,
      hpRatio: this.hero.hpRatio,
      stageNumber: this.stageIndex + 1,
      stageCount: STAGE_COUNT,
      stageName: this.stageName,
      progress: 0,
      progressLabel: 'Awaiting the rift',
      empowered: this.hero.empowered,
      boss: null,
    };
  }
}

function clampCamera(x: number): number {
  return Math.max(0, Math.min(ARENA_WIDTH - VIEW_W, x - VIEW_W * 0.5));
}
