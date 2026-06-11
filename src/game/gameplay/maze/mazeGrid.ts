import { add, equals, type Vector2i, VEC2 } from '../math/vector2';

const WALL_FLAGS = {
  none: 0,
  up: 1 << 0,
  down: 1 << 1,
  left: 1 << 2,
  right: 1 << 3,
} as const;

interface MazeDataFile {
  readonly width: number;
  readonly height: number;
  readonly cells: readonly number[];
}

export interface MazeStepResult {
  readonly allowed: boolean;
  readonly currentCell: Vector2i;
  readonly nextCell: Vector2i;
}

/** Runtime representation of data/maze.json. */
export class MazeGrid {
  private readonly cells: number[];

  public readonly width: number;
  public readonly height: number;

  private constructor(width: number, height: number, cells: readonly number[]) {
    this.width = width;
    this.height = height;
    this.cells = [...cells];
  }

  public static fromDataFile(data: unknown): MazeGrid {
    assertMazeDataFile(data);

    const expectedCellCount = data.width * data.height;
    if (data.cells.length !== expectedCellCount) {
      throw new Error(`Maze cell count mismatch. Expected ${expectedCellCount}, got ${data.cells.length}.`);
    }

    return new MazeGrid(data.width, data.height, data.cells);
  }

  public isInside(cell: Vector2i): boolean {
    return cell.x >= 0 && cell.x < this.width && cell.y >= 0 && cell.y < this.height;
  }

  public canMove(cell: Vector2i, direction: Vector2i): boolean {
    if (!this.isInside(cell) || equals(direction, VEC2.zero)) {
      return false;
    }

    const targetCell = add(cell, direction);
    if (!this.isInside(targetCell)) {
      return false;
    }

    return (this.getWallFlags(cell) & wallFlagForDirection(direction)) === 0;
  }

  public evaluateArcadePixelStep(
    arcadePixelPos: Vector2i,
    direction: Vector2i,
    collisionLead: Vector2i,
    arcadePixelToLogicalCell: (arcadePixel: Vector2i) => Vector2i,
  ): MazeStepResult {
    if (equals(direction, VEC2.zero)) {
      return { allowed: false, currentCell: VEC2.zero, nextCell: VEC2.zero };
    }

    const currentCell = arcadePixelToLogicalCell(arcadePixelPos);
    const nextPixelPos = add(arcadePixelPos, direction);
    const probePixel = add(nextPixelPos, collisionLead);
    const nextCell = arcadePixelToLogicalCell(probePixel);

    if (!this.isInside(currentCell)) {
      return { allowed: false, currentCell, nextCell };
    }

    if (equals(nextCell, currentCell)) {
      return { allowed: true, currentCell, nextCell };
    }

    return {
      allowed: this.canMove(currentCell, direction),
      currentCell,
      nextCell,
    };
  }

  private getWallFlags(cell: Vector2i): number {
    return this.cells[cell.y * this.width + cell.x] ?? WALL_FLAGS.none;
  }
}

function wallFlagForDirection(direction: Vector2i): number {
  if (equals(direction, VEC2.left)) {
    return WALL_FLAGS.left;
  }

  if (equals(direction, VEC2.right)) {
    return WALL_FLAGS.right;
  }

  if (equals(direction, VEC2.up)) {
    return WALL_FLAGS.up;
  }

  if (equals(direction, VEC2.down)) {
    return WALL_FLAGS.down;
  }

  return WALL_FLAGS.none;
}

function assertMazeDataFile(data: unknown): asserts data is MazeDataFile {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid maze data: expected object.');
  }

  const maybeData = data as Partial<MazeDataFile>;
  if (typeof maybeData.width !== 'number' || typeof maybeData.height !== 'number' || !Array.isArray(maybeData.cells)) {
    throw new Error('Invalid maze data: expected width, height and cells.');
  }
}
