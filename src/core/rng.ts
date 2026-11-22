/**
 * Small deterministic PRNG so combat outcomes (critical hits, starfall placement) can be
 * reproduced in tests instead of relying on Math.random.
 */
export class Rng {
  private state: number;

  constructor(seed = 0x9e3779b9) {
    this.state = seed >>> 0;
  }

  /** Uniform value in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform value in [min, max). */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** True with the given probability (0..1). */
  chance(probability: number): boolean {
    return this.next() < probability;
  }

  /** Random element of a non-empty array. */
  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length) % items.length]!;
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }
}
