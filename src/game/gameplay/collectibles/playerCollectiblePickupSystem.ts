import {
  arcadePixelToLogicalCell,
  logicalCellToArcadePixel,
} from '../../layout/playfieldCoordinates';
import { equals, type Vector2i } from '../math/vector2';
import type { PlayerMovementSegment, PlayerMovementStepResult } from '../player/playerMovementMotor';
import type { CollectibleFieldView } from '../../render/collectibleView';
import { NO_COLLECTIBLE_PICKUP, type CollectiblePickupResult } from './collectibleTypes';

/**
 * Consumes collectibles crossed by one player movement result.
 *
 * The movement motor may return more than one committed pixel segment during an
 * assisted turn: one alignment correction and one requested-direction step. The
 * pickup check therefore follows every segment instead of testing only the final
 * player cell. This mirrors the Godot player controller and prevents missed
 * flowers during tight turns.
 */
export function consumeCollectiblesAlongPlayerStep(
  stepResult: PlayerMovementStepResult,
  collectibleField: CollectibleFieldView,
): CollectiblePickupResult[] {
  if (!stepResult.moved) {
    return [];
  }

  const pickups: CollectiblePickupResult[] = [];

  if (stepResult.snappedArcadePixelPos) {
    const pickup = tryConsumeCollectibleAtExactAnchor(stepResult.snappedArcadePixelPos, collectibleField);
    if (pickup.consumed) {
      pickups.push(pickup);
    }
  }

  for (const segment of stepResult.movementSegments) {
    const pickup = tryConsumeCollectibleOnAnchorCrossing(segment, collectibleField);
    if (pickup.consumed) {
      pickups.push(pickup);
    }
  }

  return pickups;
}

function tryConsumeCollectibleAtExactAnchor(
  arcadePixelPos: Vector2i,
  collectibleField: CollectibleFieldView,
): CollectiblePickupResult {
  const cell = arcadePixelToLogicalCell(arcadePixelPos);
  const anchor = logicalCellToArcadePixel(cell);

  if (!equals(arcadePixelPos, anchor)) {
    return NO_COLLECTIBLE_PICKUP;
  }

  return collectibleField.tryConsumeCollectible(cell);
}

function tryConsumeCollectibleOnAnchorCrossing(
  segment: PlayerMovementSegment,
  collectibleField: CollectibleFieldView,
): CollectiblePickupResult {
  const currentCell = arcadePixelToLogicalCell(segment.endArcadePixelPos);
  const currentAnchor = logicalCellToArcadePixel(currentCell);

  if (!crossedAnchor(segment, currentAnchor)) {
    return NO_COLLECTIBLE_PICKUP;
  }

  return collectibleField.tryConsumeCollectible(currentCell);
}

function crossedAnchor(segment: PlayerMovementSegment, currentAnchor: Vector2i): boolean {
  const start = segment.startArcadePixelPos;
  const end = segment.endArcadePixelPos;
  const direction = segment.direction;

  if (direction.x > 0) {
    return start.x < currentAnchor.x && end.x >= currentAnchor.x;
  }

  if (direction.x < 0) {
    return start.x > currentAnchor.x && end.x <= currentAnchor.x;
  }

  if (direction.y > 0) {
    return start.y < currentAnchor.y && end.y >= currentAnchor.y;
  }

  if (direction.y < 0) {
    return start.y > currentAnchor.y && end.y <= currentAnchor.y;
  }

  return false;
}
