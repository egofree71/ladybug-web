import { COLLECTIBLE_COLOR, COLLECTIBLE_KIND, type CollectibleColor, type CollectibleKind } from '../collectibles/collectibleTypes';

export interface CollectibleScoreCalculation {
  readonly baseScore: number;
  readonly multiplier: number;
  readonly scoreDelta: number;
  readonly hasScore: boolean;
}

/** Computes the score awarded by one consumed collectible. */
export function calculateCollectibleScore(
  kind: CollectibleKind,
  color: CollectibleColor,
  multiplier: number,
): CollectibleScoreCalculation {
  const safeMultiplier = multiplier <= 0 ? 1 : Math.floor(multiplier);
  const baseScore = getBaseScore(kind, color);
  const scoreDelta = baseScore * safeMultiplier;

  return {
    baseScore,
    multiplier: safeMultiplier,
    scoreDelta,
    hasScore: scoreDelta > 0,
  };
}

function getBaseScore(kind: CollectibleKind, color: CollectibleColor): number {
  if (kind === COLLECTIBLE_KIND.flower) {
    return 10;
  }

  if (kind === COLLECTIBLE_KIND.heart || kind === COLLECTIBLE_KIND.letter) {
    return getColorScore(color);
  }

  return 0;
}

function getColorScore(color: CollectibleColor): number {
  if (color === COLLECTIBLE_COLOR.blue) {
    return 100;
  }

  if (color === COLLECTIBLE_COLOR.yellow) {
    return 300;
  }

  if (color === COLLECTIBLE_COLOR.red) {
    return 800;
  }

  return 0;
}
