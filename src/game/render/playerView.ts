/**
 * Phaser view for the living player, HUD entry animation and death sprites.
 * Movement and death timing stay in gameplay state classes.
 */
import Phaser from 'phaser';
import { ASSET_KEYS } from '../assets';
import { getPlayerScreenCenterFromArcadePixel, getPlayerStartCenter, PLAYER_LAYOUT } from '../layout/playerLayout';
import type { FixedTickCallback } from '../gameplay/timing/fixedArcadeClock';
import { arcadeDeltaToScreenDelta } from '../layout/playfieldCoordinates';
import { clone, equals, type Vector2i, VEC2 } from '../gameplay/math/vector2';
import type { PlayerMovementStepResult } from '../gameplay/player/playerMovementMotor';
import { PLAYER_DEATH_VISUAL_SHEET, PlayerDeathSequenceState } from '../gameplay/player/playerDeathSequenceState';

const PLAYER_MOVE_RIGHT_ANIMATION_KEY = 'player-move-right';
const PLAYER_MOVE_LEFT_ANIMATION_KEY = 'player-move-left';
const PLAYER_MOVE_UP_ANIMATION_KEY = 'player-move-up';
const PLAYER_MOVE_DOWN_ANIMATION_KEY = 'player-move-down';
const MOVE_RIGHT_ANIMATION_KEY = 'player-entry-move-right';
const MOVE_UP_ANIMATION_KEY = 'player-entry-move-up';
const DEATH_SPRITE_DEPTH = 90;

/**
 * Visual facade for the in-maze player sprite.
 *
 * The gameplay motor owns the integer arcade-pixel position. This view only
 * applies the resulting screen position and facing animation. The sprite keeps
 * looping its wing/body animation even when no movement occurs, matching the
 * Godot AnimatedSprite2D behavior.
 */
export class PlayerView {
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly deathSprite: Phaser.GameObjects.Sprite;
  private readonly deathSequenceState = new PlayerDeathSequenceState();
  private lastFacing = VEC2.up;
  private lastArcadePixelPos: Vector2i;
  private lastOffsetDirection: Vector2i = VEC2.up;
  private deathBaseCenter = new Phaser.Math.Vector2();

  public constructor(scene: Phaser.Scene) {
    const start = getPlayerStartCenter();

    ensurePlayerGameplayAnimations(scene);

    this.sprite = scene.add
      .sprite(start.x, start.y, ASSET_KEYS.ladybug, PLAYER_LAYOUT.staticFrame)
      .setOrigin(0.5, 0.5)
      .setDepth(PLAYER_LAYOUT.depth)
      .setVisible(false);

    this.deathSprite = scene.add
      .sprite(start.x, start.y, ASSET_KEYS.playerDeathRed, 0)
      .setOrigin(0.5, 0.5)
      .setDepth(DEATH_SPRITE_DEPTH)
      .setVisible(false);

    this.lastArcadePixelPos = clone(PLAYER_LAYOUT.startArcadePixelPos);
    this.playFacingAnimation(VEC2.up);
  }

  public get isDeathSequenceActive(): boolean {
    return this.deathSequenceState.isActive;
  }

  /** Shows the player at the level-start position and keeps the idle animation running. */
  public showAtStart(): void {
    const start = getPlayerStartCenter();
    this.lastArcadePixelPos = clone(PLAYER_LAYOUT.startArcadePixelPos);
    this.lastOffsetDirection = VEC2.up;
    this.deathSequenceState.reset();
    this.deathSprite.setVisible(false);
    this.sprite.setPosition(start.x, start.y);
    this.sprite.setVisible(true);
    this.playFacingAnimation(VEC2.up);
  }

  /** Hides the in-maze sprite during entry and pickup-popup freeze states. */
  public hide(): void {
    this.sprite.setVisible(false);
  }

  /** Restores the in-maze sprite at its current gameplay-rendered position. */
  public show(): void {
    if (!this.deathSequenceState.isActive) {
      this.sprite.setVisible(true);
    }
  }

  /** Synchronizes the rendered sprite from one fixed movement step result. */
  public applyMovementStep(stepResult: PlayerMovementStepResult): void {
    this.lastArcadePixelPos = clone(stepResult.currentArcadePixelPos);
    this.lastOffsetDirection = clone(stepResult.offsetDirection);

    const position = getPlayerScreenCenterFromArcadePixel(
      stepResult.currentArcadePixelPos,
      stepResult.offsetDirection,
    );

    this.sprite.setPosition(position.x, position.y);
    this.sprite.setVisible(true);

    if (!equals(stepResult.facingDirection, this.lastFacing)) {
      this.playFacingAnimation(stepResult.facingDirection);
    }
  }

  /** Starts the red shrink / ghost death animation at the current player position. */
  public startDeathSequence(): void {
    const deathBaseCenter = getPlayerScreenCenterFromArcadePixel(this.lastArcadePixelPos, this.lastOffsetDirection);
    this.deathBaseCenter.set(deathBaseCenter.x, deathBaseCenter.y);

    this.sprite.setVisible(false);
    this.deathSequenceState.start();
    this.deathSprite.setDepth(DEATH_SPRITE_DEPTH);
    this.deathSprite.scene.children.bringToTop(this.deathSprite);
    this.syncDeathSpriteFromState();
  }

  /** Advances the death sequence by one fixed simulation tick. */
  public advanceDeathSequenceOneTick(): boolean {
    if (!this.deathSequenceState.isActive) {
      return true;
    }

    const completed = this.deathSequenceState.advanceOneTick();
    this.syncDeathSpriteFromState();

    if (completed) {
      this.deathSprite.setVisible(false);
    }

    return completed;
  }

  /** Hides every player visual, used by the temporary game-over placeholder. */
  public hideAfterDeathSequence(): void {
    this.deathSequenceState.reset();
    this.sprite.setVisible(false);
    this.deathSprite.setVisible(false);
  }

  private syncDeathSpriteFromState(): void {
    const textureKey = this.deathSequenceState.currentSheet === PLAYER_DEATH_VISUAL_SHEET.ghost
      ? ASSET_KEYS.playerDeathGhost
      : ASSET_KEYS.playerDeathRed;
    const screenOffset = arcadeDeltaToScreenDelta(this.deathSequenceState.currentVisualOffsetArcade);

    this.deathSprite
      .setTexture(textureKey, this.deathSequenceState.currentFrame)
      .setPosition(this.deathBaseCenter.x + screenOffset.x, this.deathBaseCenter.y + screenOffset.y)
      .setVisible(this.deathSequenceState.isActive);
  }

  private playFacingAnimation(direction: Vector2i): void {
    this.lastFacing = direction;
    this.sprite.setFlip(false, false);

    if (equals(direction, VEC2.left)) {
      this.sprite.play(PLAYER_MOVE_LEFT_ANIMATION_KEY, true);
      this.sprite.setFlipX(true);
      return;
    }

    if (equals(direction, VEC2.right)) {
      this.sprite.play(PLAYER_MOVE_RIGHT_ANIMATION_KEY, true);
      return;
    }

    if (equals(direction, VEC2.down)) {
      this.sprite.play(PLAYER_MOVE_DOWN_ANIMATION_KEY, true);
      this.sprite.setFlipY(true);
      return;
    }

    this.sprite.play(PLAYER_MOVE_UP_ANIMATION_KEY, true);
  }
}

/** Installs the gameplay player animations used by the in-maze sprite. */
function ensurePlayerGameplayAnimations(scene: Phaser.Scene): void {
  createAnimationIfMissing(scene, PLAYER_MOVE_RIGHT_ANIMATION_KEY, [1, 0, 2], 6);
  createAnimationIfMissing(scene, PLAYER_MOVE_LEFT_ANIMATION_KEY, [1, 0, 2], 6);
  createAnimationIfMissing(scene, PLAYER_MOVE_UP_ANIMATION_KEY, [3, 4, 5], 5);
  createAnimationIfMissing(scene, PLAYER_MOVE_DOWN_ANIMATION_KEY, [3, 4, 5], 5);
}

function createAnimationIfMissing(scene: Phaser.Scene, key: string, frames: readonly number[], frameRate: number): void {
  if (scene.anims.exists(key)) {
    return;
  }

  scene.anims.create({
    key,
    frames: frames.map((frame) => ({ key: ASSET_KEYS.ladybug, frame })),
    frameRate,
    repeat: -1,
  });
}

/**
 * Installs the small animation set used by the temporary entry ladybug.
 *
 * The animation frame order mirrors Hud.cs in the Godot remake. Position changes
 * are still advanced by fixed gameplay ticks; Phaser animations only select the
 * visible wing/body frames over elapsed time.
 */
export function ensurePlayerEntryAnimations(scene: Phaser.Scene): void {
  createAnimationIfMissing(scene, MOVE_RIGHT_ANIMATION_KEY, [1, 0, 2], 12);
  createAnimationIfMissing(scene, MOVE_UP_ANIMATION_KEY, [3, 4, 5], 12);
}

export function playEntryMoveRight(sprite: Phaser.GameObjects.Sprite): void {
  sprite.play(MOVE_RIGHT_ANIMATION_KEY, true);
  sprite.setFlip(false, false);
}

export function playEntryMoveUp(sprite: Phaser.GameObjects.Sprite): void {
  sprite.play(MOVE_UP_ANIMATION_KEY, true);
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
