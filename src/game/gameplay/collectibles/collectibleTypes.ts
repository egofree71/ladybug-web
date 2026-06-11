/**
 * Semantic collectible types used by the web remake.
 *
 * The renderer must not infer gameplay meaning from sprite frames: hearts,
 * letters, flowers and skulls have different rules even when they share the
 * same sprite sheet. These lightweight string unions keep the model explicit
 * while staying compatible with TypeScript's erasable syntax settings.
 */
export const COLLECTIBLE_KIND = {
  flower: 'flower',
  heart: 'heart',
  letter: 'letter',
  skull: 'skull',
} as const;

export type CollectibleKind = (typeof COLLECTIBLE_KIND)[keyof typeof COLLECTIBLE_KIND];

/** Hearts and letters share the arcade color cycle. */
export const COLLECTIBLE_COLOR = {
  none: 'none',
  red: 'red',
  yellow: 'yellow',
  blue: 'blue',
  white: 'white',
} as const;

export type CollectibleColor = (typeof COLLECTIBLE_COLOR)[keyof typeof COLLECTIBLE_COLOR];

/** Logical letter identifiers used by the SPECIAL and EXTRA word systems. */
export type LetterKind = 'A' | 'E' | 'S' | 'P' | 'C' | 'I' | 'L' | 'X' | 'T' | 'R';

export interface CollectibleCell {
  readonly x: number;
  readonly y: number;
}

export interface CollectiblePlacement {
  readonly kind: CollectibleKind;
  readonly cell: CollectibleCell;
  readonly color: CollectibleColor;
  readonly letter?: LetterKind;
}

export interface CollectibleSpawnPlan {
  readonly placements: readonly CollectiblePlacement[];
  readonly transitionPreviewLetters: readonly LetterKind[];
}
