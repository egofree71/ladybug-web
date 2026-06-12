/**
 * Godot-style PART screen shown before each playable level. It previews the next
 * vegetable, skulls, letters and hearts from the exact spawn plan that will be
 * used.
 */
import Phaser from 'phaser';
import { ASSET_KEYS } from '../assets';
import { COLLECTIBLE_FRAMES, COLLECTIBLE_TINTS } from '../layout/collectibleLayout';
import { MAZE, SCREEN } from '../layout/screenLayout';
import { COLLECTIBLE_KIND, type CollectibleSpawnPlan, type LetterKind } from '../gameplay/collectibles/collectibleTypes';
import { computeSkullCount } from '../gameplay/collectibles/collectibleSpawnPlanner';
import { getVegetableBonusFrame, getVegetableBonusName, getVegetableBonusScore } from '../gameplay/collectibles/vegetableBonusCatalog';
import { createPixelText } from './pixelTextView';

const TRANSITION_DEPTH = 240;
const PANEL_MARGIN_X = 8;
const PANEL_MARGIN_Y = 9;
const PANEL_WIDTH = 696;
const PANEL_HEIGHT = 696;
const PANEL_X = MAZE.imageX + PANEL_MARGIN_X;
const PANEL_Y = MAZE.imageY + PANEL_MARGIN_Y;
const CENTER_X = SCREEN.width / 2;
const CYAN = 0x00bfff;
const GREEN = 0x51ff51;
const RED_ORANGE = 0xff5100;
const BLACK = 0x000000;
const WHITE = 0xffffff;
const HEART_CENTER_OFFSET_X = 2;

/** Runtime facade for the arcade-style PART screen shown between playable boards. */
export interface LevelTransitionView {
  readonly isVisible: boolean;
  showForUpcomingLevel(levelNumber: number, spawnPlan: CollectibleSpawnPlan): void;
  hide(): void;
  destroy(): void;
}

class PhaserLevelTransitionView implements LevelTransitionView {
  private readonly scene: Phaser.Scene;
  private objects: Phaser.GameObjects.GameObject[] = [];
  private visible = false;

  public constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public get isVisible(): boolean {
    return this.visible;
  }

  /** Rebuilds the transition panel for the upcoming part. */
  public showForUpcomingLevel(levelNumber: number, spawnPlan: CollectibleSpawnPlan): void {
    this.hide();
    this.visible = true;

    this.objects.push(
      this.scene.add
        .rectangle(PANEL_X, PANEL_Y, PANEL_WIDTH, PANEL_HEIGHT, BLACK)
        .setOrigin(0, 0)
        .setDepth(TRANSITION_DEPTH),
    );

    this.addText(`PART ${Math.max(1, Math.floor(levelNumber))}`, CENTER_X, PANEL_Y + 62, 28, CYAN, 'center');
    this.addVegetableBonusRow(levelNumber, PANEL_Y + 162);
    this.addText(getVegetableBonusName(levelNumber), CENTER_X, PANEL_Y + 232, 26, COLLECTIBLE_TINTS.yellow, 'center');
    this.addSkullRow(levelNumber, PANEL_Y + 330);
    this.addLetterRow(spawnPlan, PANEL_Y + 434);
    this.addHeartRow(spawnPlan, PANEL_Y + 516);
    this.addText('GOOD LUCK', CENTER_X, PANEL_Y + 625, 26, RED_ORANGE, 'center');
  }

  public hide(): void {
    for (const object of this.objects) {
      object.destroy();
    }

    this.objects = [];
    this.visible = false;
  }

  public destroy(): void {
    this.hide();
  }

  private addVegetableBonusRow(levelNumber: number, centerY: number): void {
    const vegetableFrame = getVegetableBonusFrame(levelNumber);
    const scoreText = `= ${getVegetableBonusScore(levelNumber)}`;
    const scoreWidth = scoreText.length * 26;
    const iconSize = 52;
    const gap = 10;
    const totalWidth = iconSize + gap + scoreWidth;
    const startX = Math.round(CENTER_X - totalWidth / 2);

    const icon = this.scene.add
      .image(startX + iconSize / 2, centerY, ASSET_KEYS.vegetables, vegetableFrame)
      .setOrigin(0.5, 0.5)
      .setDisplaySize(iconSize, iconSize)
      .setDepth(TRANSITION_DEPTH + 1);

    this.objects.push(icon);
    this.addText(scoreText, startX + iconSize + gap, centerY, 26, GREEN, 'left', 0.5);
  }

  private addSkullRow(levelNumber: number, centerY: number): void {
    const skullCount = computeSkullCount(levelNumber);
    this.addIconRow(
      Array.from({ length: skullCount }, () => ({ frame: COLLECTIBLE_FRAMES.skull, tint: WHITE })),
      centerY,
      64,
      14,
    );
  }

  private addLetterRow(spawnPlan: CollectibleSpawnPlan, centerY: number): void {
    const previewLetters = spawnPlan.transitionPreviewLetters.length > 0
      ? spawnPlan.transitionPreviewLetters
      : spawnPlan.placements
        .filter((placement) => placement.kind === COLLECTIBLE_KIND.letter && placement.letter !== undefined)
        .map((placement) => placement.letter as LetterKind);

    this.addIconRow(
      previewLetters.map((letter) => ({ frame: COLLECTIBLE_FRAMES.letters[letter], tint: COLLECTIBLE_TINTS.blue })),
      centerY,
      64,
      14,
    );
  }

  private addHeartRow(spawnPlan: CollectibleSpawnPlan, centerY: number): void {
    const heartCount = spawnPlan.placements.filter((placement) => placement.kind === COLLECTIBLE_KIND.heart).length;
    const iconSize = 64;
    const separation = 12;
    const totalWidth = heartCount * iconSize + Math.max(0, heartCount - 1) * separation;
    const startX = Math.round(CENTER_X - totalWidth / 2);

    for (let i = 0; i < heartCount; i++) {
      const x = startX + i * (iconSize + separation) + iconSize / 2;
      const ring = this.scene.add
        .image(x, centerY, ASSET_KEYS.collectibles, COLLECTIBLE_FRAMES.heartRing)
        .setOrigin(0.5, 0.5)
        .setTint(COLLECTIBLE_TINTS.blue)
        .setDepth(TRANSITION_DEPTH + 1);
      const center = this.scene.add
        .image(x + HEART_CENTER_OFFSET_X, centerY, ASSET_KEYS.collectibles, COLLECTIBLE_FRAMES.heartCenter)
        .setOrigin(0.5, 0.5)
        .setTint(WHITE)
        .setDepth(TRANSITION_DEPTH + 2);

      this.objects.push(ring, center);
    }
  }

  private addIconRow(
    icons: readonly { readonly frame: number; readonly tint: number }[],
    centerY: number,
    iconSize: number,
    separation: number,
  ): void {
    const totalWidth = icons.length * iconSize + Math.max(0, icons.length - 1) * separation;
    const startX = Math.round(CENTER_X - totalWidth / 2);

    icons.forEach((icon, index) => {
      const sprite = this.scene.add
        .image(startX + index * (iconSize + separation) + iconSize / 2, centerY, ASSET_KEYS.collectibles, icon.frame)
        .setOrigin(0.5, 0.5)
        .setTint(icon.tint)
        .setDepth(TRANSITION_DEPTH + 1);

      this.objects.push(sprite);
    });
  }

  private addText(
    text: string,
    x: number,
    y: number,
    fontSize: 16 | 26 | 28,
    tint: number,
    align: 'left' | 'center' | 'right',
    originY = 0,
  ): void {
    const textObject = createPixelText(this.scene, {
      text,
      x,
      y,
      fontSize,
      tint,
      align,
      originY,
      depth: TRANSITION_DEPTH + 2,
    });

    this.objects.push(textObject);
  }
}

/** Creates the between-level PART screen facade. */
export function createLevelTransitionView(scene: Phaser.Scene): LevelTransitionView {
  return new PhaserLevelTransitionView(scene);
}
