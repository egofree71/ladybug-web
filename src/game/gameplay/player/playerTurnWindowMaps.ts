/**
 * Precomputed turn-window maps derived from maze.json. They tell the movement
 * motor where assisted turns can begin before cell centers.
 */
import { type Vector2i } from '../math/vector2';
import { MazeGrid } from '../maze/mazeGrid';

const VERTICAL_BAND_ORIGIN = 0x36;
const VERTICAL_LANE_ORIGIN = 0x08;
const HORIZONTAL_BAND_ORIGIN = 0x08;
const HORIZONTAL_LANE_ORIGIN = 0x36;
const LANE_SPACING = 0x10;
const COORDINATE_BYTE_MASK = 0xff;

export interface TurnLanePair {
  readonly nextLane: number;
  readonly previousLane: number;
}

/**
 * Generated turn-lane masks used by the player turn-window resolver.
 *
 * The masks are derived from maze.json instead of being hardcoded. They only say
 * where intersection-like lanes exist; each committed movement pixel still goes
 * through the normal static-wall and rotating-gate collision resolver.
 */
export class PlayerTurnWindowMaps {
  public readonly verticalTurnWindowsByRow: TurnWindowMap;
  public readonly horizontalTurnWindowsByColumn: TurnWindowMap;

  private constructor(verticalTurnWindowsByRow: TurnWindowMap, horizontalTurnWindowsByColumn: TurnWindowMap) {
    this.verticalTurnWindowsByRow = verticalTurnWindowsByRow;
    this.horizontalTurnWindowsByColumn = horizontalTurnWindowsByColumn;
  }

  public static fromMazeGrid(mazeGrid: MazeGrid): PlayerTurnWindowMaps {
    if (mazeGrid.width > 16 || mazeGrid.height > 16) {
      throw new Error('Turn-window masks support at most 16x16 mazes.');
    }

    return new PlayerTurnWindowMaps(
      new TurnWindowMap(
        buildVerticalTurnMasksByOriginalRowBand(mazeGrid),
        VERTICAL_BAND_ORIGIN,
        VERTICAL_LANE_ORIGIN,
        LANE_SPACING,
      ),
      new TurnWindowMap(
        buildHorizontalTurnMasksByColumnBand(mazeGrid),
        HORIZONTAL_BAND_ORIGIN,
        HORIZONTAL_LANE_ORIGIN,
        LANE_SPACING,
      ),
    );
  }
}

export class TurnWindowMap {
  private readonly masksByBand: readonly number[];
  private readonly bandOrigin: number;
  private readonly laneOrigin: number;
  private readonly laneSpacing: number;

  public constructor(
    masksByBand: readonly number[],
    bandOrigin: number,
    laneOrigin: number,
    laneSpacing: number,
  ) {
    this.masksByBand = masksByBand;
    this.bandOrigin = bandOrigin;
    this.laneOrigin = laneOrigin;
    this.laneSpacing = laneSpacing;
  }

  public getMaskForBand(coordinate: number): number {
    const index = clamp(toWrappedCoordinate(coordinate - this.bandOrigin) >> 4, 0, this.masksByBand.length - 1);
    return this.masksByBand[index] ?? 0;
  }

  public findSurroundingLanes(mask: number, actorCoordinate: number): TurnLanePair {
    let previousLane: number | undefined;
    let nextLane: number | undefined;
    let lastEnabledLane = this.laneOrigin;
    let foundAnyLane = false;

    for (let bit = 0; bit < 16; bit++) {
      if (((mask >> bit) & 1) === 0) {
        continue;
      }

      const laneCoordinate = toWrappedCoordinate(this.laneOrigin + bit * this.laneSpacing);
      lastEnabledLane = laneCoordinate;
      foundAnyLane = true;

      if (laneCoordinate < actorCoordinate) {
        previousLane = laneCoordinate;
      } else if (nextLane === undefined) {
        nextLane = laneCoordinate;
      }
    }

    if (!foundAnyLane) {
      throw new Error(`Turn-window mask is empty: 0x${mask.toString(16)}`);
    }

    return {
      previousLane: previousLane ?? lastEnabledLane,
      nextLane: nextLane ?? toWrappedCoordinate(this.laneOrigin),
    };
  }
}

function buildVerticalTurnMasksByOriginalRowBand(mazeGrid: MazeGrid): number[] {
  const masks = Array.from({ length: mazeGrid.height }, () => 0);

  for (let y = 0; y < mazeGrid.height; y++) {
    const originalRowBandIndex = mazeGrid.height - 1 - y;

    for (let x = 0; x < mazeGrid.width; x++) {
      const cell = { x, y };
      if (isTurnCandidateCell(mazeGrid, cell)) {
        masks[originalRowBandIndex] = (masks[originalRowBandIndex] ?? 0) | (1 << x);
      }
    }
  }

  return masks;
}

function buildHorizontalTurnMasksByColumnBand(mazeGrid: MazeGrid): number[] {
  const masks = Array.from({ length: mazeGrid.width }, () => 0);

  for (let x = 0; x < mazeGrid.width; x++) {
    for (let y = 0; y < mazeGrid.height; y++) {
      const cell = { x, y };
      if (isTurnCandidateCell(mazeGrid, cell)) {
        const originalScreenYBit = mazeGrid.height - 1 - y;
        masks[x] = (masks[x] ?? 0) | (1 << originalScreenYBit);
      }
    }
  }

  return masks;
}

function isTurnCandidateCell(mazeGrid: MazeGrid, cell: Vector2i): boolean {
  return hasHorizontalOpening(mazeGrid, cell) && hasVerticalOpening(mazeGrid, cell);
}

function hasHorizontalOpening(mazeGrid: MazeGrid, cell: Vector2i): boolean {
  return mazeGrid.canMove(cell, { x: -1, y: 0 }) || mazeGrid.canMove(cell, { x: 1, y: 0 });
}

function hasVerticalOpening(mazeGrid: MazeGrid, cell: Vector2i): boolean {
  return mazeGrid.canMove(cell, { x: 0, y: -1 }) || mazeGrid.canMove(cell, { x: 0, y: 1 });
}

function toWrappedCoordinate(value: number): number {
  return value & COORDINATE_BYTE_MASK;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
