import { ASSET_KEYS } from '../../assets';

export interface EnemySpriteInfo {
  readonly spriteCode: number;
  readonly attr: number;
  readonly naturalVisualIndex: number;
}

export interface EnemyLevelDefinition {
  readonly levelNumber: number;
  readonly spriteInfo: EnemySpriteInfo;
  readonly spritesheetKey: string;
  readonly frameSize: number;
  readonly moveRightAnimationFrameRate: number;
  readonly moveUpAnimationFrameRate: number;
}

/**
 * Computes which insect graphic belongs to one level and enemy slot.
 *
 * Levels 1..8 use one insect type per board. From level 9 onward, the arcade
 * assigns a group of four consecutive insect types across the four slots.
 */
export function getEnemyLevelDefinition(levelNumber: number, enemySlot = 0): EnemyLevelDefinition {
  const normalizedLevel = Math.max(1, Math.floor(levelNumber));
  const spriteInfo = getEnemySpriteInfo(normalizedLevel, enemySlot);

  return {
    levelNumber: normalizedLevel,
    spriteInfo,
    spritesheetKey: spritesheetKeyForSpriteCode(spriteInfo.spriteCode),
    frameSize: 64,
    moveRightAnimationFrameRate: 6,
    moveUpAnimationFrameRate: 5,
  };
}

export function getEnemySpriteInfo(levelNumber: number, enemySlot: number): EnemySpriteInfo {
  if (enemySlot < 0 || enemySlot > 3) {
    throw new Error(`enemySlot must be between 0 and 3. Got ${enemySlot}.`);
  }

  if (levelNumber <= 8) {
    const spriteByLevel = [0x18, 0x30, 0x60, 0x48, 0x78, 0x90, 0xA8, 0xC0];
    const attrByLevel = [0x01, 0x02, 0x04, 0x03, 0x05, 0x06, 0x07, 0x08];
    const index = Math.max(0, levelNumber - 1);
    const attr = attrByLevel[index] ?? 0x01;

    return {
      spriteCode: spriteByLevel[index] ?? 0x18,
      attr,
      naturalVisualIndex: Math.max(0, attr - 1),
    };
  }

  let start = (levelNumber - 1) & 0x07;
  if (start >= 5) {
    start -= 5;
  }

  const naturalIndex = start + enemySlot;
  const attr = naturalIndex + 1;

  return {
    spriteCode: 0x18 + 0x18 * naturalIndex,
    attr,
    naturalVisualIndex: naturalIndex,
  };
}

function spritesheetKeyForSpriteCode(spriteCode: number): string {
  switch (spriteCode) {
    case 0x18:
      return ASSET_KEYS.enemyLevel1;
    case 0x30:
      return ASSET_KEYS.enemyLevel2;
    case 0x48:
      return ASSET_KEYS.enemyLevel4;
    case 0x60:
      return ASSET_KEYS.enemyLevel3;
    case 0x78:
      return ASSET_KEYS.enemyLevel5;
    case 0x90:
      return ASSET_KEYS.enemyLevel6;
    case 0xA8:
      return ASSET_KEYS.enemyLevel7;
    case 0xC0:
      return ASSET_KEYS.enemyLevel8;
    default:
      return ASSET_KEYS.enemyLevel1;
  }
}
