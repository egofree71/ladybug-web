import Phaser from 'phaser';
import './style.css';
import { assetUrl } from './game/assets';
import { FONT, SCREEN } from './game/layout/screenLayout';
import { GameScene } from './game/scenes/GameScene';

function installArcadeFontCss(fontUrl: string): void {
  const style = document.createElement('style');
  style.textContent = `
    @font-face {
      font-family: '${FONT.family}';
      src: url('${fontUrl}') format('truetype');
      font-weight: 400;
      font-style: normal;
      font-display: block;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Loads the arcade font before Phaser creates text objects.
 *
 * The Godot remake also uses PressStart2P for the HUD. The web version registers
 * that TTF under the simple family name "LadyBugArcade" to avoid browser/canvas
 * quoting problems with font names containing spaces.
 */
async function loadArcadeFont(): Promise<void> {
  const fontUrl = assetUrl('assets/fonts/PressStart2P-Regular.ttf');
  installArcadeFontCss(fontUrl);

  if (!('fonts' in document) || !('FontFace' in window)) {
    return;
  }

  try {
    const arcadeFont = new FontFace(FONT.family, `url('${fontUrl}') format('truetype')`);
    const loadedFont = await arcadeFont.load();
    document.fonts.add(loadedFont);
    await document.fonts.load(`${FONT.topSizePx}px ${FONT.family}`);
    await document.fonts.ready;
  } catch (error) {
    // Keep the game bootable even if the browser cannot load the font. The HUD
    // will fall back to monospace, making the problem visible without blocking
    // the playfield preview.
    console.warn('[LadyBugWeb] Could not load arcade HUD font.', error);
  }
}

function usesNativePixelScale(): boolean {
  return new URLSearchParams(window.location.search).has('native');
}

/**
 * Creates the Phaser game once the arcade font is ready enough for the HUD.
 *
 * By default the canvas is fitted uniformly in the browser window, so the whole
 * 800x880 game is visible without scrollbars. Adding ?native=1 keeps the canvas
 * at the exact 800x880 native size for pixel measurements while tuning layout.
 */
async function bootstrap(): Promise<void> {
  const app = document.querySelector<HTMLDivElement>('#app') ?? document.body;
  const container = document.createElement('div');
  const nativePixelScale = usesNativePixelScale();

  document.body.classList.toggle('native-pixel-scale', nativePixelScale);

  container.id = 'game-container';
  app.appendChild(container);

  await loadArcadeFont();

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: container,
    width: SCREEN.width,
    height: SCREEN.height,
    backgroundColor: '#000000',
    pixelArt: true,
    roundPixels: true,
    scale: {
      // Normal mode: uniform fit, useful for playing and previewing the whole
      // screen. Native mode: no scaling, useful for checking exact pixel gaps.
      mode: nativePixelScale ? Phaser.Scale.NONE : Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [GameScene],
  });
}

void bootstrap();
