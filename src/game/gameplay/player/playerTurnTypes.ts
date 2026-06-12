/**
 * Shared type definitions for player turn windows and movement directions.
 */
import type { Vector2i } from '../math/vector2';

export const PLAYER_TURN_PATH = {
  normal: 'normal',
  assisted: 'assisted',
  closeRangeAssistThenNormal: 'close-range-assist-then-normal',
} as const;

export type PlayerTurnPath = (typeof PLAYER_TURN_PATH)[keyof typeof PLAYER_TURN_PATH];

export const PLAYER_TURN_ASSIST_FLAGS = {
  none: 0,
  correctY: 1 << 0,
  correctX: 1 << 1,
} as const;

export interface PlayerTurnWindowDecision {
  readonly path: PlayerTurnPath;
  readonly laneTarget: Vector2i;
  readonly assistFlags: number;
}
