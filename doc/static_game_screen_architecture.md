# Game Screen and Collectibles Architecture

This document describes the current state of the early Phaser web remake of Lady Bug.

The current implementation focuses on the level-1 game screen, the first collectible systems, the initial player entry sequence, and the first playable player movement pass. Enemies, collectible pickup and real scoring are intentionally left for later work.

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
- a fixed-step gameplay timing helper that is independent from the browser display refresh rate;
- the initial HUD-to-maze player entry animation for level 1;
- a static in-maze player sprite shown at the level-start position after the entry animation finishes;
- keyboard-driven player movement advanced from fixed simulation ticks;
- static maze collision checks based on `maze.json`;
- arcade-style turn windows and assisted turns ported from the Godot movement motor;
- interactive rotating gates with logical blocking state and short turning visuals.

The current branch does not implement yet:

- collectible pickup;
- score updates;
- `SPECIAL` / `EXTRA` word completion;
- multiplier activation from blue hearts;
- enemies;
- enemy spawning;
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
- the collectible color cycle is separate from the maze-border / enemy-release timer;
- the player start cell is `Vector2i(5, 8)` in `Level.tscn`;
- the HUD life-entry animation is owned by the HUD, while the final in-maze player sprite uses the level coordinate system;
- player movement uses integer arcade-pixel coordinates and one-pixel committed movement segments;
- static walls and rotating gates are evaluated separately, matching the Godot playfield collision split;
- gates toggle their logical blocking axis immediately when pushed, then briefly display a diagonal turning frame.

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
- a logical pivot copied from `Level.tscn`;
- an orientation: `horizontal` or `vertical`.

The same data is now used both by the renderer and by the gate runtime state.

### `src/game/layout/playfieldCoordinates.ts`

Central coordinate converter for gameplay actors.

Responsibilities:

- mirror `LevelCoordinateSystem.cs`;
- convert logical cells to arcade-pixel anchors;
- convert arcade-pixel positions back to logical cells;
- convert gate pivots to arcade pixels;
- convert arcade-pixel positions and deltas to Phaser screen pixels.

Gameplay movement must use these conversions instead of measuring from the visible maze image, because Godot places actors relative to the Maze node position, not the visible image top-left.

### `src/game/layout/playerLayout.ts`

Contains the player placement helpers copied from the Godot remake.

Responsibilities:

- define the level-1 start cell;
- return the HUD-entry target position;
- convert the player movement motor arcade-pixel state into a rendered sprite center using the current render-offset direction.

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

### `src/game/gameplay/maze/mazeGrid.ts`

Runtime representation of `maze.json`.

Responsibilities:

- load the 11 x 11 logical maze;
- expose per-cell movement checks;
- evaluate one arcade-pixel step with a caller-provided collision lead;
- report whether the step stays in the current cell, crosses into another cell, or hits a fixed wall.

### `src/game/gameplay/playfield/playfieldCollision.ts`

Combines static maze walls with the dynamic rotating-gate overlay.

Responsibilities:

- evaluate fixed-wall collisions with the player static collision probe;
- evaluate rotating-gate contact with the shorter gate-contact probe;
- detect gate blocks both at the direct probe and when crossing a logical cell boundary;
- report whether a step is allowed, blocked by a fixed wall, or blocked by a pushable gate.

### `src/game/gameplay/gates/`

Runtime rotating-gate model.

Responsibilities:

- build gate states from `gateLayout.ts`;
- look up gates by id or pivot;
- detect whether a gate blocks one movement axis;
- accept player pushes when possible;
- toggle the logical gate state immediately on accepted push;
- keep the short visual turning state for fixed simulation ticks.

### `src/game/gameplay/player/`

Player input and movement subsystem.

Responsibilities:

- keep last-pressed-wins keyboard input state;
- move the player in integer arcade pixels;
- preserve short-tap movement context;
- apply rail snapping when starting or resuming movement;
- generate turn-window maps from `maze.json`;
- apply arcade-style turn windows and assisted turns;
- evaluate each committed pixel segment against fixed walls and rotating gates;
- push gates through the same movement step when contact is valid.

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
- create the runtime `GateSystem`;
- create Phaser sprites for all gate ids;
- choose the stable or diagonal spritesheet frame from the current runtime state;
- resynchronize sprites after fixed simulation ticks.

The gameplay decision still lives in `src/game/gameplay/gates/`; this view only reflects that state visually.

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
- display reserve life icons;
- display a temporary score;
- own the temporary HUD-to-maze life-entry sprite.

The HUD starts the travelling ladybug from the rightmost available life icon, then leaves only reserve lives visible while that temporary sprite moves into the maze. Dynamic colors for `SPECIAL` and `EXTRA`, multiplier activation and real score updates will be implemented later through a real game state.

### `src/game/render/playerView.ts`

View responsible for the in-maze player sprite and the entry animation frame setup.

Responsibilities:

- create the hidden in-maze player sprite at the level-start position;
- show the player after the HUD entry animation finishes;
- define the entry movement animations used by the temporary HUD sprite;
- apply movement-motor positions to the rendered sprite;
- switch and flip the sprite animation according to the current facing direction.

The file does not own movement rules. It receives arcade-pixel movement results from the player movement motor and turns them into screen coordinates.

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
- create the rotating gates and their runtime state;
- create the HUD;
- create the player view, input state and movement motor;
- start the HUD-to-maze player entry animation;
- run the fixed-step clock from Phaser's variable `update()` callback;
- advance the player entry animation from fixed simulation ticks;
- advance gate timers, collectible colors and player movement from fixed simulation ticks once the entry animation is finished.

The scene orchestrates the current systems, but it should not become a large gameplay class. Later branches should continue moving dedicated logic into focused modules.

## Assets Used

The assets used by the current implementation are in `public/assets`:

```text
public/assets/data/collectibles_layout.json
public/assets/data/maze.json
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
- the collectible color cycle is separate from the future border timer / enemy-release cycle;
- the player entry movement is advanced by the same fixed simulation ticks;
- player movement is advanced by fixed simulation ticks and one-pixel arcade movement segments;
- gate turning timers are advanced by fixed simulation ticks;
- the collectible color cycle is paused while the entry animation is active, matching the Godot flow where gameplay is frozen during the life-entry sequence.

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
feature/collectible-pickup
feature/scoring-hud
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
- keep gate authoring data in `gateLayout.ts`;
- keep gate runtime logic in `src/game/gameplay/gates/`;
- keep player movement logic in `src/game/gameplay/player/`;
- keep collectible layout constants in `collectibleLayout.ts`;
- keep collectible rules in `src/game/gameplay/collectibles/`;
- keep browser-frame timing separate from gameplay timing;
- avoid mixing rendering, game logic and dynamic state in the same file;
- prefer short branches with clear commits.
