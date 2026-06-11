import Phaser from 'phaser';
import { MAZE, SCREEN } from '../layout/screenLayout';
import { createPixelText } from './pixelTextView';

const GAME_OVER_DEPTH = 260;
const PANEL_MARGIN_X = 8;
const PANEL_MARGIN_Y = 9;
const PANEL_WIDTH = 696;
const PANEL_HEIGHT = 696;
const PANEL_X = MAZE.imageX + PANEL_MARGIN_X;
const PANEL_Y = MAZE.imageY + PANEL_MARGIN_Y;
const BLACK = 0x000000;
const RED_ORANGE = 0xff5100;

/** Runtime facade for the Godot-style GAME OVER overlay. */
export interface GameOverView {
  readonly isVisible: boolean;
  showGameOver(): void;
  hide(): void;
  destroy(): void;
}

class PhaserGameOverView implements GameOverView {
  private readonly scene: Phaser.Scene;
  private objects: Phaser.GameObjects.GameObject[] = [];
  private visible = false;

  public constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public get isVisible(): boolean {
    return this.visible;
  }

  /** Shows only GAME OVER, centered inside the maze-inner panel like Godot. */
  public showGameOver(): void {
    this.hide();
    this.visible = true;

    this.objects.push(
      this.scene.add
        .rectangle(PANEL_X, PANEL_Y, PANEL_WIDTH, PANEL_HEIGHT, BLACK)
        .setOrigin(0, 0)
        .setDepth(GAME_OVER_DEPTH),
    );

    this.objects.push(
      createPixelText(this.scene, {
        text: 'GAME OVER',
        x: SCREEN.width * 0.5,
        y: PANEL_Y + PANEL_HEIGHT * 0.5,
        fontSize: 28,
        tint: RED_ORANGE,
        align: 'center',
        originY: 0.5,
        depth: GAME_OVER_DEPTH + 1,
      }),
    );
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
}

/** Creates the game-over overlay facade. */
export function createGameOverView(scene: Phaser.Scene): GameOverView {
  return new PhaserGameOverView(scene);
}
