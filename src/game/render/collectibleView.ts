/**
 * Phaser view and thin facade for the current collectible field. It owns sprites
 * but leaves scoring, word progress and popup timing to gameplay modules.
 */
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
  NO_COLLECTIBLE_PICKUP,
  type CollectibleCell,
  type CollectibleColor,
  type CollectiblePickupResult,
  type CollectiblePlacement,
  type CollectibleSpawnPlan,
} from '../gameplay/collectibles/collectibleTypes';

// In the Godot Collectible scene, the heart center overlay is positioned
// 2 pixels to the right of the main ring sprite. The frames are already
// 64x64 in the web build, so the same offset is applied directly here.
const HEART_CENTER_OFFSET_X = 2;

interface RuntimeCollectible {
  readonly cell: CollectibleCell;
  readonly kind: CollectiblePlacement['kind'];
  readonly letter?: CollectiblePlacement['letter'];
  readonly sprites: readonly Phaser.GameObjects.Sprite[];
  readonly colorSprites: readonly Phaser.GameObjects.Sprite[];
  color: CollectibleColor;
}

/**
 * Runtime view facade for all collectibles currently drawn on the board.
 *
 * The facade now owns both rendering and semantic lookup. It still keeps score,
 * multiplier and word-progress rules outside the renderer: pickup returns the
 * collectible state that was active at the exact moment of collection.
 */
export interface CollectibleFieldView {
  applyColorCycle(color: CollectibleColor): void;
  tryConsumeCollectible(cell: CollectibleCell): CollectiblePickupResult;
  tryConsumeSkullAt(cell: CollectibleCell): boolean;
  clearSkulls(): void;
  readonly remainingProgressCollectibleCount: number;
  readonly isLevelCleared: boolean;
  destroy(): void;
}

class PhaserCollectibleFieldView implements CollectibleFieldView {
  private readonly collectiblesByCell: Map<string, RuntimeCollectible>;

  public constructor(collectiblesByCell: Map<string, RuntimeCollectible>) {
    this.collectiblesByCell = collectiblesByCell;
  }

  public get remainingProgressCollectibleCount(): number {
    let count = 0;

    for (const runtimeCollectible of this.collectiblesByCell.values()) {
      if (isLevelProgressCollectible(runtimeCollectible.kind)) {
        count += 1;
      }
    }

    return count;
  }

  public get isLevelCleared(): boolean {
    return this.remainingProgressCollectibleCount <= 0;
  }

  /** Applies the current global heart/letter color to all active cycle targets. */
  public applyColorCycle(color: CollectibleColor): void {
    const tint = COLLECTIBLE_TINTS[color];

    for (const runtimeCollectible of this.collectiblesByCell.values()) {
      if (runtimeCollectible.kind !== COLLECTIBLE_KIND.heart && runtimeCollectible.kind !== COLLECTIBLE_KIND.letter) {
        continue;
      }

      runtimeCollectible.color = color;

      for (const sprite of runtimeCollectible.colorSprites) {
        sprite.setTint(tint);
      }
    }
  }

  /** Consumes one collectible at the given logical cell, including skull hazards. */
  public tryConsumeCollectible(cell: CollectibleCell): CollectiblePickupResult {
    const key = cellKey(cell);
    const runtimeCollectible = this.collectiblesByCell.get(key);

    if (!runtimeCollectible) {
      return NO_COLLECTIBLE_PICKUP;
    }

    this.collectiblesByCell.delete(key);

    for (const sprite of runtimeCollectible.sprites) {
      sprite.destroy();
    }

    return {
      consumed: true,
      kind: runtimeCollectible.kind,
      cell: runtimeCollectible.cell,
      color: runtimeCollectible.color,
      letter: runtimeCollectible.letter,
    };
  }

  /** Consumes a skull only when the requested cell currently contains one. */
  public tryConsumeSkullAt(cell: CollectibleCell): boolean {
    const key = cellKey(cell);
    const runtimeCollectible = this.collectiblesByCell.get(key);

    if (!runtimeCollectible || runtimeCollectible.kind !== COLLECTIBLE_KIND.skull) {
      return false;
    }

    this.collectiblesByCell.delete(key);

    for (const sprite of runtimeCollectible.sprites) {
      sprite.destroy();
    }

    return true;
  }

  /** Removes every remaining skull after one skull has killed the player. */
  public clearSkulls(): void {
    for (const [key, runtimeCollectible] of this.collectiblesByCell.entries()) {
      if (runtimeCollectible.kind !== COLLECTIBLE_KIND.skull) {
        continue;
      }

      this.collectiblesByCell.delete(key);

      for (const sprite of runtimeCollectible.sprites) {
        sprite.destroy();
      }
    }
  }

  /** Destroys every remaining collectible sprite before a new level field is drawn. */
  public destroy(): void {
    for (const runtimeCollectible of this.collectiblesByCell.values()) {
      for (const sprite of runtimeCollectible.sprites) {
        sprite.destroy();
      }
    }

    this.collectiblesByCell.clear();
  }
}

function isLevelProgressCollectible(kind: CollectiblePlacement['kind']): boolean {
  return kind === COLLECTIBLE_KIND.flower || kind === COLLECTIBLE_KIND.heart || kind === COLLECTIBLE_KIND.letter;
}

function cellKey(cell: CollectibleCell): string {
  return `${cell.x},${cell.y}`;
}

/**
 * Draws the collectible field for one level.
 *
 * The renderer starts from the 11x11 base flower mask, then applies the same
 * special-start placement model as the Godot remake: three flowers are replaced
 * with letters, three with hearts, and the level-dependent skull count replaces
 * additional flowers. Pickup and scoring rules are handled outside this renderer
 * via the returned facade.
 */
export function createLevelCollectibles(
  scene: Phaser.Scene,
  levelNumber: number,
  initialColor: CollectibleColor = COLLECTIBLE_COLOR.blue,
  spawnPlan?: CollectibleSpawnPlan,
): CollectibleFieldView {
  const layout = scene.cache.json.get(ASSET_KEYS.collectibleLayout) as CollectibleLayoutData | undefined;

  if (!layout) {
    console.warn('[LadyBugWeb] Missing collectible layout JSON; collectibles were not rendered.');
    return new PhaserCollectibleFieldView(new Map());
  }

  const specialPlacements = (spawnPlan ?? generateSpecialCollectibleSpawnPlan(levelNumber)).placements;
  const specialByCell = new Map<string, CollectiblePlacement>();
  const collectiblesByCell = new Map<string, RuntimeCollectible>();

  for (const placement of specialPlacements) {
    specialByCell.set(cellKey(placement.cell), placement);
  }

  for (const cell of collectFlowerCells(layout)) {
    const placement = specialByCell.get(cellKey(cell));

    if (placement) {
      drawCollectible(scene, placement, initialColor, collectiblesByCell);
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
      collectiblesByCell,
    );
  }

  return new PhaserCollectibleFieldView(collectiblesByCell);
}

function drawCollectible(
  scene: Phaser.Scene,
  placement: CollectiblePlacement,
  activeCycleColor: CollectibleColor,
  collectiblesByCell: Map<string, RuntimeCollectible>,
): void {
  switch (placement.kind) {
    case COLLECTIBLE_KIND.heart:
      drawHeart(scene, placement, activeCycleColor, collectiblesByCell);
      break;

    case COLLECTIBLE_KIND.letter:
      drawLetter(scene, placement, activeCycleColor, collectiblesByCell);
      break;

    case COLLECTIBLE_KIND.skull:
      registerCollectible(collectiblesByCell, placement, COLLECTIBLE_COLOR.white, [
        drawSingleFrame(scene, placement.cell, COLLECTIBLE_FRAMES.skull, COLLECTIBLE_TINTS.white),
      ]);
      break;

    case COLLECTIBLE_KIND.flower:
    default:
      registerCollectible(collectiblesByCell, placement, COLLECTIBLE_COLOR.none, [
        drawSingleFrame(scene, placement.cell, COLLECTIBLE_FRAMES.flower, COLLECTIBLE_TINTS.white),
      ]);
      break;
  }
}

function drawHeart(
  scene: Phaser.Scene,
  placement: CollectiblePlacement,
  activeCycleColor: CollectibleColor,
  collectiblesByCell: Map<string, RuntimeCollectible>,
): void {
  const ringSprite = drawSingleFrame(scene, placement.cell, COLLECTIBLE_FRAMES.heartRing, COLLECTIBLE_TINTS[activeCycleColor]);
  const centerSprite = drawSingleFrame(
    scene,
    placement.cell,
    COLLECTIBLE_FRAMES.heartCenter,
    COLLECTIBLE_TINTS.white,
    1,
    HEART_CENTER_OFFSET_X,
  );

  registerCollectible(collectiblesByCell, placement, activeCycleColor, [ringSprite, centerSprite], [ringSprite]);
}

function drawLetter(
  scene: Phaser.Scene,
  placement: CollectiblePlacement,
  activeCycleColor: CollectibleColor,
  collectiblesByCell: Map<string, RuntimeCollectible>,
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

  registerCollectible(collectiblesByCell, placement, activeCycleColor, [letterSprite], [letterSprite]);
}

function registerCollectible(
  collectiblesByCell: Map<string, RuntimeCollectible>,
  placement: CollectiblePlacement,
  color: CollectibleColor,
  sprites: readonly Phaser.GameObjects.Sprite[],
  colorSprites: readonly Phaser.GameObjects.Sprite[] = [],
): void {
  collectiblesByCell.set(cellKey(placement.cell), {
    cell: { ...placement.cell },
    kind: placement.kind,
    letter: placement.letter,
    color,
    sprites,
    colorSprites,
  });
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

/** Backwards-compatible alias kept for older scene code and ad-hoc tests. */
export function createLevelOneCollectibles(
  scene: Phaser.Scene,
  initialColor: CollectibleColor = COLLECTIBLE_COLOR.blue,
): CollectibleFieldView {
  return createLevelCollectibles(scene, 1, initialColor);
}
