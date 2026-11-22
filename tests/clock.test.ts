import { describe, expect, it } from 'vitest';
import { SimulationClock } from '../src/core/clock';

describe('SimulationClock', () => {
  it('advances simulated time by the real delta at 1x', () => {
    const clock = new SimulationClock();
    expect(clock.advance(0.02)).toBeCloseTo(0.02);
    expect(clock.time).toBeCloseTo(0.02);
  });

  it('doubles the simulated delta at 2x', () => {
    const clock = new SimulationClock();
    clock.setScale(2);
    expect(clock.advance(0.02)).toBeCloseTo(0.04);
    expect(clock.time).toBeCloseTo(0.04);
  });

  it('toggles between 1x and 2x', () => {
    const clock = new SimulationClock();
    expect(clock.toggleScale()).toBe(2);
    expect(clock.toggleScale()).toBe(1);
  });

  it('produces exactly zero simulated time while paused', () => {
    const clock = new SimulationClock();
    clock.pause();
    expect(clock.advance(0.05)).toBe(0);
    expect(clock.time).toBe(0);
    clock.resume();
    expect(clock.advance(0.05)).toBeCloseTo(0.05);
  });

  it('clamps long real steps so a stalled tab cannot skip the run', () => {
    const clock = new SimulationClock();
    expect(clock.advance(5)).toBeCloseTo(0.05);
  });

  it('ignores invalid deltas', () => {
    const clock = new SimulationClock();
    expect(clock.advance(Number.NaN)).toBe(0);
    expect(clock.advance(-1)).toBe(0);
    expect(clock.time).toBe(0);
  });

  it('resets scale, pause and elapsed time together', () => {
    const clock = new SimulationClock();
    clock.setScale(2);
    clock.pause();
    clock.advance(0.02);
    clock.reset();
    expect(clock.scale).toBe(1);
    expect(clock.isPaused).toBe(false);
    expect(clock.time).toBe(0);
  });
});
