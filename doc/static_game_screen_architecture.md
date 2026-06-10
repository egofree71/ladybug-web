# Static Game Screen Architecture

This document describes the current state of the first implementation branch for the web version of Lady Bug.

Recommended branch: `feature/static-game-screen`.

The goal of this step is deliberately limited: render the main game screen correctly before implementing the dynamic gameplay.

## Branch Goal

This branch sets up the base visual structure:

- the Phaser canvas;
- the maze;
- the outer border that will later act as the timer;
- the 20 green rotating gates, displayed in their initial state;
- the top HUD: `SPECIAL`, `EXTRA`, `x2 x3 x5`;
- the bottom HUD: remaining lives and a temporary score.

This branch does not implement yet:

- player movement;
- collisions;
- enemies;
- flowers;
- hearts;
- letters;
- the real score system;
- interactive gate rotation;
- the real timer cycle.

The idea is to validate the visual frame first, so layout issues do not get mixed with gameplay issues.

## Reference Used

The Phaser version uses the Godot remake as the placement reference.

Important points taken from Godot:

- logical viewport: `800 x 880`;
- the `Level` scene is offset by `Main.cs` with `LevelScenePosition = (27, -1)`;
- the maze and gates belong to the `Level` scene, so they receive this offset;
- the HUD is rendered in a `CanvasLayer`, so it stays in screen coordinates and does not receive the `Level` scene offset.

This point matters: at first, the HUD and the maze looked misaligned because they do not use the same coordinate space in Godot.

## File Structure

### `src/main.ts`

Game entry point.

Responsibilities:

- import Phaser;
- import the stylesheet;
- load the arcade font before creating Phaser text objects;
- create the game HTML container;
- create the `Phaser.Game` instance;
- enable either the normal scaling mode or native mode depending on the URL.

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
- font name and font sizes.

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

### `src/game/render/hudView.ts`

View responsible for the static HUD.

Responsibilities:

- display `SPECIAL`;
- display `EXTRA`;
- display `x2 x3 x5`;
- display two reserve life icons;
- display a temporary score.

The HUD is still static. Dynamic colors for `SPECIAL` and `EXTRA`, multipliers, and the real score will be implemented later through a real game state.

### `src/game/scenes/GameScene.ts`

Current main Phaser scene.

Responsibilities:

- preload the required assets;
- display the maze background;
- call the rendering views:
  - timer border;
  - gates;
  - HUD.

This scene is intentionally simple. For now, it orchestrates rendering but does not contain gameplay logic.

## Assets Used

The assets required for this first step are in `public/assets`:

```text
public/assets/fonts/PressStart2P-Regular.ttf
public/assets/images/maze_background.png
public/assets/sprites/player/ladybug_spritesheet.png
public/assets/sprites/props/maze_border_timer_tiles.png
public/assets/sprites/props/rotating_gate.png
```

They come from the Godot remake.

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
- remember that Windows display scaling can still affect the final screenshot.

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
feature/border-timer-animation
feature/player-spawn
feature/player-grid-movement
feature/gate-rotation
feature/collectibles
feature/scoring-hud
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
- avoid mixing rendering, game logic, and dynamic state in the same file;
- prefer short branches with clear commits.
