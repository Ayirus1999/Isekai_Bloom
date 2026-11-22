import type { EnemyTier } from './types';

export interface TargetCandidate {
  id: string;
  x: number;
  tier: EnemyTier;
  alive: boolean;
  hpRatio: number;
}

const TIER_BONUS: Record<EnemyTier, number> = {
  normal: 0,
  elite: 90,
  boss: 180,
};

/** How strongly the current target is defended against switching. */
const LOYALTY = 130;

/** Score a candidate; higher is better. */
export function scoreTarget(candidate: TargetCandidate, heroX: number, currentId: string | null): number {
  const distance = Math.abs(candidate.x - heroX);
  const proximity = -distance * 0.9;
  const tier = TIER_BONUS[candidate.tier];
  const loyalty = candidate.id === currentId ? LOYALTY : 0;
  // Injured enemies are slightly more attractive so the heroine finishes what she starts.
  const finish = (1 - candidate.hpRatio) * 25;
  return proximity + tier + loyalty + finish;
}

/**
 * Pick a target. The current target keeps a large bonus, so the heroine only switches when another
 * enemy is decisively closer or a more dangerous tier enters the fight.
 */
export function selectTarget(
  candidates: readonly TargetCandidate[],
  heroX: number,
  currentId: string | null,
): TargetCandidate | null {
  let best: TargetCandidate | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const candidate of candidates) {
    if (!candidate.alive) continue;
    const score = scoreTarget(candidate, heroX, currentId);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return best;
}
