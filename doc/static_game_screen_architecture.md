# Game Screen and Collectibles Architecture

This document describes the current state of the early Phaser web remake of Lady Bug.

The current implementation focuses on rendering the level-1 game screen and the first collectible systems. It is still a visual/gameplay foundation branch: player movement, collisions, enemies and real scoring are intentionally left for later work.

## Current Scope

The current branch implements:

- the Phaser canvas and scaling setup;
- the maze background;
- the outer border that will later act as the enemy-release timer;
- the 20 green rotating gates, displayed in their initial state;
- the top HUD: `SPECIAL`, `EXTRA`, `x2 x3 x5`;
- the bottom HUD: remaining lives and a temporary score;
- crisp bitmap-based HUD text rendering;
- base flower collectibles;
- level-1 special collectibles:
  - hearts;
  - letters;
  - skulls;
- a global color cycle for hearts and letters;
- a fixed-step gameplay timing helper that is independent from the browser display refresh rate.

The current branch does not implement yet:

- player movement;
- player/maze collisions;
- collectible pickup;
- score updates;
- `SPECIAL` / `EXTRA` word completion;
- multiplier activation from blue hearts;
- enemies;
- enemy spawning;
- interactive gate rotation;
- the real border timer animation;
- level transitions.

The goal is to validate the visual frame and the first timing-dependent collectible behavior before adding movement, collision and enemy logic.

## Reference Used

The Phaser version uses the Godot remake as the main placement and behavior reference.

Important points taken from Godot:

- logical viewport: `800 x 880`;
- the `Level` scene is offset by `Main.cs` with `LevelScenePosition = (27, -1)`;
- the maze, gates and collectibles belong to the `Level` scene, so they receive this offset;
- the HUD is rendered in a `CanvasLayer`, so it stays in screen coordinates and does not receive the `Level` scene offset;
- the collectible color cycle is separate from the maze-border / enemy-release timer.

This coordinate-space split matters: the HUD and the playfield do not use the same origin in Godot.

## File Structure

### `src/main.ts`

Game entry point.

Responsibilities:

- import Phaser;
- import the stylesheet;
- create the game HTML container;
- create the `Phaser.Game` instance;
- enable either normal scaling mode or native mode depending on the URL.

The normal mode uses `Phaser.Scale.FIT` to display the whole game screen inside the browser window.

Native mode can be enabled with:

```text
?native=1
```

Example:

```text
http://localhost:5173/ladybug-web/?native=1
```

This mode disables Phaser scaling and displays the canvas at the real `800 x 880` size. It is used for pixel measurements and alignment fixes.

### `src/style.css`

Global page style.

Responsibilities:

- black background;
- center the game container;
- remove default browser margins;
- use a different behavior when native mode is enabled.

In normal mode, the page tries to show the whole canvas without scrollbars.

In native mode, the canvas keeps its real size and the page may scroll if the browser window is too small.

### `src/game/assets.ts`

Centralizes Phaser asset keys and URL construction.

Assets are placed in `public/assets`, so they are served directly by Vite.

The `assetUrl()` function uses `import.meta.env.BASE_URL`, which keeps asset paths correct both locally and on GitHub Pages, where the project is served under:

```text
/ladybug-web/
```

### `src/game/layout/screenLayout.ts`

Central file for placement constants.

Responsibilities:

- canvas dimensions;
- Godot `Level` scene offset;
- maze position and dimensions;
- timer border parameters;
- HUD positions;
- colors;
- font sizes and sprite-based HUD text settings.

This file should remain the main source for global coordinates. The goal is to avoid spreading magic numbers across Phaser views.

### `src/game/layout/gateLayout.ts`

Contains the 20 rotating gates.

Positions are taken from `Level.tscn`, then adapted for Phaser rendering:

- add `LEVEL_SCENE_OFFSET`;
- add the visual offset used by the Godot sprite;
- convert to the center position used by Phaser sprites.

Each gate contains:

- an identifier;
- an `x` position;
- a `y` position;
- an orientation: `horizontal` or `vertical`.

For now, this data is only used to display the gates. Later, it can also become the basis for the logical gate state and collision rules.

### `src/game/layout/collectibleLayout.ts`

Contains collectible placement and sprite constants.

Responsibilities:

- define the collectible logical cell size;
- map semantic collectible types to sprite frames;
- define collectible tint colors;
- convert the serialized flower mask into logical cells;
- convert one collectible cell into a Phaser draw position.

Collectibles use a logical 11 x 11 grid. Each collectible cell is rendered as a `64 x 64` sprite, matching the current Godot scaling.

### `src/game/gameplay/collectibles/collectibleTypes.ts`

Defines the semantic model used for collectibles.

It keeps gameplay meaning separate from sprite frames:

- `flower`;
- `heart`;
- `letter`;
- `skull`.

It also defines the shared collectible colors:

- `red`;
- `yellow`;
- `blue`;
- `white`;
- `none`.

Hearts and letters share the same color cycle. Flowers and skulls do not.

### `src/game/gameplay/collectibles/collectibleSpawnPlanner.ts`

Generates the start-of-level special collectible plan.

For the current preview it handles level 1 only, but the functions are already structured around a `levelNumber` argument.

Responsibilities:

- start from the base flower layout;
- choose positions where flowers are replaced by special collectibles;
- place three letters;
- place three hearts;
- place the level-dependent number of skulls;
- use deterministic seeded placement for stable test screenshots.

The level-1 result currently includes:

- 3 letters;
- 3 hearts;
- 2 skulls.

The letter selection follows the current Godot rules:

- one common letter: `A` or `E`;
- one `SPECIAL`-only letter: `S`, `P`, `C`, `I` or `L`;
- one `EXTRA`-only letter: `X`, `T` or `R`.

### `src/game/gameplay/collectibles/collectibleColorCycle.ts`

Owns the global color cycle used by hearts and letters.

Responsibilities:

- keep the current color state;
- advance one fixed gameplay tick at a time;
- report when the visible color changes.

The cycle starts in the blue phase, matching the current Godot level reset behavior.

The visible order is:

```text
blue -> red -> yellow -> blue
```

This cycle is intentionally independent from the maze-border / enemy-release timer.

### `src/game/gameplay/timing/fixedArcadeClock.ts`

Fixed-step timing helper for gameplay systems.

Phaser's `update()` callback runs whenever the browser renders a frame. That cadence can vary by monitor, device, power mode, browser throttling and tab visibility.

Gameplay systems must therefore advance from elapsed time, not from the number of rendered frames.

This helper:

- accumulates the elapsed browser-frame delta in milliseconds;
- dispatches fixed simulation steps when enough time has accumulated;
- may run several simulation ticks during a slow browser frame;
- may run no simulation tick during a very fast browser frame;
- caps very large frame deltas to avoid a huge catch-up burst after a suspended tab resumes.

The current fixed step duration is expressed in milliseconds on purpose, so it is not confused with the display refresh rate.

### `src/game/render/gateView.ts`

View responsible for rendering gates.

Responsibilities:

- iterate over `GATE_DEFINITIONS`;
- choose the spritesheet frame based on the gate orientation;
- create Phaser sprites;
- set their display depth.

This file does not contain rotation logic yet. That is intentional: interactive gate rotation will be handled in a separate branch.

### `src/game/render/mazeBorderTimerView.ts`

View responsible for rendering the outer maze border.

Responsibilities:

- build the ordered list of border tiles;
- choose the frame based on the tile role: corner, horizontal, or vertical;
- draw the tiles around the maze;
- temporarily color part of the cycle green.

The current green section is only a static preview. The real timer will later replace this fixed value.

The border is built in cycle order, so the future timer logic can advance a progression value without rewriting the whole rendering system.

### `src/game/render/pixelTextView.ts`

Renders HUD labels with generated bitmap glyphs instead of Phaser text objects.

This avoids browser canvas antialiasing on TTF text. The bitmap font atlases are generated from the same `PressStart2P-Regular.ttf` font, but the glyphs are thresholded to fully opaque or fully transparent pixels.

This gives the HUD a sharper pixel-art look, closer to the Godot import.

### `src/game/render/hudView.ts`

View responsible for the static HUD.

Responsibilities:

- display `SPECIAL`;
- display `EXTRA`;
- display `x2 x3 x5`;
- display two reserve life icons;
- display a temporary score.

The HUD is still mostly static. Dynamic colors for `SPECIAL` and `EXTRA`, multiplier activation and real score updates will be implemented later through a real game state.

### `src/game/render/collectibleView.ts`

View responsible for rendering collectibles.

Responsibilities:

- read `collectibles_layout.json` from the Phaser JSON cache;
- draw all base flower cells;
- replace selected flowers with level-1 hearts, letters and skulls;
- keep references to sprites affected by the color cycle;
- update heart and letter colors when the cycle changes.

The view currently exposes a small `CollectibleFieldView` facade with:

```ts
applyColorCycle(color)
```

This keeps the color-cycle update separate from Phaser rendering details.

The heart collectible is drawn in two parts:

- the colored outer ring;
- the white center overlay.

The center overlay uses the same small horizontal offset as the Godot collectible scene, so it appears visually centered inside the ring.

### `src/game/scenes/GameScene.ts`

Current main Phaser scene.

Responsibilities:

- preload the required assets;
- display the maze background;
- create the border timer preview;
- create the collectible field;
- create the rotating gates;
- create the HUD;
- run the fixed-step clock from Phaser's variable `update()` callback;
- advance the collectible color cycle from fixed simulation ticks.

The scene orchestrates the current systems, but it should not become a large gameplay class. Later branches should continue moving dedicated logic into focused modules.

## Assets Used

The assets used by the current implementation are in `public/assets`:

```text
public/assets/data/collectibles_layout.json
public/assets/fonts/PressStart2P-Regular.ttf
public/assets/fonts/hud_arcade_font_26.png
public/assets/fonts/hud_arcade_font_28.png
public/assets/images/maze_background.png
public/assets/sprites/player/ladybug_spritesheet.png
public/assets/sprites/props/collectibles.png
public/assets/sprites/props/maze_border_timer_tiles.png
public/assets/sprites/props/rotating_gate.png
```

They come from the Godot remake or are generated from its existing font assets.

## Scaling and Pixel-Perfect Measurements

During development, there are two different cases.

### Normal Mode

Without a special URL parameter, Phaser uses uniform scaling to display the whole game screen inside the browser window.

This is convenient for playing or checking the complete screen.

### Native Mode

With `?native=1`, the canvas stays exactly at `800 x 880`.

This mode is required for measuring gaps and alignments in pixels, because browser scaling can turn a logical 1-pixel movement into an apparent 2-pixel movement on screen.

For measurements, it is best to:

- use `?native=1`;
- keep the browser zoom at 100%;
- remember that operating-system display scaling can still affect the final screenshot.

## Timing Rules

The project should avoid tying gameplay speed to the display refresh rate.

Current rule:

- Phaser rendering can run at any browser/display cadence;
- gameplay timers advance through `FixedArcadeClock`;
- `FixedArcadeClock` uses elapsed milliseconds and fixed simulation steps;
- the collectible color cycle is separate from the future border timer / enemy-release cycle.

This separation is important because earlier web projects showed that frame-rate-dependent movement can behave differently on mobile browsers and desktop browsers.

## Deployment and Documentation

This document must stay in:

```text
doc/
```

It must not be placed in:

```text
public/
```

With Vite, the `public/` directory is copied into the final build. The `doc/` directory is not included in `dist` as long as it is not imported from the code.

To avoid deploying technical documents when testing the game:

- keep documentation files in `doc/`;
- do not import them from `src/`;
- deploy only the result of `npm run build`, that is, the `dist` directory;
- avoid a GitHub Pages configuration that publishes the repository root directly.

## Possible Next Steps

After this branch is validated, the next branches could be:

```text
feature/player-spawn
feature/player-grid-movement
feature/collectible-pickup
feature/scoring-hud
feature/gate-rotation
feature/border-timer-animation
feature/enemy-spawn
feature/enemy-movement
```

The exact order may change, but the idea is to keep branches small, each with a clear goal.

## Maintenance Notes

A few rules to keep for the next steps:

- do not fix positions only by eye from a scaled screenshot;
- use `?native=1` for pixel-perfect measurements;
- keep placement constants in `screenLayout.ts`;
- keep gate data in `gateLayout.ts`;
- keep collectible layout constants in `collectibleLayout.ts`;
- keep collectible rules in `src/game/gameplay/collectibles/`;
- keep browser-frame timing separate from gameplay timing;
- avoid mixing rendering, game logic and dynamic state in the same file;
- prefer short branches with clear commits.
