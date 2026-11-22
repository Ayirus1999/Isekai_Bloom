import type { Rng } from '../core/rng';

export interface CritProfile {
  critChance: number;
  critDamage: number;
}

export interface DamageResult {
  amount: number;
  crit: boolean;
}

/** Defence mitigates damage on a curve, so stacking defence never reaches immunity. */
export function mitigate(raw: number, defense: number): number {
  const safeDefense = Math.max(0, defense);
  return raw * (120 / (120 + safeDefense));
}

/**
 * Roll one hit: attack × power, then mitigation, then an optional critical multiplier.
 * Damage never drops below 1 against a living target.
 */
export function rollDamage(
  attack: number,
  power: number,
  profile: CritProfile,
  defense: number,
  rng: Rng,
): DamageResult {
  const crit = rng.chance(Math.max(0, Math.min(1, profile.critChance)));
  const raw = attack * power * (crit ? profile.critDamage : 1);
  const amount = Math.max(1, Math.round(mitigate(raw, defense)));
  return { amount, crit };
}

/** Enemy damage against the heroine, who has her own defence stat. */
export function rollIncoming(damage: number, defense: number): number {
  return Math.max(1, Math.round(mitigate(damage, defense)));
}
