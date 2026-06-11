import Phaser from 'phaser';
import { ASSET_KEYS } from '../assets';
import { ENEMY_MOVEMENT_TUNING, getEnemySpriteRenderOffsetArcade } from '../gameplay/enemies/enemyMovementTuning';
import { MONSTER_DIR } from '../gameplay/enemies/monsterDirection';
import { add } from '../gameplay/math/vector2';
import { VegetableBonusState, type VegetableBonusPickupResult } from '../gameplay/collectibles/vegetableBonusState';
import type { EnemySystem } from '../gameplay/enemies/enemySystem';
import type { Vector2i } from '../gameplay/math/vector2';
import { arcadePixelToScreenPosition } from '../layout/playfieldCoordinates';

const VEGETABLE_DEPTH = 50;

export interface VegetableBonusFieldView {
  advanceOneSimulationTick(enemySystem: EnemySystem): void;
  tryConsumeAtPlayerArcadePosition(playerArcadePixelPos: Vector2i, enemySystem: EnemySystem): VegetableBonusPickupResult;
  resetRuntimeState(enemySystem?: EnemySystem): void;
  syncFromRuntimeState(): void;
  destroy(): void;
}

/** Creates the central vegetable bonus runtime and its single Phaser sprite. */
export function createVegetableBonus(scene: Phaser.Scene, levelNumber: number): VegetableBonusFieldView {
  const state = new VegetableBonusState(levelNumber);
  const position = vegetableScreenCenter();
  const sprite = scene.add
    .sprite(position.x, position.y, ASSET_KEYS.vegetables)
    .setOrigin(0.5, 0.5)
    .setDepth(VEGETABLE_DEPTH)
    .setVisible(false);

  const facade: VegetableBonusFieldView = {
    advanceOneSimulationTick(enemySystem: EnemySystem): void {
      state.advanceOneSimulationTick(enemySystem);
      syncSprite(sprite, state);
    },

    tryConsumeAtPlayerArcadePosition(playerArcadePixelPos: Vector2i, enemySystem: EnemySystem): VegetableBonusPickupResult {
      const result = state.tryConsumeAtPlayerArcadePosition(playerArcadePixelPos, enemySystem);
      syncSprite(sprite, state);
      return result;
    },

    resetRuntimeState(enemySystem?: EnemySystem): void {
      state.resetRuntimeState(enemySystem);
      syncSprite(sprite, state);
    },

    syncFromRuntimeState(): void {
      syncSprite(sprite, state);
    },

    destroy(): void {
      sprite.destroy();
    },
  };

  facade.syncFromRuntimeState();
  return facade;
}

function syncSprite(sprite: Phaser.GameObjects.Sprite, state: VegetableBonusState): void {
  const snapshot = state.snapshot;
  sprite
    .setFrame(snapshot.frame)
    .setVisible(snapshot.visible);
}

function vegetableScreenCenter(): Vector2i {
  const arcadePosition = add(
    ENEMY_MOVEMENT_TUNING.lairArcadePixelPos,
    getEnemySpriteRenderOffsetArcade(MONSTER_DIR.up),
  );

  return arcadePixelToScreenPosition(arcadePosition);
}
