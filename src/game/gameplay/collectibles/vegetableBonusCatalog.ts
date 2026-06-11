/**
 * Level-to-vegetable lookup for the central bonus item.
 *
 * The arcade has 18 vegetable graphics and scores. After level 18 the final
 * raifort frame and 9500-point value remain fixed.
 */
export const VEGETABLE_BONUS_FRAME_COUNT = 18;

export function getVegetableBonusFrame(levelNumber: number): number {
  return Math.min(Math.max(1, Math.floor(levelNumber)), VEGETABLE_BONUS_FRAME_COUNT) - 1;
}

export function getVegetableBonusScore(levelNumber: number): number {
  return 1000 + getVegetableBonusFrame(levelNumber) * 500;
}
