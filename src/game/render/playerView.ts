import Phaser from 'phaser';
import { ASSET_KEYS } from '../assets';
import { getPlayerStartCenter, PLAYER_LAYOUT } from '../layout/playerLayout';
import type { FixedTickCallback } from '../gameplay/timing/fixedArcadeClock';

const MOVE_RIGHT_ANIMATION_KEY = 'player-entry-move-right';
const MOVE_UP_ANIMATION_KEY = 'player-entry-move-up';

/**
 * Visual facade for the player sprite before real movement exists.
 *
 * This class only owns the static in-maze player view. The HUD-to-maze entry
 * animation is owned by HudView because, like in the Godot remake, that
 * temporary travelling sprite starts from the spare-life icon area.
 */
export class PlayerView {
  private readonly sprite: Phaser.GameObjects.Sprite;

  public constructor(scene: Phaser.Scene) {
    const start = getPlayerStartCenter();

    this.sprite = scene.add
      .sprite(start.x, start.y, ASSET_KEYS.ladybug, PLAYER_LAYOUT.staticFrame)
      .setOrigin(0.5, 0.5)
      .setDepth(PLAYER_LAYOUT.depth)
      .setVisible(false);
  }

  /** Shows the player at the level-start position. */
  public showAtStart(): void {
    const start = getPlayerStartCenter();
    this.sprite.setPosition(start.x, start.y);
    this.sprite.setFrame(PLAYER_LAYOUT.staticFrame);
    this.sprite.setVisible(true);
  }

  /** Hides the in-maze sprite while the HUD life icon is entering the maze. */
  public hide(): void {
    this.sprite.setVisible(false);
  }
}

/**
 * Installs the small animation set used by the temporary entry ladybug.
 *
 * The animation frame order mirrors Hud.cs in the Godot remake. Position changes
 * are still advanced by fixed gameplay ticks; Phaser animations only select the
 * visible wing/body frames over elapsed time.
 */
export function ensurePlayerEntryAnimations(scene: Phaser.Scene): void {
  if (!scene.anims.exists(MOVE_RIGHT_ANIMATION_KEY)) {
    scene.anims.create({
      key: MOVE_RIGHT_ANIMATION_KEY,
      frames: [1, 0, 2].map((frame) => ({ key: ASSET_KEYS.ladybug, frame })),
      frameRate: 12,
      repeat: -1,
    });
  }

  if (!scene.anims.exists(MOVE_UP_ANIMATION_KEY)) {
    scene.anims.create({
      key: MOVE_UP_ANIMATION_KEY,
      frames: [3, 4, 5].map((frame) => ({ key: ASSET_KEYS.ladybug, frame })),
      frameRate: 12,
      repeat: -1,
    });
  }
}

export function playEntryMoveRight(sprite: Phaser.GameObjects.Sprite): void {
  sprite.play(MOVE_RIGHT_ANIMATION_KEY);
  sprite.setFlip(false, false);
}

export function playEntryMoveUp(sprite: Phaser.GameObjects.Sprite): void {
  sprite.play(MOVE_UP_ANIMATION_KEY);
  sprite.setFlip(false, false);
}

export function moveTowards(
  sprite: Phaser.GameObjects.Sprite,
  target: Phaser.Math.Vector2,
  distancePx: number,
): boolean {
  const dx = target.x - sprite.x;
  const dy = target.y - sprite.y;
  const remainingDistance = Math.hypot(dx, dy);

  if (remainingDistance <= distancePx || remainingDistance === 0) {
    sprite.setPosition(target.x, target.y);
    return true;
  }

  const ratio = distancePx / remainingDistance;
  sprite.setPosition(sprite.x + dx * ratio, sprite.y + dy * ratio);
  return false;
}

export type PlayerEntryFinishedCallback = FixedTickCallback;
