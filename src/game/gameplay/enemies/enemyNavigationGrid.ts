/**
 * Logical navigation graph used by enemy pathfinding. It converts maze and
 * rotating-gate state into graph edges that can be searched without touching
 * Phaser objects.
 */
import { GateSystem } from '../gates/gateSystem';
import { add, type Vector2i } from '../math/vector2';
import { MazeGrid } from '../maze/mazeGrid';
import {
  MONSTER_DIR,
  MONSTER_DIRECTION_ORDER,
  monsterDirToVector,
  oppositeMonsterDir,
  type MonsterDir,
} from './monsterDirection';

interface EnemyNavigationCell {
  allowedDirections: MonsterDir;
  bfsDirection: MonsterDir;
}

/**
 * Enemy navigation grid: allowed directions plus BFS guidance toward Lady Bug.
 *
 * Static maze walls and the current rotating-gate states are rebuilt into the
 * allowed-direction mask before the BFS guidance map is generated.
 */
export class EnemyNavigationGrid {
  private readonly cells: EnemyNavigationCell[];
  public readonly width: number;
  public readonly height: number;

  public constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.cells = Array.from({ length: width * height }, () => ({
      allowedDirections: MONSTER_DIR.none,
      bfsDirection: MONSTER_DIR.none,
    }));
  }

  public isInside(cell: Vector2i): boolean {
    return cell.x >= 0 && cell.x < this.width && cell.y >= 0 && cell.y < this.height;
  }

  public isDirectionAllowed(cell: Vector2i, dir: MonsterDir): boolean {
    if (!this.isInside(cell) || dir === MONSTER_DIR.none) {
      return false;
    }

    return (this.getCell(cell).allowedDirections & dir) !== 0;
  }

  public getBfsDirection(cell: Vector2i): MonsterDir {
    if (!this.isInside(cell)) {
      return MONSTER_DIR.none;
    }

    return this.getCell(cell).bfsDirection;
  }

  public rebuildAllowedDirections(mazeGrid: MazeGrid, gateSystem: GateSystem): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = { x, y };
        let allowed: MonsterDir = MONSTER_DIR.none;

        for (const dir of MONSTER_DIRECTION_ORDER) {
          const vector = monsterDirToVector(dir);

          if (!mazeGrid.canMove(cell, vector)) {
            continue;
          }

          if (isBlockedByGateBoundary(cell, dir, gateSystem)) {
            continue;
          }

          allowed = (allowed | dir) as MonsterDir;
        }

        const navigationCell = this.getCell(cell);
        navigationCell.allowedDirections = allowed;
        navigationCell.bfsDirection = MONSTER_DIR.none;
      }
    }
  }

  public buildBfsGuidanceFromPlayer(playerCell: Vector2i): void {
    if (!this.isInside(playerCell)) {
      return;
    }

    const visited = new Set<string>();
    const queue: Vector2i[] = [];

    visited.add(cellKey(playerCell));
    queue.push(playerCell);

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        break;
      }

      for (const dir of MONSTER_DIRECTION_ORDER) {
        if (!this.isDirectionAllowed(current, dir)) {
          continue;
        }

        const next = add(current, monsterDirToVector(dir));
        const nextKey = cellKey(next);

        if (!this.isInside(next) || visited.has(nextKey)) {
          continue;
        }

        const returnDir = oppositeMonsterDir(dir);
        if (!this.isDirectionAllowed(next, returnDir)) {
          continue;
        }

        visited.add(nextKey);
        this.getCell(next).bfsDirection = returnDir;
        queue.push(next);
      }
    }
  }

  private getCell(cell: Vector2i): EnemyNavigationCell {
    return this.cells[cell.y * this.width + cell.x] ?? {
      allowedDirections: MONSTER_DIR.none,
      bfsDirection: MONSTER_DIR.none,
    };
  }
}

function isBlockedByGateBoundary(cell: Vector2i, dir: MonsterDir, gateSystem: GateSystem): boolean {
  const vector = monsterDirToVector(dir);

  if (vector.x !== 0) {
    const boundaryX = vector.x > 0 ? cell.x + 1 : cell.x;

    return gateAtPivotBlocks(gateSystem, { x: boundaryX, y: cell.y }, vector) ||
      gateAtPivotBlocks(gateSystem, { x: boundaryX, y: cell.y + 1 }, vector);
  }

  if (vector.y !== 0) {
    const boundaryY = vector.y > 0 ? cell.y + 1 : cell.y;

    return gateAtPivotBlocks(gateSystem, { x: cell.x, y: boundaryY }, vector) ||
      gateAtPivotBlocks(gateSystem, { x: cell.x + 1, y: boundaryY }, vector);
  }

  return false;
}

function gateAtPivotBlocks(gateSystem: GateSystem, pivot: Vector2i, movement: Vector2i): boolean {
  return gateSystem.getGateByPivot(pivot)?.blocksMovement(movement) ?? false;
}

function cellKey(cell: Vector2i): string {
  return `${cell.x},${cell.y}`;
}
