/**
 * Bitmap-font text renderer used by HUD and overlays. It avoids browser text
 * antialiasing and provides a small generated fallback for missing glyphs such
 * as equals.
 */
import Phaser from 'phaser';
import { ASSET_KEYS } from '../assets';

const FONT_CHARACTERS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-*/:!?.';

const HUD_FONT_BY_SIZE = {
  16: {
    textureKey: ASSET_KEYS.hudArcadeFont16,
    frameWidth: 16,
    frameHeight: 20,
  },
  26: {
    textureKey: ASSET_KEYS.hudArcadeFont26,
    frameWidth: 26,
    frameHeight: 28,
  },
  28: {
    textureKey: ASSET_KEYS.hudArcadeFont28,
    frameWidth: 28,
    frameHeight: 28,
  },
} as const;

type PixelFontSize = keyof typeof HUD_FONT_BY_SIZE;
type PixelTextAlign = 'left' | 'center' | 'right';

type PixelTextOptions = {
  text: string;
  x: number;
  y: number;
  fontSize: PixelFontSize;
  tint: number;
  glyphTints?: readonly number[];
  align?: PixelTextAlign;
  originY?: number;
  depth?: number;
};

function measurePixelText(text: string, frameWidth: number): number {
  return text.length * frameWidth;
}

function getStartX(x: number, width: number, align: PixelTextAlign): number {
  if (align === 'center') {
    return Math.round(x - width / 2);
  }

  if (align === 'right') {
    return x - width;
  }

  return x;
}


function createEqualsGlyph(
  scene: Phaser.Scene,
  x: number,
  y: number,
  frameWidth: number,
  frameHeight: number,
  tint: number,
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0);
  const barWidth = Math.max(8, frameWidth - Math.round(frameWidth * 0.42));
  const barHeight = Math.max(2, Math.round(frameHeight * 0.11));
  const barX = x + Math.round((frameWidth - barWidth) / 2);
  const upperY = y + Math.round(frameHeight * 0.34);
  const lowerY = y + Math.round(frameHeight * 0.58);

  const upperBar = scene.add.rectangle(barX, upperY, barWidth, barHeight, tint).setOrigin(0, 0);
  const lowerBar = scene.add.rectangle(barX, lowerY, barWidth, barHeight, tint).setOrigin(0, 0);

  container.add([upperBar, lowerBar]);
  return container;
}

/**
 * Renders HUD labels with a generated bitmap font instead of Phaser Text.
 *
 * Phaser Text asks the browser canvas to rasterize a TrueType font, which adds
 * antialiasing even when the rest of the game is pixel-art. The HUD font atlas
 * used here was generated from the same Press Start 2P TTF but thresholded to
 * fully transparent or fully opaque pixels, matching the sharper Godot import.
 */
export function createPixelText(scene: Phaser.Scene, options: PixelTextOptions): Phaser.GameObjects.Container {
  const font = HUD_FONT_BY_SIZE[options.fontSize];
  const align = options.align ?? 'left';
  const originY = options.originY ?? 0;
  const width = measurePixelText(options.text, font.frameWidth);
  const startX = getStartX(options.x, width, align);
  const startY = Math.round(options.y - font.frameHeight * originY);
  const container = scene.add.container(0, 0).setDepth(options.depth ?? 0);

  [...options.text].forEach((character, characterIndex) => {
    if (character === ' ') {
      return;
    }

    const tint = options.glyphTints?.[characterIndex] ?? options.tint;

    if (character === '=') {
      const equalsGlyph = createEqualsGlyph(scene, startX + characterIndex * font.frameWidth, startY, font.frameWidth, font.frameHeight, tint);
      container.add(equalsGlyph);
      return;
    }

    const frame = FONT_CHARACTERS.indexOf(character);
    if (frame < 0) {
      console.warn(`[LadyBugWeb] Missing HUD bitmap glyph: "${character}"`);
      return;
    }

    const glyph = scene.add
      .image(startX + characterIndex * font.frameWidth, startY, font.textureKey, frame)
      .setOrigin(0, 0)
      .setTint(tint);

    container.add(glyph);
  });

  return container;
}
