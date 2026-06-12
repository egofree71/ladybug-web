/**
 * Phaser view for the enemy field. It creates sprites and animations for the
 * four enemy slots while EnemySystem owns all lifecycle and movement rules.
 */
import Phaser from 'phaser';
import { ASSET_KEYS } from '../assets';
import type { GateSystem } from '../gameplay/gates/gateSystem';
import type { MazeGrid } from '../gameplay/maze/mazeGrid';
import { arcadeDeltaToScreenDelta, arcadePixelToScreenPosition } from '../layout/playfieldCoordinates';
import { EnemySystem, type EnemySystemTickOptions } from '../gameplay/enemies/enemySystem';
import { getEnemyLevelDefinition, type EnemyLevelDefinition } from '../gameplay/enemies/enemyLevelCatalog';
import { getEnemySpriteRenderOffsetArcade } from '../gameplay/enemies/enemyMovementTuning';
import { MONSTER_DIR, type MonsterDir } from '../gameplay/enemies/monsterDirection';
import type { MonsterEntity } from '../gameplay/enemies/monsterEntity';

// Enemies sit above collectibles and gates during normal play; the player death
// sequence can temporarily hide them from GameScene when the arcade flow requires it.
const ENEMY_DEPTH = 55;

export interface EnemyFieldView {
  readonly enemySystem: EnemySystem;
  readonly hasReleaseCandidate: boolean;
  advanceOneSimulationTick(options: EnemySystemTickOptions): void;
  tryReleaseNextEnemy(): boolean;
  resetAfterPlayerDeath(): void;
  hideAllViewsForPlayerDeathSequence(): void;
  syncFromRuntimeState(): void;
  destroy(): void;
}

/** Creates the runtime enemy system and all four Phaser enemy sprites. */
export function createEnemies(
  scene: Phaser.Scene,
  mazeGrid: MazeGrid,
  gateSystem: GateSystem,
  levelNumber: number,
): EnemyFieldView {
  ensureEnemyAnimations(scene);

  const enemySystem = new EnemySystem(mazeGrid, gateSystem, levelNumber);
  const spritesByMonsterId = new Map<number, Phaser.GameObjects.Sprite>();
  let suppressViewsDuringPlayerDeath = false;

  for (const monster of enemySystem.monsters) {
    const definition = getEnemyLevelDefinition(levelNumber, monster.id);
    const position = enemyScreenCenter(monster);
    const sprite = scene.add
      .sprite(position.x, position.y, definition.spritesheetKey)
      .setOrigin(0.5, 0.5)
      .setDepth(ENEMY_DEPTH)
      .setVisible(false);

    spritesByMonsterId.set(monster.id, sprite);
  }

  // The facade keeps GameScene from reaching into Phaser sprite maps. Scene code
  // can advance/reset the enemy field as a gameplay unit, while this file remains
  // responsible for synchronizing runtime state into sprites.
  const facade: EnemyFieldView = {
    enemySystem,

    get hasReleaseCandidate(): boolean {
      return enemySystem.hasReleaseCandidate;
    },

    advanceOneSimulationTick(options: EnemySystemTickOptions): void {
      enemySystem.advanceOneSimulationTick(options);
      syncSprites(enemySystem.monsters, spritesByMonsterId, levelNumber, suppressViewsDuringPlayerDeath);
    },

    tryReleaseNextEnemy(): boolean {
      const released = enemySystem.tryReleaseNextEnemy();
      syncSprites(enemySystem.monsters, spritesByMonsterId, levelNumber, suppressViewsDuringPlayerDeath);
      return released;
    },

    resetAfterPlayerDeath(): void {
      suppressViewsDuringPlayerDeath = false;
      enemySystem.resetAfterPlayerDeath();
      syncSprites(enemySystem.monsters, spritesByMonsterId, levelNumber, suppressViewsDuringPlayerDeath);
    },

    hideAllViewsForPlayerDeathSequence(): void {
      suppressViewsDuringPlayerDeath = true;
      syncSprites(enemySystem.monsters, spritesByMonsterId, levelNumber, suppressViewsDuringPlayerDeath);
    },

    syncFromRuntimeState(): void {
      syncSprites(enemySystem.monsters, spritesByMonsterId, levelNumber, suppressViewsDuringPlayerDeath);
    },

    destroy(): void {
      for (const sprite of spritesByMonsterId.values()) {
        sprite.destroy();
      }

      spritesByMonsterId.clear();
    },
  };

  facade.syncFromRuntimeState();
  return facade;
}

/** Synchronizes all enemy sprites after one runtime change or fixed simulation tick. */
function syncSprites(
  monsters: readonly MonsterEntity[],
  spritesByMonsterId: ReadonlyMap<number, Phaser.GameObjects.Sprite>,
  levelNumber: number,
  forceHidden: boolean,
): void {
  for (const monster of monsters) {
    const sprite = spritesByMonsterId.get(monster.id);
    if (!sprite) {
      continue;
    }

    const definition = getEnemyLevelDefinition(levelNumber, monster.id);
    const position = enemyScreenCenter(monster);

    applyTextureIfNeeded(sprite, definition);
    sprite
      .setPosition(position.x, position.y)
      .setVisible(!forceHidden && monster.isVisible);

    applyEnemyFacing(sprite, monster.direction, definition);
  }
}

/** Converts the enemy arcade-pixel anchor plus direction-specific Godot offset into screen space. */
function enemyScreenCenter(monster: MonsterEntity): Phaser.Math.Vector2 {
  const anchor = arcadePixelToScreenPosition(monster.arcadePixelPos);
  const renderOffset = arcadeDeltaToScreenDelta(getEnemySpriteRenderOffsetArcade(monster.direction));

  return new Phaser.Math.Vector2(anchor.x + renderOffset.x, anchor.y + renderOffset.y);
}

/** Applies the minimal animation set used by the source sprites: right and up, with flips for left/down. */
function applyEnemyFacing(
  sprite: Phaser.GameObjects.Sprite,
  direction: MonsterDir,
  definition: EnemyLevelDefinition,
): void {
  sprite.setFlip(false, false);

  if (direction === MONSTER_DIR.left) {
    playAnimationIfNeeded(sprite, animationKey(definition, 'right'));
    sprite.setFlipX(true);
    return;
  }

  if (direction === MONSTER_DIR.right) {
    playAnimationIfNeeded(sprite, animationKey(definition, 'right'));
    return;
  }

  if (direction === MONSTER_DIR.down) {
    playAnimationIfNeeded(sprite, animationKey(definition, 'up'));
    sprite.setFlipY(true);
    return;
  }

  playAnimationIfNeeded(sprite, animationKey(definition, 'up'));
}

function applyTextureIfNeeded(
  sprite: Phaser.GameObjects.Sprite,
  definition: EnemyLevelDefinition,
): void {
  if (sprite.texture.key !== definition.spritesheetKey) {
    sprite.setTexture(definition.spritesheetKey);
  }
}

function playAnimationIfNeeded(sprite: Phaser.GameObjects.Sprite, key: string): void {
  if (sprite.anims.isPlaying && sprite.anims.currentAnim?.key === key) {
    return;
  }

  // Do not pass Phaser's `ignoreIfPlaying` flag here. In practice it can keep
  // the previous horizontal animation alive when the enemy turns vertically,
  // which makes up/down movement look like right-facing movement.
  sprite.play(key);
}

/** Registers shared enemy animations once; Phaser animations are global to the game instance. */
function ensureEnemyAnimations(scene: Phaser.Scene): void {
  const loadedKeys = [
    ASSET_KEYS.enemyLevel1,
    ASSET_KEYS.enemyLevel2,
    ASSET_KEYS.enemyLevel3,
    ASSET_KEYS.enemyLevel4,
    ASSET_KEYS.enemyLevel5,
    ASSET_KEYS.enemyLevel6,
    ASSET_KEYS.enemyLevel7,
    ASSET_KEYS.enemyLevel8,
  ];

  for (let i = 1; i <= loadedKeys.length; i++) {
    const definition = getEnemyLevelDefinition(i, 0);
    createAnimationIfMissing(scene, animationKey(definition, 'right'), definition.spritesheetKey, [0, 1, 2], definition.moveRightAnimationFrameRate);
    createAnimationIfMissing(scene, animationKey(definition, 'up'), definition.spritesheetKey, [3, 4, 5], definition.moveUpAnimationFrameRate);
  }
}

function createAnimationIfMissing(
  scene: Phaser.Scene,
  key: string,
  textureKey: string,
  frames: readonly number[],
  frameRate: number,
): void {
  if (scene.anims.exists(key)) {
    return;
  }

  scene.anims.create({
    key,
    frames: frames.map((frame) => ({ key: textureKey, frame })),
    frameRate,
    repeat: -1,
  });
}

function animationKey(definition: EnemyLevelDefinition, directionName: 'right' | 'up'): string {
  return `enemy-${definition.spritesheetKey}-${directionName}`;
}
