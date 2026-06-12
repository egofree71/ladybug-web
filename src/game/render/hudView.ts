/**
 * HUD view for SPECIAL, EXTRA, multiplier indicators, score, reserve lives and
 * the HUD-to-maze life entry sprite.
 */
import Phaser from 'phaser';
import { ASSET_KEYS } from '../assets';
import { FONT, HUD } from '../layout/screenLayout';
import { COLLECTIBLE_TINTS } from '../layout/collectibleLayout';
import type { LetterKind } from '../gameplay/collectibles/collectibleTypes';
import { WordProgressState } from '../gameplay/words/wordProgressState';
import { createPixelText } from './pixelTextView';
import {
  ensurePlayerEntryAnimations,
  moveTowards,
  playEntryMoveRight,
  playEntryMoveUp,
  type PlayerEntryFinishedCallback,
} from './playerView';

const HUD_GREY_TINT = 0xc8c8c8;
const INITIAL_LIVES = 3;
const LIFE_ICON_FRAME = 1;
const MAX_VISIBLE_LIFE_ICONS = 5;
const LIFE_ENTRY_DEPTH = 300;

// Godot moves the temporary entry ladybug by 4 rendered scene pixels on each
// fixed gameplay tick. This is a simulation-step distance, not a browser-frame
// movement value.
const LIFE_ENTRY_STEP_PX = 4;

type LifeEntryPhase = 'none' | 'horizontal' | 'vertical';

/** Runtime HUD facade used by the scene orchestration code. */
export interface HudView {
  readonly isLifeEntryAnimationActive: boolean;
  startLifeEntryAnimation(targetCenter: Phaser.Math.Vector2, onFinished: PlayerEntryFinishedCallback): boolean;
  advanceLifeEntryAnimationOneTick(): boolean;
  setLives(lives: number): void;
  setCurrentLifeInMaze(isInMaze: boolean): void;
  setScore(score: number): void;
  setMultiplierStep(multiplierStep: number): void;
  setWordProgress(wordProgress: WordProgressState): void;
}

class PhaserHudView implements HudView {
  private readonly scene: Phaser.Scene;
  private readonly lifeIcons: Phaser.GameObjects.Sprite[] = [];
  private lifeEntrySprite?: Phaser.GameObjects.Sprite;
  private lifeEntryPhase: LifeEntryPhase = 'none';
  private lifeEntryHorizontalTarget = new Phaser.Math.Vector2();
  private lifeEntryFinalTarget = new Phaser.Math.Vector2();
  private lifeEntryHiddenSourceIconIndex = -1;
  private lifeEntryFinishedCallback?: PlayerEntryFinishedCallback;
  private currentLifeInMaze = true;
  private lives = INITIAL_LIVES;
  private specialWordText?: Phaser.GameObjects.Container;
  private extraWordText?: Phaser.GameObjects.Container;
  private multiplierText?: Phaser.GameObjects.Container;
  private scoreText?: Phaser.GameObjects.Container;

  public constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createStaticTopHud();
    this.createLifeIcons();
    this.setScore(0);
    this.setCurrentLifeInMaze(true);
  }

  public get isLifeEntryAnimationActive(): boolean {
    return this.lifeEntrySprite !== undefined;
  }

  /** Updates the numeric score display. */
  public setScore(score: number): void {
    this.scoreText = replacePixelText(this.scoreText, this.scene, {
      text: Math.max(0, Math.floor(score)).toString(),
      x: HUD.scoreX,
      y: HUD.bottomScoreCenterY,
      fontSize: FONT.scoreSizePx,
      tint: HUD_GREY_TINT,
      align: 'right',
      originY: 0.5,
      depth: 100,
    });
  }

  /** Updates SPECIAL and EXTRA from the semantic word-progress state. */
  public setWordProgress(wordProgress: WordProgressState): void {
    this.specialWordText = replacePixelText(this.specialWordText, this.scene, {
      text: 'SPECIAL',
      x: HUD.leftX,
      y: HUD.topY,
      fontSize: FONT.topSizePx,
      tint: HUD_GREY_TINT,
      glyphTints: buildWordTints(
        WordProgressState.specialWordLetters,
        (letter) => wordProgress.isSpecialLetterActive(letter),
        COLLECTIBLE_TINTS.red,
      ),
      depth: 100,
    });

    this.extraWordText = replacePixelText(this.extraWordText, this.scene, {
      text: 'EXTRA',
      x: HUD.centerX,
      y: HUD.topY,
      fontSize: FONT.topSizePx,
      tint: HUD_GREY_TINT,
      glyphTints: buildWordTints(
        WordProgressState.extraWordLetters,
        (letter) => wordProgress.isExtraLetterActive(letter),
        COLLECTIBLE_TINTS.yellow,
      ),
      align: 'center',
      depth: 100,
    });
  }

  /** Updates which multiplier labels are lit after blue-heart pickups. */
  public setMultiplierStep(multiplierStep: number): void {
    const safeStep = Phaser.Math.Clamp(Math.floor(multiplierStep), 0, 3);
    const text = 'x2 x3 x5';
    const glyphTints = [
      ...repeatTint(2, safeStep >= 1 ? COLLECTIBLE_TINTS.blue : HUD_GREY_TINT),
      HUD_GREY_TINT,
      ...repeatTint(2, safeStep >= 2 ? COLLECTIBLE_TINTS.blue : HUD_GREY_TINT),
      HUD_GREY_TINT,
      ...repeatTint(2, safeStep >= 3 ? COLLECTIBLE_TINTS.blue : HUD_GREY_TINT),
    ];

    this.multiplierText = replacePixelText(this.multiplierText, this.scene, {
      text,
      x: HUD.rightX,
      y: HUD.topY,
      fontSize: FONT.topSizePx,
      tint: HUD_GREY_TINT,
      glyphTints,
      align: 'right',
      depth: 100,
    });
  }

  /**
   * Starts the level-entry path from the rightmost available life icon.
   *
   * The current branch uses the level-1 start only, but the method already keeps
   * the target as a parameter so death restart and future level flows can reuse
   * the same HUD-owned animation.
   */
  public startLifeEntryAnimation(
    targetCenter: Phaser.Math.Vector2,
    onFinished: PlayerEntryFinishedCallback,
  ): boolean {
    this.cancelLifeEntryAnimation();

    const totalLives = this.lives;
    if (totalLives <= 0 || this.lifeIcons.length === 0) {
      return false;
    }

    // Before entry, every remaining life is available in the HUD. The travelling
    // sprite starts from the rightmost one, then the static HUD switches back to
    // reserve-life display while the clone moves into the maze.
    this.currentLifeInMaze = false;
    this.updateLifeIconDisplay();

    const sourceIconIndex = Phaser.Math.Clamp(totalLives - 1, 0, this.lifeIcons.length - 1);
    const sourceCenter = this.getLifeIconCenter(sourceIconIndex);

    this.lifeEntryHiddenSourceIconIndex = sourceIconIndex;
    this.lifeEntryHorizontalTarget.set(targetCenter.x, sourceCenter.y);
    this.lifeEntryFinalTarget.copy(targetCenter);
    this.lifeEntryPhase = 'horizontal';
    this.lifeEntryFinishedCallback = onFinished;

    ensurePlayerEntryAnimations(this.scene);
    this.lifeEntrySprite = this.scene.add
      .sprite(sourceCenter.x, sourceCenter.y, ASSET_KEYS.ladybug, LIFE_ICON_FRAME)
      .setOrigin(0.5, 0.5)
      .setDepth(LIFE_ENTRY_DEPTH);

    playEntryMoveRight(this.lifeEntrySprite);

    this.currentLifeInMaze = true;
    this.updateLifeIconDisplay();
    return true;
  }

  /** Advances the HUD-to-maze entry animation by one fixed simulation tick. */
  public advanceLifeEntryAnimationOneTick(): boolean {
    if (!this.lifeEntrySprite) {
      return true;
    }

    const target = this.lifeEntryPhase === 'horizontal'
      ? this.lifeEntryHorizontalTarget
      : this.lifeEntryFinalTarget;

    const reachedTarget = moveTowards(this.lifeEntrySprite, target, LIFE_ENTRY_STEP_PX);
    if (!reachedTarget) {
      return false;
    }

    if (this.lifeEntryPhase === 'horizontal') {
      this.lifeEntryPhase = 'vertical';
      playEntryMoveUp(this.lifeEntrySprite);
      return false;
    }

    this.finishLifeEntryAnimation();
    return true;
  }

  private createStaticTopHud(): void {
    this.setWordProgress(new WordProgressState());
    this.setMultiplierStep(0);
  }

  private createLifeIcons(): void {
    for (let i = 0; i < MAX_VISIBLE_LIFE_ICONS; i++) {
      const icon = this.scene.add
        .sprite(HUD.livesX + i * HUD.lifeIconSpacing, HUD.bottomLivesCenterY, ASSET_KEYS.ladybug, LIFE_ICON_FRAME)
        .setOrigin(0, 0.5)
        .setDepth(100)
        .setVisible(false);

      this.lifeIcons.push(icon);
    }
  }

  public setCurrentLifeInMaze(isInMaze: boolean): void {
    this.currentLifeInMaze = isInMaze;
    this.updateLifeIconDisplay();
  }

  public setLives(lives: number): void {
    this.lives = Math.max(0, Math.floor(lives));
    this.updateLifeIconDisplay();
  }

  private updateLifeIconDisplay(): void {
    const visibleLifeCount = Phaser.Math.Clamp(
      this.currentLifeInMaze ? this.lives - 1 : this.lives,
      0,
      MAX_VISIBLE_LIFE_ICONS,
    );

    for (let i = 0; i < this.lifeIcons.length; i++) {
      const shouldShow = i < visibleLifeCount && i !== this.lifeEntryHiddenSourceIconIndex;
      this.lifeIcons[i].setVisible(shouldShow);
    }
  }

  private getLifeIconCenter(iconIndex: number): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      HUD.livesX + iconIndex * HUD.lifeIconSpacing + 32,
      HUD.bottomLivesCenterY,
    );
  }

  private finishLifeEntryAnimation(): void {
    const callback = this.lifeEntryFinishedCallback;
    this.cancelLifeEntryAnimation();
    callback?.();
  }

  private cancelLifeEntryAnimation(): void {
    this.lifeEntrySprite?.destroy();
    this.lifeEntrySprite = undefined;
    this.lifeEntryPhase = 'none';
    this.lifeEntryHiddenSourceIconIndex = -1;
    this.lifeEntryFinishedCallback = undefined;
    this.updateLifeIconDisplay();
  }
}

function replacePixelText(
  currentText: Phaser.GameObjects.Container | undefined,
  scene: Phaser.Scene,
  options: Parameters<typeof createPixelText>[1],
): Phaser.GameObjects.Container {
  if (currentText) {
    currentText.removeAll(true);
    currentText.destroy();
  }

  return createPixelText(scene, options);
}

function buildWordTints(
  letters: readonly LetterKind[],
  isActive: (letter: LetterKind) => boolean,
  activeTint: number,
): number[] {
  return letters.map((letter) => (isActive(letter) ? activeTint : HUD_GREY_TINT));
}

function repeatTint(count: number, tint: number): number[] {
  return Array.from({ length: count }, () => tint);
}

/**
 * Draws the HUD shell and returns a small runtime facade for entry animation.
 */
export function createHud(scene: Phaser.Scene): HudView {
  return new PhaserHudView(scene);
}
