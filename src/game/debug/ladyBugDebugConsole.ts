/**
 * Small browser-console debug facade for hands-on gameplay testing.
 *
 * The facade is intentionally installed only when the URL contains `?debug=1`.
 * It exposes high-level commands instead of raw scene internals, so test helpers
 * can exercise the same gameplay paths as the real fixed-step simulation.
 */
export interface LadyBugDebugConsoleHooks {
  status(): LadyBugDebugStatus;
  releaseNextEnemy(): LadyBugDebugCommandResult;
  releaseAllEnemies(): LadyBugDebugCommandResult;
  nextLevel(): LadyBugDebugLevelCommandResult;
  completeExtraWord(): LadyBugDebugWordCommandResult;
  completeSpecialWord(): LadyBugDebugWordCommandResult;
  runtime(): Record<string, unknown>;
}

export interface LadyBugDebugApi {
  help(): readonly string[];
  status(): LadyBugDebugStatus;
  releaseNextEnemy(): LadyBugDebugCommandResult;
  releaseAllEnemies(): LadyBugDebugCommandResult;
  nextLevel(): LadyBugDebugLevelCommandResult;
  completeExtraWord(): LadyBugDebugWordCommandResult;
  completeSpecialWord(): LadyBugDebugWordCommandResult;
  runtime(): Record<string, unknown>;
}

export interface LadyBugDebugStatus {
  readonly gameStarted: boolean;
  readonly titleScreenActive: boolean;
  readonly gameOverActive: boolean;
  readonly gamepadConnected: boolean;
  readonly fullscreenSupported: boolean;
  readonly fullscreenActive: boolean;
  readonly levelNumber: number;
  readonly livesRemaining: number;
  readonly score: number;
  readonly specialActiveLetters: readonly string[];
  readonly extraActiveLetters: readonly string[];
  readonly waitingForAudioUnlock: boolean;
  readonly playerEntryActive: boolean;
  readonly playerDeathActive: boolean;
  readonly pickupPopupActive: boolean;
  readonly endLevelFreezeActive: boolean;
  readonly levelTransitionActive: boolean;
  readonly queuedLevelNumber?: number;
  readonly hasEnemyReleaseCandidate: boolean;
  readonly allEnemiesInMaze: boolean;
  readonly enemies: readonly LadyBugDebugEnemyStatus[];
}

export interface LadyBugDebugEnemyStatus {
  readonly id: number;
  readonly runtimeState: string;
  readonly direction: string;
  readonly movementActive: boolean;
  readonly collisionActive: boolean;
  readonly visibleInLair: boolean;
  readonly arcadePixelPos: Readonly<{ x: number; y: number }>;
}

export interface LadyBugDebugCommandResult {
  readonly ok: boolean;
  readonly message: string;
  readonly releasedEnemy: boolean;
  readonly releasedEnemyCount?: number;
  readonly status: LadyBugDebugStatus;
}

export interface LadyBugDebugLevelCommandResult {
  readonly ok: boolean;
  readonly message: string;
  readonly previousLevelNumber: number;
  readonly levelNumber: number;
  readonly status: LadyBugDebugStatus;
}

export interface LadyBugDebugWordCommandResult {
  readonly ok: boolean;
  readonly message: string;
  readonly completedWord: 'extra' | 'special';
  readonly awardedLives: number;
  readonly livesRemaining: number;
  readonly status: LadyBugDebugStatus;
}

declare global {
  interface Window {
    ladyBugDebug?: LadyBugDebugApi;
    lbDebug?: LadyBugDebugApi;
  }
}

const HELP_LINES = [
  'ladyBugDebug.help() - show available debug commands',
  'ladyBugDebug.status() - inspect lives, score, gamepad and enemy states',
  'ladyBugDebug.releaseNextEnemy() - finish the current border-timer cycle and release the next waiting enemy',
  'ladyBugDebug.releaseAllEnemies() - repeat releaseNextEnemy until no enemy is waiting',
  'ladyBugDebug.nextLevel() - start the between-level transition for the next level',
  'ladyBugDebug.completeExtraWord() - simulate yellow EXTRA completion and award one life',
  'ladyBugDebug.completeSpecialWord() - simulate red SPECIAL completion and award three lives',
  'ladyBugDebug.runtime() - return raw scene/runtime objects for deeper manual inspection',
] as const;

export function installLadyBugDebugConsole(hooks: LadyBugDebugConsoleHooks): () => void {
  if (!isLadyBugDebugEnabled()) {
    return () => undefined;
  }

  const api: LadyBugDebugApi = {
    help(): readonly string[] {
      console.info('[LadyBugDebug] Available commands:\n' + HELP_LINES.join('\n'));
      return HELP_LINES;
    },

    status(): LadyBugDebugStatus {
      const status = hooks.status();
      console.info('[LadyBugDebug] status', status);
      return status;
    },

    releaseNextEnemy(): LadyBugDebugCommandResult {
      const result = hooks.releaseNextEnemy();
      console.info('[LadyBugDebug] releaseNextEnemy', result);
      return result;
    },

    releaseAllEnemies(): LadyBugDebugCommandResult {
      const result = hooks.releaseAllEnemies();
      console.info('[LadyBugDebug] releaseAllEnemies', result);
      return result;
    },

    nextLevel(): LadyBugDebugLevelCommandResult {
      const result = hooks.nextLevel();
      console.info('[LadyBugDebug] nextLevel', result);
      return result;
    },

    completeExtraWord(): LadyBugDebugWordCommandResult {
      const result = hooks.completeExtraWord();
      console.info('[LadyBugDebug] completeExtraWord', result);
      return result;
    },

    completeSpecialWord(): LadyBugDebugWordCommandResult {
      const result = hooks.completeSpecialWord();
      console.info('[LadyBugDebug] completeSpecialWord', result);
      return result;
    },

    runtime(): Record<string, unknown> {
      const runtime = hooks.runtime();
      console.info('[LadyBugDebug] runtime', runtime);
      return runtime;
    },
  };

  window.ladyBugDebug = api;
  window.lbDebug = api;
  console.info('[LadyBugDebug] Installed. Use ladyBugDebug.help() or lbDebug.help().');

  return () => {
    if (window.ladyBugDebug === api) {
      delete window.ladyBugDebug;
    }

    if (window.lbDebug === api) {
      delete window.lbDebug;
    }
  };
}

function isLadyBugDebugEnabled(): boolean {
  return new URLSearchParams(window.location.search).get('debug') === '1';
}
