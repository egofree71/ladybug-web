/**
 * Browser fullscreen helper for the desktop web build.
 *
 * Fullscreen requests must be triggered by a real user gesture, so GameScene
 * calls this helper from the F-key handler instead of trying to enter fullscreen
 * automatically during boot or level transitions.
 */
import Phaser from 'phaser';

const FULLSCREEN_KEY_CODE = 'KeyF';

type WebKitFullscreenDocument = Document & {
  readonly webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type FullscreenTargetElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

/** Returns true when the keyboard event should toggle the optional fullscreen mode. */
export function isFullscreenToggleKey(event: KeyboardEvent): boolean {
  return event.code === FULLSCREEN_KEY_CODE &&
    !event.repeat &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.metaKey;
}

/** Reports whether the current browser exposes a usable fullscreen API. */
export function isFullscreenSupported(): boolean {
  const target = document.documentElement as FullscreenTargetElement;
  return Boolean(document.fullscreenEnabled || target.webkitRequestFullscreen);
}

/** Reports whether the page is currently inside browser fullscreen mode. */
export function isFullscreenActive(): boolean {
  const fullscreenDocument = document as WebKitFullscreenDocument;
  return Boolean(document.fullscreenElement ?? fullscreenDocument.webkitFullscreenElement ?? null);
}

/** Toggles fullscreen around the main app wrapper and refreshes scaling. */
export async function toggleGameFullscreen(scene: Phaser.Scene): Promise<boolean> {
  if (!isFullscreenSupported()) {
    console.warn('[LadyBugWeb] Browser fullscreen is not available.');
    return false;
  }

  try {
    if (isFullscreenActive()) {
      await exitFullscreen();
    } else {
      await requestFullscreen(getGameFullscreenTarget(scene));
    }

    refreshSceneScale(scene);
    return true;
  } catch (error) {
    console.warn('[LadyBugWeb] Could not toggle fullscreen mode.', error);
    return false;
  }
}


function refreshSceneScale(scene: Phaser.Scene): void {
  scene.scale.refresh();
  window.requestAnimationFrame(() => {
    scene.scale.refresh();
  });
}

function getGameFullscreenTarget(scene: Phaser.Scene): FullscreenTargetElement {
  const appElement = scene.game.canvas.parentElement?.parentElement;
  return (appElement ?? scene.game.canvas.parentElement ?? scene.game.canvas) as FullscreenTargetElement;
}

async function requestFullscreen(target: FullscreenTargetElement): Promise<void> {
  if (target.requestFullscreen) {
    await target.requestFullscreen({ navigationUI: 'hide' });
    return;
  }

  await target.webkitRequestFullscreen?.();
}

async function exitFullscreen(): Promise<void> {
  const fullscreenDocument = document as WebKitFullscreenDocument;

  if (document.exitFullscreen) {
    await document.exitFullscreen();
    return;
  }

  await fullscreenDocument.webkitExitFullscreen?.();
}
