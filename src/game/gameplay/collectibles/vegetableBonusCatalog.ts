/**
 * Level-to-vegetable lookup for the central bonus item.
 *
 * The arcade has 18 vegetable graphics and scores. After level 18 the final
 * raifort frame and 9500-point value remain fixed.
 */
export const VEGETABLE_BONUS_FRAME_COUNT = 18;

const VEGETABLE_BONUS_NAMES = [
  'CUCUMBER',
  'EGGPLANT',
  'CARROT',
  'RADISH',
  'PARSLEY',
  'TOMATO',
  'PUMPKIN',
  'BAMBOO SHOOT',
  'JAPANESE RADISH',
  'MUSHROOM',
  'POTATO',
  'ONION',
  'CHINESE CABBAGE',
  'TURNIP',
  'RED PEPPER',
  'CELERY',
  'SWEET POTATO',
  'HORSERADISH',
] as const;

export function getVegetableBonusFrame(levelNumber: number): number {
  return Math.min(Math.max(1, Math.floor(levelNumber)), VEGETABLE_BONUS_FRAME_COUNT) - 1;
}

export function getVegetableBonusScore(levelNumber: number): number {
  return 1000 + getVegetableBonusFrame(levelNumber) * 500;
}

export function getVegetableBonusName(levelNumber: number): string {
  return VEGETABLE_BONUS_NAMES[getVegetableBonusFrame(levelNumber)];
}
