import { equals, isHorizontal, isVertical, type Vector2i, VEC2, vec2 } from '../math/vector2';
import { PlayerTurnWindowMaps, type TurnLanePair } from './playerTurnWindowMaps';
import {
  PLAYER_TURN_ASSIST_FLAGS,
  PLAYER_TURN_PATH,
  type PlayerTurnWindowDecision,
} from './playerTurnTypes';

const ORIGINAL_SCREEN_Y_MIRROR_ORIGIN = 0xdd;
const COORDINATE_BYTE_MASK = 0xff;
const ASSISTED_PIXELS_BEFORE_NEXT_LANE = 4;
const ASSISTED_PIXELS_AFTER_PREVIOUS_LANE = 5;
const CLOSE_RANGE_PADDING_FOR_VERTICAL_TURNS = 2;
const CLOSE_RANGE_PADDING_FOR_HORIZONTAL_TURNS = 3;

/** Arcade-style turn-window policy ported from PlayerTurnWindowResolver.cs. */
export function choosePlayerTurnWindow(
  turnWindows: PlayerTurnWindowMaps,
  arcadePixelPos: Vector2i,
  requestedDirection: Vector2i,
  currentDirection: Vector2i,
  previousLaneTarget: Vector2i,
): PlayerTurnWindowDecision {
  if (isVertical(requestedDirection) && isHorizontal(currentDirection)) {
    return chooseVerticalTurnFromHorizontalMovement(turnWindows, arcadePixelPos);
  }

  if (isHorizontal(requestedDirection) && isVertical(currentDirection)) {
    return chooseHorizontalTurnFromVerticalMovement(turnWindows, arcadePixelPos);
  }

  return {
    path: PLAYER_TURN_PATH.normal,
    laneTarget: previousLaneTarget,
    assistFlags: PLAYER_TURN_ASSIST_FLAGS.none,
  };
}

function chooseVerticalTurnFromHorizontalMovement(
  turnWindows: PlayerTurnWindowMaps,
  arcadePixelPos: Vector2i,
): PlayerTurnWindowDecision {
  const actorX = toWrappedCoordinate(arcadePixelPos.x);
  const originalScreenY = toOriginalScreenY(arcadePixelPos.y);
  const mask = turnWindows.verticalTurnWindowsByRow.getMaskForBand(originalScreenY);
  const lanes = turnWindows.verticalTurnWindowsByRow.findSurroundingLanes(mask, actorX);

  return chooseTurnPathAroundLanePair(
    actorX,
    lanes,
    (laneX) => vec2(laneX, arcadePixelPos.y),
    PLAYER_TURN_ASSIST_FLAGS.correctX,
    CLOSE_RANGE_PADDING_FOR_VERTICAL_TURNS,
  );
}

function chooseHorizontalTurnFromVerticalMovement(
  turnWindows: PlayerTurnWindowMaps,
  arcadePixelPos: Vector2i,
): PlayerTurnWindowDecision {
  const actorX = toWrappedCoordinate(arcadePixelPos.x);
  const originalScreenY = toOriginalScreenY(arcadePixelPos.y);
  const mask = turnWindows.horizontalTurnWindowsByColumn.getMaskForBand(actorX);
  const lanes = turnWindows.horizontalTurnWindowsByColumn.findSurroundingLanes(mask, originalScreenY);

  return chooseTurnPathAroundLanePair(
    originalScreenY,
    lanes,
    (laneY) => vec2(arcadePixelPos.x, fromOriginalScreenY(laneY)),
    PLAYER_TURN_ASSIST_FLAGS.correctY,
    CLOSE_RANGE_PADDING_FOR_HORIZONTAL_TURNS,
  );
}

function chooseTurnPathAroundLanePair(
  actorCoordinate: number,
  lanes: TurnLanePair,
  laneToTarget: (lane: number) => Vector2i,
  correctionFlag: number,
  closeRangePadding: number,
): PlayerTurnWindowDecision {
  const assistedStartBeforeNextLane = toWrappedCoordinate(lanes.nextLane - ASSISTED_PIXELS_BEFORE_NEXT_LANE);
  if (wrappedGreaterOrEqual(actorCoordinate, assistedStartBeforeNextLane)) {
    return assistedTurn(laneToTarget(lanes.nextLane));
  }

  const closeRangeStartBeforeNextLane = toWrappedCoordinate(assistedStartBeforeNextLane - closeRangePadding);
  if (wrappedGreaterOrEqual(actorCoordinate, closeRangeStartBeforeNextLane)) {
    return closeRangeAssistThenNormal(laneToTarget(lanes.nextLane), correctionFlag);
  }

  const assistedEndAfterPreviousLane = toWrappedCoordinate(lanes.previousLane + ASSISTED_PIXELS_AFTER_PREVIOUS_LANE);
  if (wrappedLessThan(actorCoordinate, assistedEndAfterPreviousLane)) {
    return assistedTurn(laneToTarget(lanes.previousLane));
  }

  const normalStartAfterPreviousLane = toWrappedCoordinate(assistedEndAfterPreviousLane + closeRangePadding);
  if (wrappedGreaterOrEqual(actorCoordinate, normalStartAfterPreviousLane)) {
    return normalMovement();
  }

  return closeRangeAssistThenNormal(laneToTarget(lanes.previousLane), correctionFlag);
}

function assistedTurn(target: Vector2i): PlayerTurnWindowDecision {
  return {
    path: PLAYER_TURN_PATH.assisted,
    laneTarget: target,
    assistFlags: PLAYER_TURN_ASSIST_FLAGS.none,
  };
}

function closeRangeAssistThenNormal(target: Vector2i, correctionFlag: number): PlayerTurnWindowDecision {
  return {
    path: PLAYER_TURN_PATH.closeRangeAssistThenNormal,
    laneTarget: target,
    assistFlags: correctionFlag,
  };
}

function normalMovement(): PlayerTurnWindowDecision {
  return {
    path: PLAYER_TURN_PATH.normal,
    laneTarget: VEC2.zero,
    assistFlags: PLAYER_TURN_ASSIST_FLAGS.none,
  };
}

function toWrappedCoordinate(value: number): number {
  return value & COORDINATE_BYTE_MASK;
}

function wrappedGreaterOrEqual(a: number, b: number): boolean {
  return toWrappedCoordinate(a) >= toWrappedCoordinate(b);
}

function wrappedLessThan(a: number, b: number): boolean {
  return toWrappedCoordinate(a) < toWrappedCoordinate(b);
}

function toOriginalScreenY(godotArcadeY: number): number {
  return toWrappedCoordinate(ORIGINAL_SCREEN_Y_MIRROR_ORIGIN - godotArcadeY);
}

function fromOriginalScreenY(originalScreenY: number): number {
  return ORIGINAL_SCREEN_Y_MIRROR_ORIGIN - toWrappedCoordinate(originalScreenY);
}

export function hasTurnLaneTarget(target: Vector2i): boolean {
  return !equals(target, VEC2.zero);
}
