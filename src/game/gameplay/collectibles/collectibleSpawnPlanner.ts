import {
  COLLECTIBLE_COLOR,
  COLLECTIBLE_KIND,
  type CollectibleCell,
  type CollectiblePlacement,
  type CollectibleSpawnPlan,
  type LetterKind,
} from './collectibleTypes';

const ANCHOR_FAMILY_A: readonly CollectibleCell[] = [
  { x: 0, y: 1 },
  { x: 0, y: 0 },
  { x: 3, y: 0 },
  { x: 4, y: 0 },
  { x: 5, y: 3 },
  { x: 5, y: 2 },
  { x: 5, y: 1 },
  { x: 5, y: 0 },
  { x: 6, y: 0 },
  { x: 7, y: 0 },
];

const ANCHOR_FAMILY_B: readonly CollectibleCell[] = [
  { x: 0, y: 10 },
  { x: 0, y: 9 },
  { x: 0, y: 8 },
  { x: 0, y: 7 },
  { x: 0, y: 6 },
  { x: 0, y: 5 },
  { x: 0, y: 4 },
  { x: 1, y: 8 },
  { x: 1, y: 5 },
  { x: 1, y: 4 },
  { x: 2, y: 8 },
  { x: 2, y: 4 },
  { x: 3, y: 10 },
  { x: 4, y: 10 },
  { x: 4, y: 5 },
];

const ANCHOR_FAMILY_C: readonly CollectibleCell[] = [
  { x: 6, y: 10 },
  { x: 6, y: 5 },
  { x: 7, y: 10 },
  { x: 8, y: 8 },
  { x: 8, y: 4 },
  { x: 9, y: 8 },
  { x: 9, y: 5 },
  { x: 9, y: 4 },
  { x: 10, y: 10 },
  { x: 10, y: 9 },
  { x: 10, y: 8 },
  { x: 10, y: 7 },
  { x: 10, y: 6 },
  { x: 10, y: 5 },
  { x: 10, y: 4 },
];

const DEFAULT_PREVIEW_SEED = 'ladybug-web-level-1-special-collectibles';

interface SeededRandom {
  nextIntInclusive(min: number, max: number): number;
}

function hashSeed(seed: string): number {
  let hash = 2166136261;

  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createSeededRandom(seed: string): SeededRandom {
  let state = hashSeed(seed) || 0x6d2b79f5;

  return {
    nextIntInclusive(min: number, max: number): number {
      state += 0x6d2b79f5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

      const normalized = ((value ^ (value >>> 14)) >>> 0) / 4294967296;
      return Math.floor(normalized * (max - min + 1)) + min;
    },
  };
}

/** Returns the number of skulls used by one level, matching the Godot rules. */
export function computeSkullCount(levelNumber: number): number {
  if (levelNumber <= 1) {
    return 2;
  }

  if (levelNumber <= 4) {
    return 3;
  }

  if (levelNumber <= 9) {
    return 4;
  }

  if (levelNumber <= 16) {
    return 5;
  }

  return 6;
}

/**
 * Generates the start-of-level plan for hearts, letters and skulls.
 *
 * This is a TypeScript port of the current Godot spawn planner. For the first
 * web preview branch the seed is fixed, making screenshots stable while still
 * exercising the real level-1 placement rules: three letters, three hearts and
 * two skulls replacing base flowers.
 */
export function generateSpecialCollectibleSpawnPlan(levelNumber: number, seed = DEFAULT_PREVIEW_SEED): CollectibleSpawnPlan {
  const effectiveLevelNumber = Math.max(1, Math.floor(levelNumber));
  const rng = createSeededRandom(`${seed}:${effectiveLevelNumber}`);

  const pickA = drawFourDistinctAnchors(ANCHOR_FAMILY_A, rng);
  const pickB = drawFourDistinctAnchors(ANCHOR_FAMILY_B, rng);
  const pickC = drawFourDistinctAnchors(ANCHOR_FAMILY_C, rng);
  const letters = drawLevelLetters(rng);
  const transitionPreviewLetters = buildTransitionPreviewLetters(letters);
  const permutation = drawLetterPermutation(rng);
  const skullCount = computeSkullCount(effectiveLevelNumber);

  const placements: CollectiblePlacement[] = [
    {
      kind: COLLECTIBLE_KIND.letter,
      cell: pickA[0],
      color: COLLECTIBLE_COLOR.red,
      letter: letters[permutation[0]],
    },
    {
      kind: COLLECTIBLE_KIND.letter,
      cell: pickB[0],
      color: COLLECTIBLE_COLOR.red,
      letter: letters[permutation[1]],
    },
    {
      kind: COLLECTIBLE_KIND.letter,
      cell: pickC[0],
      color: COLLECTIBLE_COLOR.red,
      letter: letters[permutation[2]],
    },
    {
      kind: COLLECTIBLE_KIND.heart,
      cell: pickA[1],
      color: COLLECTIBLE_COLOR.red,
    },
    {
      kind: COLLECTIBLE_KIND.heart,
      cell: pickB[1],
      color: COLLECTIBLE_COLOR.red,
    },
    {
      kind: COLLECTIBLE_KIND.heart,
      cell: pickC[1],
      color: COLLECTIBLE_COLOR.red,
    },
  ];

  const skullCells = [pickA[2], pickB[2], pickC[2], pickA[3], pickB[3], pickC[3]];

  for (let i = 0; i < skullCount; i++) {
    placements.push({
      kind: COLLECTIBLE_KIND.skull,
      cell: skullCells[i],
      color: COLLECTIBLE_COLOR.white,
    });
  }

  return {
    placements,
    transitionPreviewLetters,
  };
}

function drawFourDistinctAnchors(candidates: readonly CollectibleCell[], rng: SeededRandom): CollectibleCell[] {
  const pool = candidates.map((cell) => ({ ...cell }));
  const draws: CollectibleCell[] = [];

  for (let i = 0; i < 4; i++) {
    const pickedIndex = rng.nextIntInclusive(0, pool.length - 1);
    const [pickedCell] = pool.splice(pickedIndex, 1);
    draws.push(pickedCell);
  }

  return draws;
}

function drawLevelLetters(rng: SeededRandom): LetterKind[] {
  return [drawCommonLetter(rng), drawSpecialLetter(rng), drawExtraLetter(rng)];
}

function buildTransitionPreviewLetters(letters: readonly LetterKind[]): LetterKind[] {
  return [letters[2], letters[1], letters[0]];
}

function drawCommonLetter(rng: SeededRandom): LetterKind {
  return rng.nextIntInclusive(0, 1) === 0 ? 'A' : 'E';
}

function drawSpecialLetter(rng: SeededRandom): LetterKind {
  const roll = rng.nextIntInclusive(0, 7);

  if (roll === 0) {
    return 'S';
  }

  if (roll <= 2) {
    return 'P';
  }

  if (roll <= 4) {
    return 'C';
  }

  if (roll <= 6) {
    return 'I';
  }

  return 'L';
}

function drawExtraLetter(rng: SeededRandom): LetterKind {
  const roll = rng.nextIntInclusive(0, 3);

  if (roll === 0) {
    return 'X';
  }

  if (roll <= 2) {
    return 'T';
  }

  return 'R';
}

function drawLetterPermutation(rng: SeededRandom): number[] {
  const permutation = [0, 1, 2];

  for (let i = permutation.length - 1; i > 0; i--) {
    const j = rng.nextIntInclusive(0, i);
    [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
  }

  return permutation;
}
