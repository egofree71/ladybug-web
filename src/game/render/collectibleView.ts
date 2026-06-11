import Phaser from 'phaser';
import { ASSET_KEYS } from '../assets';
import {
  COLLECTIBLE_FRAMES,
  COLLECTIBLE_LAYOUT,
  COLLECTIBLE_TINTS,
  collectFlowerCells,
  getCollectibleTopLeft,
  type CollectibleLayoutData,
} from '../layout/collectibleLayout';
import { generateSpecialCollectibleSpawnPlan } from '../gameplay/collectibles/collectibleSpawnPlanner';
import {
  COLLECTIBLE_COLOR,
  COLLECTIBLE_KIND,
  type CollectibleCell,
  type CollectibleColor,
  type CollectiblePlacement,
} from '../gameplay/collectibles/collectibleTypes';

const INITIAL_LEVEL_NUMBER = 1;

// In the Godot Collectible scene, the heart center overlay is positioned
// 2 pixels to the right of the main ring sprite. The frames are already
// 64x64 in the web build, so the same offset is applied directly here.
const HEART_CENTER_OFFSET_X = 2;

interface ColorCycleTarget {
  readonly sprite: Phaser.GameObjects.Sprite;
}

/**
 * Runtime view facade for all collectibles currently drawn on the board.
 *
 * It is deliberately visual-only for now. Later branches can extend the same
 * object with semantic lookup and collection behavior without making the color
 * cycle depend on Phaser's variable frame rate.
 */
export interface CollectibleFieldView {
  applyColorCycle(color: CollectibleColor): void;
}

class PhaserCollectibleFieldView implements CollectibleFieldView {
  private readonly colorCycleTargets: readonly ColorCycleTarget[];

  public constructor(colorCycleTargets: readonly ColorCycleTarget[]) {
    this.colorCycleTargets = colorCycleTargets;
  }

  /** Applies the current global heart/letter color to all active cycle targets. */
  public applyColorCycle(color: CollectibleColor): void {
    const tint = COLLECTIBLE_TINTS[color];

    for (const target of this.colorCycleTargets) {
      target.sprite.setTint(tint);
    }
  }
}

function cellKey(cell: CollectibleCell): string {
  return `${cell.x},${cell.y}`;
}

/**
 * Draws the level-1 collectible field.
 *
 * The renderer starts from the 11x11 base flower mask, then applies the same
 * special-start placement model as the Godot remake: three flowers are replaced
 * with letters, three with hearts, and level 1 receives two skulls. Collection,
 * scoring and player collision are intentionally out of scope for this branch.
 */
export function createLevelOneCollectibles(
  scene: Phaser.Scene,
  initialColor: CollectibleColor = COLLECTIBLE_COLOR.blue,
): CollectibleFieldView {
  const layout = scene.cache.json.get(ASSET_KEYS.collectibleLayout) as CollectibleLayoutData | undefined;

  if (!layout) {
    console.warn('[LadyBugWeb] Missing collectible layout JSON; collectibles were not rendered.');
    return new PhaserCollectibleFieldView([]);
  }

  const specialPlacements = generateSpecialCollectibleSpawnPlan(INITIAL_LEVEL_NUMBER).placements;
  const specialByCell = new Map<string, CollectiblePlacement>();
  const colorCycleTargets: ColorCycleTarget[] = [];

  for (const placement of specialPlacements) {
    specialByCell.set(cellKey(placement.cell), placement);
  }

  for (const cell of collectFlowerCells(layout)) {
    const placement = specialByCell.get(cellKey(cell));

    if (placement) {
      drawCollectible(scene, placement, initialColor, colorCycleTargets);
      continue;
    }

    drawCollectible(
      scene,
      {
        kind: COLLECTIBLE_KIND.flower,
        cell,
        color: COLLECTIBLE_COLOR.none,
      },
      initialColor,
      colorCycleTargets,
    );
  }

  return new PhaserCollectibleFieldView(colorCycleTargets);
}

function drawCollectible(
  scene: Phaser.Scene,
  placement: CollectiblePlacement,
  activeCycleColor: CollectibleColor,
  colorCycleTargets: ColorCycleTarget[],
): void {
  switch (placement.kind) {
    case COLLECTIBLE_KIND.heart:
      drawHeart(scene, placement, activeCycleColor, colorCycleTargets);
      break;

    case COLLECTIBLE_KIND.letter:
      drawLetter(scene, placement, activeCycleColor, colorCycleTargets);
      break;

    case COLLECTIBLE_KIND.skull:
      drawSingleFrame(scene, placement.cell, COLLECTIBLE_FRAMES.skull, COLLECTIBLE_TINTS.white);
      break;

    case COLLECTIBLE_KIND.flower:
    default:
      drawSingleFrame(scene, placement.cell, COLLECTIBLE_FRAMES.flower, COLLECTIBLE_TINTS.white);
      break;
  }
}

function drawHeart(
  scene: Phaser.Scene,
  placement: CollectiblePlacement,
  activeCycleColor: CollectibleColor,
  colorCycleTargets: ColorCycleTarget[],
): void {
  const ringSprite = drawSingleFrame(scene, placement.cell, COLLECTIBLE_FRAMES.heartRing, COLLECTIBLE_TINTS[activeCycleColor]);
  drawSingleFrame(
    scene,
    placement.cell,
    COLLECTIBLE_FRAMES.heartCenter,
    COLLECTIBLE_TINTS.white,
    1,
    HEART_CENTER_OFFSET_X,
  );

  colorCycleTargets.push({ sprite: ringSprite });
}

function drawLetter(
  scene: Phaser.Scene,
  placement: CollectiblePlacement,
  activeCycleColor: CollectibleColor,
  colorCycleTargets: ColorCycleTarget[],
): void {
  if (!placement.letter) {
    console.warn('[LadyBugWeb] Letter collectible without a letter kind was skipped.');
    return;
  }

  const letterSprite = drawSingleFrame(
    scene,
    placement.cell,
    COLLECTIBLE_FRAMES.letters[placement.letter],
    COLLECTIBLE_TINTS[activeCycleColor],
  );

  colorCycleTargets.push({ sprite: letterSprite });
}

function drawSingleFrame(
  scene: Phaser.Scene,
  cell: CollectibleCell,
  frame: number,
  tint: number,
  depthOffset = 0,
  offsetX = 0,
  offsetY = 0,
): Phaser.GameObjects.Sprite {
  const position = getCollectibleTopLeft(cell);

  return scene.add
    .sprite(position.x + offsetX, position.y + offsetY, ASSET_KEYS.collectibles, frame)
    .setOrigin(0, 0)
    .setTint(tint)
    .setDepth(COLLECTIBLE_LAYOUT.depth + depthOffset);
}
