/**
 * The single source of simulated time for the whole game.
 *
 * Every gameplay system (movement, cooldowns, projectiles, damage-over-time, spawn timers, stage
 * progression) advances by the delta this clock returns, which means the 1x / 2x control and pause
 * apply uniformly and cannot drift apart. Real-time interface work must never use this delta.
 */

/** Supported simulation multipliers. */
export type TimeScale = 1 | 2;

/** Longest real-time step accepted, so a background tab does not fast-forward the run. */
const MAX_REAL_STEP = 0.05;

export class SimulationClock {
  /** Total simulated seconds elapsed since the run began. */
  private _time = 0;
  private _scale: TimeScale = 1;
  private _paused = false;

  get time(): number {
    return this._time;
  }

  get scale(): TimeScale {
    return this._scale;
  }

  get isPaused(): boolean {
    return this._paused;
  }

  /** Set the simulation multiplier. Anything other than 1 becomes 2. */
  setScale(scale: TimeScale): void {
    this._scale = scale === 1 ? 1 : 2;
  }

  /** Flip between 1x and 2x; returns the new multiplier. */
  toggleScale(): TimeScale {
    this._scale = this._scale === 1 ? 2 : 1;
    return this._scale;
  }

  pause(): void {
    this._paused = true;
  }

  resume(): void {
    this._paused = false;
  }

  togglePause(): boolean {
    this._paused = !this._paused;
    return this._paused;
  }

  /** Reset to a fresh, unpaused, 1x clock. Intended for starting a new run. */
  reset(): void {
    this._time = 0;
    this._scale = 1;
    this._paused = false;
  }

  /**
   * Advance the clock by a real-time step (seconds) and return the simulated delta.
   * Returns 0 while paused, so callers naturally skip the whole simulation.
   */
  advance(realDelta: number): number {
    if (this._paused) return 0;
    if (!Number.isFinite(realDelta) || realDelta <= 0) return 0;
    const delta = Math.min(realDelta, MAX_REAL_STEP) * this._scale;
    this._time += delta;
    return delta;
  }
}
