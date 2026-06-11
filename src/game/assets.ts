/**
 * Centralized asset keys and URL helpers.
 *
 * Assets live in Vite's public/ directory. Using import.meta.env.BASE_URL keeps
 * the paths valid both in local development and on GitHub Pages under
 * /ladybug-web/.
 */
export const ASSET_KEYS = {
  mazeBackground: 'maze-background',
  borderTimerTiles: 'border-timer-tiles',
  rotatingGate: 'rotating-gate',
  ladybug: 'ladybug',
  playerDeathRed: 'player-death-red',
  playerDeathGhost: 'player-death-ghost',
  enemyLevel1: 'enemy-level-1',
  enemyLevel2: 'enemy-level-2',
  enemyLevel3: 'enemy-level-3',
  enemyLevel4: 'enemy-level-4',
  enemyLevel5: 'enemy-level-5',
  enemyLevel6: 'enemy-level-6',
  enemyLevel7: 'enemy-level-7',
  enemyLevel8: 'enemy-level-8',
  collectibles: 'collectibles',
  vegetables: 'vegetables',
  collectibleLayout: 'collectible-layout',
  mazeLayout: 'maze-layout',
  hudArcadeFont26: 'hud-arcade-font-26',
  hudArcadeFont28: 'hud-arcade-font-28',
  hudArcadeFont16: 'hud-arcade-font-16',
  enterMazeSound: 'enter-maze-sound',
  flowerPickupSound: 'flower-pickup-sound',
  collectiblePickupSound: 'collectible-pickup-sound',
  gateRotatedSound: 'gate-rotated-sound',
  deathSequenceSound: 'death-sequence-sound',
  enemyDeathSound: 'enemy-death-sound',
  enemyExitWarningSound: 'enemy-exit-warning-sound',
  timerStepSound: 'timer-step-sound',
  vegetablePickupSound: 'vegetable-pickup-sound',
  endLevelSound: 'end-level-sound',
} as const;

export function assetUrl(relativePath: string): string {
  return `${import.meta.env.BASE_URL}${relativePath}`;
}
