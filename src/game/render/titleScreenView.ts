/**
 * Godot-style title screen view. It animates title sprites and starts the game
 * from keyboard or gamepad input only.
 */
import Phaser from 'phaser';
import { ASSET_KEYS } from '../assets';
import { SCREEN } from '../layout/screenLayout';
import { isGamepadStartPressed } from '../input/gamepadInput';
import { isFullscreenToggleKey } from '../input/fullscreenToggle';
import { createPixelText } from './pixelTextView';

const TITLE_SCREEN_DEPTH = 500;
const BLACK = 0x000000;
const WHITE = 0xffffff;

const LOGO_CENTER_Y = 485;
const LOGO_PIXEL_HEIGHT = 176;
const PROMPT_PULSE_MINIMUM_BRIGHTNESS = 0.55;
const PROMPT_PULSE_SPEED = 4;

const ENEMY_ANIMATION_SPEED = 6;
const PLAYER_ANIMATION_SPEED = 6;

const PROMPT_LABEL_WIDTH = 620;
const TITLE_LADYBUG_OFFSET_X = 38;
const TITLE_LADYBUG_OFFSET_Y = -34;
const PRESS_ANY_KEY_OFFSET_Y = -12;
const FULLSCREEN_HINT_OFFSET_Y = 62;

const TITLE_PLAYER_MOVE_RIGHT = 'title-player-move-right';
const TITLE_ENEMY_ANIMATION_PREFIX = 'title-enemy';

/** Runtime facade for the Godot-style title screen. */
export interface TitleScreenView {
  readonly isVisible: boolean;
  show(onStartRequested: () => void): void;
  update(deltaSeconds: number): void;
  hide(): void;
  destroy(): void;
}

class PhaserTitleScreenView implements TitleScreenView {
  private readonly scene: Phaser.Scene;
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private promptText?: Phaser.GameObjects.Container;
  private fullscreenHintText?: Phaser.GameObjects.Container;
  private visible = false;
  private startCallback?: () => void;
  private pulseTimerSeconds = 0;
  private wasGamepadStartPressed = false;

  private readonly startFromKeyboard = (event: KeyboardEvent): void => {
    if (!isStartKey(event)) {
      return;
    }

    event.preventDefault();
    this.requestStart();
  };

  public constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public get isVisible(): boolean {
    return this.visible;
  }

  /** Shows the Godot title screen and waits for the player's start gesture. */
  public show(onStartRequested: () => void): void {
    this.hide();
    this.visible = true;
    this.startCallback = onStartRequested;
    this.pulseTimerSeconds = 0;
    this.wasGamepadStartPressed = isGamepadStartPressed(this.scene);

    ensureTitleScreenAnimations(this.scene);

    this.addBackground();
    this.addAnimatedEnemies();
    this.addLogo();
    this.addBottomPrompt();

    this.scene.input.keyboard?.on('keydown', this.startFromKeyboard);
  }

  /** Gently pulses the prompt between white and light grey, like Godot. */
  public update(deltaSeconds: number): void {
    if (!this.visible || !this.promptText) {
      return;
    }

    this.pulseTimerSeconds += deltaSeconds;
    const wave = 0.5 + 0.5 * Math.sin(this.pulseTimerSeconds * PROMPT_PULSE_SPEED);
    const brightness = Phaser.Math.Linear(PROMPT_PULSE_MINIMUM_BRIGHTNESS, 1, wave);
    this.promptText.setAlpha(brightness);
    this.fullscreenHintText?.setAlpha(brightness);
    this.updateGamepadStartState();
  }

  public hide(): void {
    this.scene.input.keyboard?.off('keydown', this.startFromKeyboard);

    for (const object of this.objects) {
      object.destroy();
    }

    this.objects.length = 0;
    this.promptText = undefined;
    this.fullscreenHintText = undefined;
    this.wasGamepadStartPressed = false;
    this.visible = false;
    this.startCallback = undefined;
  }

  public destroy(): void {
    this.hide();
  }


  private updateGamepadStartState(): void {
    const pressed = isGamepadStartPressed(this.scene);

    if (pressed && !this.wasGamepadStartPressed) {
      this.requestStart();
      return;
    }

    this.wasGamepadStartPressed = pressed;
  }

  private addBackground(): void {
    this.objects.push(
      this.scene.add
        .rectangle(0, 0, SCREEN.width, SCREEN.height, BLACK)
        .setOrigin(0, 0)
        .setDepth(TITLE_SCREEN_DEPTH),
    );
  }

  /**
   * Places the four animated enemies above the logo, mirroring TitleScreen.cs:
   * level 5, level 1, level 2, and level 3 in their Godot-authored positions.
   */
  private addAnimatedEnemies(): void {
    const logoTopY = LOGO_CENTER_Y - LOGO_PIXEL_HEIGHT * 0.5;
    const groupCenter = new Phaser.Math.Vector2(SCREEN.width * 0.5, logoTopY * 0.5);

    this.addEnemy(5, groupCenter.x - 95, groupCenter.y - 107.5, 'up');
    this.addEnemy(1, groupCenter.x + 265, groupCenter.y - 52.5, 'right', true);
    this.addEnemy(2, groupCenter.x - 265, groupCenter.y + 67.5, 'right');
    this.addEnemy(3, groupCenter.x + 40, groupCenter.y + 107.5, 'up');
  }

  private addLogo(): void {
    const logo = this.scene.add
      .image(SCREEN.width * 0.5, LOGO_CENTER_Y, ASSET_KEYS.titleLogo)
      .setOrigin(0.5, 0.5)
      .setDepth(TITLE_SCREEN_DEPTH + 1);

    this.objects.push(logo);
  }

  /** Adds the animated ladybug, the PRESS ANY KEY prompt and a fullscreen hint. */
  private addBottomPrompt(): void {
    const logoBottomY = LOGO_CENTER_Y + LOGO_PIXEL_HEIGHT * 0.5;
    const bottomAreaCenterY = logoBottomY + (SCREEN.height - logoBottomY) * 0.5;

    // The original title layout places the ladybug in the left gap before the
    // prompt, slightly above the text baseline rather than centered on it.
    const labelLeftX = SCREEN.width * 0.5 - PROMPT_LABEL_WIDTH * 0.5;
    const ladybug = this.scene.add
      .sprite(labelLeftX + TITLE_LADYBUG_OFFSET_X, bottomAreaCenterY + TITLE_LADYBUG_OFFSET_Y, ASSET_KEYS.ladybug)
      .setOrigin(0.5, 0.5)
      .setDepth(TITLE_SCREEN_DEPTH + 1)
      .play(TITLE_PLAYER_MOVE_RIGHT);

    this.promptText = createPixelText(this.scene, {
      text: 'PRESS ANY KEY',
      x: SCREEN.width * 0.5,
      y: bottomAreaCenterY + PRESS_ANY_KEY_OFFSET_Y,
      fontSize: 26,
      tint: WHITE,
      align: 'center',
      originY: 0.5,
      depth: TITLE_SCREEN_DEPTH + 1,
    });

    this.fullscreenHintText = createPixelText(this.scene, {
      text: 'PRESS F FOR FULL SCREEN',
      x: SCREEN.width * 0.5,
      y: bottomAreaCenterY + FULLSCREEN_HINT_OFFSET_Y,
      fontSize: 26,
      tint: WHITE,
      align: 'center',
      originY: 0.5,
      depth: TITLE_SCREEN_DEPTH + 1,
    });

    this.objects.push(ladybug, this.promptText, this.fullscreenHintText);
  }

  private addEnemy(
    levelNumber: number,
    x: number,
    y: number,
    direction: 'right' | 'up',
    flipHorizontally = false,
  ): void {
    const textureKey = enemyTextureKeyForLevel(levelNumber);
    const sprite = this.scene.add
      .sprite(x, y, textureKey)
      .setOrigin(0.5, 0.5)
      .setDepth(TITLE_SCREEN_DEPTH + 1)
      .setFlipX(flipHorizontally)
      .play(titleEnemyAnimationKey(levelNumber, direction));

    this.objects.push(sprite);
  }

  private requestStart(): void {
    if (!this.visible) {
      return;
    }

    const callback = this.startCallback;
    this.hide();
    callback?.();
  }
}

/** Creates the initial title / press-start screen. */
export function createTitleScreenView(scene: Phaser.Scene): TitleScreenView {
  return new PhaserTitleScreenView(scene);
}

function ensureTitleScreenAnimations(scene: Phaser.Scene): void {
  createAnimationIfMissing(scene, TITLE_PLAYER_MOVE_RIGHT, ASSET_KEYS.ladybug, [1, 0, 2], PLAYER_ANIMATION_SPEED);

  for (let levelNumber = 1; levelNumber <= 8; levelNumber++) {
    const textureKey = enemyTextureKeyForLevel(levelNumber);
    createAnimationIfMissing(scene, titleEnemyAnimationKey(levelNumber, 'right'), textureKey, [0, 1, 2], ENEMY_ANIMATION_SPEED);
    createAnimationIfMissing(scene, titleEnemyAnimationKey(levelNumber, 'up'), textureKey, [3, 4, 5], ENEMY_ANIMATION_SPEED);
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

function titleEnemyAnimationKey(levelNumber: number, direction: 'right' | 'up'): string {
  return `${TITLE_ENEMY_ANIMATION_PREFIX}-${levelNumber}-${direction}`;
}

function enemyTextureKeyForLevel(levelNumber: number): string {
  switch (levelNumber) {
    case 1:
      return ASSET_KEYS.enemyLevel1;
    case 2:
      return ASSET_KEYS.enemyLevel2;
    case 3:
      return ASSET_KEYS.enemyLevel3;
    case 4:
      return ASSET_KEYS.enemyLevel4;
    case 5:
      return ASSET_KEYS.enemyLevel5;
    case 6:
      return ASSET_KEYS.enemyLevel6;
    case 7:
      return ASSET_KEYS.enemyLevel7;
    case 8:
    default:
      return ASSET_KEYS.enemyLevel8;
  }
}

function isStartKey(event: KeyboardEvent): boolean {
  if (event.repeat) {
    return false;
  }

  return !isFullscreenToggleKey(event) &&
    event.key !== 'Escape' &&
    event.key !== 'F1' &&
    event.key !== 'F2' &&
    event.key !== 'F12';
}
