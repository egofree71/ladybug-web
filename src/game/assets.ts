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
  collectibles: 'collectibles',
  collectibleLayout: 'collectible-layout',
  mazeLayout: 'maze-layout',
  hudArcadeFont26: 'hud-arcade-font-26',
  hudArcadeFont28: 'hud-arcade-font-28',
  hudArcadeFont16: 'hud-arcade-font-16',
} as const;

export function assetUrl(relativePath: string): string {
  return `${import.meta.env.BASE_URL}${relativePath}`;
}
