# Lady Bug Web Game Architecture

This document describes the current state of the Phaser / TypeScript web remake of **Lady Bug**.

The current implementation now contains a complete playable arcade loop around the level screen: Godot-style title screen, PART transition screens, HUD, collectibles, player movement, rotating gates, enemy release timer, enemies, vegetable bonus, score/lives, SPECIAL/EXTRA awards, gamepad input, debug helpers, level progression and Godot-style GAME OVER return to title.

The project is currently targeted at **desktop web play with keyboard or gamepad**. There is no dedicated mobile/touch version planned for this remake.

## Current Scope

The current branch implements:

- the Phaser canvas and scaling setup;
- `?native=1` native-pixel display mode for measurements;
- `?debug=1` browser-console debug helpers;
- browser gamepad support through Phaser's gamepad plugin;
- a Godot-style title screen with:
  - official logo image;
  - four animated enemy preview sprites;
  - animated ladybug prompt marker;
  - pulsing `PRESS ANY KEY` text;
  - start from keyboard or gamepad only;
- the maze background;
- the animated outer border enemy-release timer;
- level-dependent border timer cadence:
  - level 1: 9 fixed ticks per border tile;
  - levels 2-4: 6 fixed ticks per border tile;
  - level 5+: 3 fixed ticks per border tile;
- border timer warning/release events used by the enemy system;
- border timer sound cadence for level 1 and future level-aware speed-up;
- the 20 green rotating gates;
- the top HUD: `SPECIAL`, `EXTRA`, `x2 x3 x5`;
- the bottom HUD: reserve lives and score;
- up to five reserve life icons displayed in the HUD;
- a sharper bitmap-based HUD/overlay text renderer;
- base flower collectibles;
- level-dependent special collectibles:
  - hearts;
  - letters;
  - skulls;
- randomized heart, letter and skull placement for each board creation;
- reusable seeded collectible placement for deterministic tests/debugging;
- global color cycling for hearts and letters;
- score updates using the current blue-heart multiplier;
- blue-heart multiplier progression;
- SPECIAL progress from red letters;
- EXTRA progress from yellow letters;
- EXTRA completion award: +1 life, then EXTRA resets;
- SPECIAL completion award for this remake: +3 lives, then SPECIAL resets;
- collectible pickup for flowers, hearts and letters;
- temporary heart / letter pickup score popup;
- skull contact detection;
- skull removal and clearing of remaining skulls after player death starts;
- player death by skull or enemy;
- red shrink / ghost death sequence ported from Godot;
- player death sprite depth above rotating gates;
- life count updates after death;
- respawn from the HUD life icons when reserve lives remain;
- level 1 HUD-to-maze player entry after the initial PART screen;
- direct player placement at the start cell after later level transitions;
- keyboard and gamepad player movement;
- fixed-step gameplay timing independent from browser display refresh rate;
- static maze collision checks based on `maze.json`;
- arcade-style turn windows and assisted turns ported from the Godot movement motor;
- rotating-gate collision/push behavior separated from fixed-wall collision;
- four enemy slots;
- enemy lair waiting state with one visible animated waiting enemy;
- enemy release from the central lair through the border timer;
- enemy movement, enemy/player collision and enemy death on skull contact;
- level-dependent enemy visuals:
  - levels 1-8 introduce one insect type per level;
  - level 9+ uses four insect types across the four slots;
- level-dependent enemy pressure matching the Godot remake:
  - faster release timer by level;
  - earlier chase/BFS activations by level;
  - no separate raw movement-speed increase;
- central vegetable bonus when all four enemies are in the maze;
- vegetable scoring by level, from 1000 to 9500 points;
- temporary enemy freeze after vegetable pickup while enemy collision stays fatal;
- level completion after all flowers, hearts and letters are consumed;
- board clear flow:
  - frozen cleared board;
  - PART transition preview screen;
  - next level setup;
- Godot-style GAME OVER overlay inside the maze panel;
- automatic return to the title screen after the measured 128-frame game-over duration;
- gameplay sounds for:
  - player entry;
  - flower pickup;
  - heart / letter pickup;
  - gate rotation;
  - player death;
  - enemy release warning;
  - enemy death;
  - border timer tick;
  - vegetable pickup;
  - end-level transition;
- non-blocking audio behavior: if browser audio is still locked, gameplay does not pause and late startup sounds are skipped instead of drifting.

The current branch does not try to be a fully arcade-perfect emulation. Known areas that may still deserve refinement later:

- enemy movement edge cases around rotating gates and off-center decisions;
- exact arcade scoring/credit behavior for SPECIAL, because this remake uses +3 lives instead of a free game;
- broader polish such as high-score tables, attract mode or additional presentation screens.

## Reference Used

The Phaser version uses the Godot remake as the main placement and behavior reference.

Important points taken from Godot:

- logical viewport: `800 x 880`;
- the `Level` scene is offset by `Main.cs` with `LevelScenePosition = (27, -1)`;
- the maze, gates, collectibles, enemies and central vegetable belong to the `Level` scene coordinate space;
- the HUD is rendered in a `CanvasLayer`, so it stays in screen coordinates and does not receive the `Level` scene offset;
- the collectible color cycle is separate from the maze-border / enemy-release timer;
- the player start cell is `Vector2i(5, 8)` in `Level.tscn`;
- the initial life-entry animation is owned by the HUD, while the final in-maze player sprite uses the level coordinate system;
- later level transitions place the player directly at the level start instead of replaying the HUD entry;
- player and enemy movement use integer arcade-pixel coordinates and one-pixel committed movement segments;
- static walls and rotating gates are evaluated separately;
- gates toggle their logical blocking axis immediately when pushed, then briefly display a diagonal turning frame;
- collectible pickup follows the exact movement segments returned by the player motor so assisted turns do not skip collectibles;
- flowers, hearts, letters and skulls are removed from the board when collected or touched;
- heart and letter pickups start a 30-tick popup state, hide the player sprite, and freeze normal board simulation until the popup completes;
- scores are calculated from the collectible kind, current color and current blue-heart multiplier;
- blue hearts advance the multiplier only after the blue heart itself has been scored;
- touching a skull starts the player death sequence;
- when one skull kills the player, all remaining skull icons are cleared;
- the red shrink and ghost-zigzag death animation is tick-based and uses the same frame durations as Godot;
- the current collectible field and gate orientations are preserved after losing a life;
- the player movement motor is reset to the start cell, then the next reserve life enters from the HUD;
- enemy release cadence changes by level;
- enemy chase pressure begins earlier on higher levels;
- enemy raw movement speed stays the same as in the current Godot version;
- GAME OVER is a timed overlay and returns to title automatically;
- title-screen keyboard/gamepad input is the normal browser audio unlock opportunity. If audio is still unavailable later, entry audio is skipped rather than played late.

The coordinate-space split matters: HUD and playfield objects do not use the same origin.

## High-Level Runtime Flow

### New game

```text
Title screen
-> player presses keyboard/gamepad start
-> create playfield shell
-> show PART 1 transition screen
-> create level 1 board
-> HUD life travels into maze
-> playable simulation starts
```

### Level clear

A level is cleared when all progress collectibles are gone:

```text
flowers + hearts + letters = required
skulls = not required
vegetable = not required
```

If the last pickup is a heart or letter, the score popup completes first.

Then the scene runs:

```text
120 fixed ticks frozen board
-> 120 fixed ticks PART preview screen
-> create next level board from the same spawn plan shown in the preview
-> place player directly at the start cell
-> playable simulation resumes
```

On level transition the score, lives and SPECIAL/EXTRA progress are preserved. The board runtime is rebuilt: flowers, hearts, letters, skulls, gates, enemies, vegetable, border timer, heart multiplier and color cycle all reset for the new level.

### Player death

On skull or enemy contact:

```text
clear transient popup state
-> start red shrink / ghost sequence
-> decrement lives
-> if lives remain: reset enemies/timer/player to a new attempt and replay HUD entry
-> if no lives remain: show GAME OVER overlay
```

After GAME OVER lasts 128 fixed ticks, the scene restarts and returns to a clean title screen.

## File Structure

### `src/main.ts`

Application entry point.

Responsibilities:

- import Phaser and the global stylesheet;
- install the Press Start 2P font CSS;
- load the arcade font before creating Phaser;
- create the `#game-container` element;
- create the `Phaser.Game` instance;
- enable the gamepad input plugin;
- enable normal scaling or native-pixel mode depending on the URL.

Normal mode uses `Phaser.Scale.FIT` to display the whole `800 x 880` screen inside the browser window.

Native mode can be enabled with:

```text
?native=1
```

Example:

```text
http://localhost:5173/ladybug-web/?native=1
```

This disables Phaser scaling and displays the canvas at its real `800 x 880` size for pixel measurements.

### `src/style.css`

Global page style.

Responsibilities:

- black background;
- center the game container;
- remove default browser margins;
- keep the page focused on a desktop web canvas;
- use different layout behavior when native mode is enabled.

In normal mode the page tries to show the whole canvas without scrollbars. In native mode, the real-size canvas may scroll if the browser window is too small.

### `src/game/assets.ts`

Centralizes Phaser asset keys and URL construction.

Responsibilities:

- define all image, spritesheet, JSON, font and audio keys;
- keep scene code away from raw asset-name strings;
- use `assetUrl()` with `import.meta.env.BASE_URL` so assets work locally and on GitHub Pages under `/ladybug-web/`.

### `src/game/audio/gameplaySoundPlayer.ts`

Central non-positional sound facade.

Responsibilities:

- play flower pickup;
- play heart / letter pickup;
- play rotating-gate accepted-push sound;
- play HUD-to-maze entry jingle;
- play player death sequence start;
- play enemy death on skull;
- play enemy release warning;
- play vegetable pickup;
- play end-level sound;
- advance the audible border-timer cadence from fixed simulation ticks;
- reset timer sound cadence when a board or attempt restarts;
- skip sounds safely while browser audio is locked.

Short effects such as pickups and gate rotations may stack. Entry, death, enemy warning and timer effects are restarted instead of stacked.

## Layout Modules

### `src/game/layout/screenLayout.ts`

Central file for screen placement constants.

Responsibilities:

- canvas dimensions;
- Godot `Level` scene offset;
- maze image and outer wall positions;
- timer border parameters;
- HUD positions;
- colors;
- font sizes and HUD text settings.

This file should remain the main source for global coordinates.

### `src/game/layout/gateLayout.ts`

Contains the 20 rotating gates.

Responsibilities:

- store gate identifiers;
- store visual positions converted from `Level.tscn`;
- store logical pivots;
- store initial orientation.

The same data is used by the renderer and by the gate runtime system.

### `src/game/layout/playfieldCoordinates.ts`

Central coordinate converter for gameplay actors.

Responsibilities:

- mirror Godot `LevelCoordinateSystem.cs` behavior;
- convert logical cells to arcade-pixel anchors;
- convert arcade-pixel positions back to logical cells;
- convert gate pivots to arcade pixels;
- convert arcade-pixel positions and deltas to Phaser screen pixels.

Gameplay movement should use these conversions rather than measuring from the visible maze bitmap.

### `src/game/layout/playerLayout.ts`

Player placement helpers copied from the Godot remake.

Responsibilities:

- define the level start cell;
- return the HUD-entry target position;
- convert the player movement motor state into the rendered sprite center using direction-specific offsets.

### `src/game/layout/collectibleLayout.ts`

Collectible placement and sprite constants.

Responsibilities:

- define the collectible logical cell size;
- map semantic collectible types to spritesheet frames;
- define collectible tint colors;
- convert the serialized flower mask into logical cells;
- convert one collectible cell into a Phaser draw position.

Collectibles use a logical `11 x 11` grid. Each collectible cell is rendered as a `64 x 64` sprite, matching the current Godot scaling.

## Gameplay Modules

### `src/game/gameplay/timing/fixedArcadeClock.ts`

Fixed-step timing helper.

Phaser `update()` runs at the browser display cadence, which can vary by monitor, browser and device. Gameplay systems therefore advance from elapsed milliseconds and fixed simulation ticks, not from rendered frames.

Responsibilities:

- accumulate browser-frame delta time;
- dispatch fixed simulation ticks;
- allow multiple simulation ticks during a slow render frame;
- allow zero simulation ticks during a very fast render frame;
- cap huge frame deltas to avoid extreme catch-up after tab suspension.

### `src/game/gameplay/math/vector2.ts`

Tiny immutable vector helper layer.

Responsibilities:

- provide common arcade directions;
- provide simple vector operations used by gameplay systems;
- avoid coupling movement code to Phaser vector objects.

### `src/game/gameplay/maze/mazeGrid.ts`

Runtime representation of `maze.json`.

Responsibilities:

- load the `11 x 11` logical maze;
- expose per-cell movement checks;
- evaluate one arcade-pixel step with a caller-provided collision lead;
- report whether a step stays in the current cell, crosses into another cell, or hits a fixed wall.

### `src/game/gameplay/playfield/playfieldCollision.ts`

Combines fixed maze walls with the dynamic rotating-gate overlay.

Responsibilities:

- evaluate fixed-wall collisions;
- evaluate rotating-gate contact with a shorter gate-contact probe;
- detect gate blocks at both direct probes and logical cell boundaries;
- report whether a step is allowed, blocked by a fixed wall, or blocked by a pushable gate.

### `src/game/gameplay/gates/`

Runtime rotating-gate model.

Files:

- `gateTypes.ts`: shared gate type constants;
- `rotatingGateRuntimeState.ts`: one gate's mutable runtime state;
- `gateSystem.ts`: full gate collection and push logic.

Responsibilities:

- build runtime gate states from `gateLayout.ts`;
- look up gates by id or pivot;
- detect which movement axis a gate blocks;
- accept player pushes when possible;
- toggle the logical gate state immediately on accepted push;
- keep the short visual turning state for fixed simulation ticks;
- expose accepted push counts so the scene can play exactly one sound per accepted push.

### `src/game/gameplay/collectibles/collectibleTypes.ts`

Semantic collectible model.

It keeps gameplay meaning separate from spritesheet frames:

- `flower`;
- `heart`;
- `letter`;
- `skull`.

It also defines shared collectible colors:

- `red`;
- `yellow`;
- `blue`;
- `white`;
- `none`.

Hearts and letters share the color cycle. Flowers and skulls do not.

### `src/game/gameplay/collectibles/collectibleSpawnPlanner.ts`

Builds the per-level plan for special collectibles.

Responsibilities:

- start from the base flower layout;
- choose flower positions that will be replaced by special collectibles;
- place three letters;
- place three hearts;
- place the level-dependent number of skulls;
- randomize positions and letters during normal gameplay;
- keep optional explicit seeds for deterministic testing;
- return transition-preview letters in the same order shown by `levelTransitionView.ts`.

Skull count by level:

```text
level 1      : 2 skulls
levels 2-4   : 3 skulls
levels 5-9   : 4 skulls
levels 10-16 : 5 skulls
level 17+    : 6 skulls
```

Letter generation follows the current Godot rules:

- one common letter: `A` or `E`;
- one `SPECIAL`-only letter: `S`, `P`, `C`, `I` or `L`;
- one `EXTRA`-only letter: `X`, `T` or `R`.

### `src/game/gameplay/collectibles/collectibleColorCycle.ts`

Global color cycle for hearts and letters.

Responsibilities:

- keep current color state;
- advance one fixed simulation tick at a time;
- report when visible color changes.

The cycle starts in the blue phase. The visible order is:

```text
blue -> red -> yellow -> blue
```

This cycle is independent from the border enemy-release timer.

### `src/game/gameplay/collectibles/collectiblePickupPopupState.ts`

Semantic state for the temporary heart / letter pickup score popup.

Responsibilities:

- store the collected cell;
- store base score, multiplier and final score delta;
- count the 30 fixed simulation ticks used by the popup pause;
- tell the scene when the popup has completed.

Rendering is handled by `collectiblePickupPopupView.ts`.

### `src/game/gameplay/collectibles/playerCollectiblePickupSystem.ts`

Detects collectibles crossed by one player movement step.

Responsibilities:

- inspect the snapped position reported by the movement motor;
- inspect every one-pixel movement segment;
- consume a collectible only when the player crosses a logical cell anchor;
- preserve assisted-turn behavior where one simulation tick may contain both an alignment correction and a requested-direction step.

Checking only the final player cell would miss pickups during tight assisted turns.

### `src/game/gameplay/collectibles/vegetableBonusCatalog.ts`

Level-to-vegetable lookup.

Responsibilities:

- map level numbers to vegetable spritesheet frames;
- map level numbers to vegetable names used on PART screens;
- compute vegetable scores.

Vegetable score starts at 1000 points and increases by 500 up to level 18. From level 18 onward the final frame and 9500-point value remain fixed.

### `src/game/gameplay/collectibles/vegetableBonusState.ts`

Runtime state for the central vegetable bonus.

Responsibilities:

- show the vegetable when all four enemies are in the maze;
- hide it if an enemy returns to the lair;
- prevent repeated pickup during the same all-enemies-out cycle;
- award fixed vegetable score;
- freeze enemy movement for 300 fixed ticks after pickup;
- keep enemy collision active during the freeze;
- restore enemy movement after the freeze;
- reset runtime state after player death or level setup.

### `src/game/gameplay/scoring/`

Score-related semantic state.

Files:

- `scoreState.ts`: stores current score;
- `heartMultiplierState.ts`: stores x2 / x3 / x5 blue-heart multiplier progression;
- `collectibleScoreService.ts`: calculates points for flowers, hearts and letters.

Current scoring rules:

- flower: 10 points times current multiplier;
- blue heart / letter: 100 points times current multiplier;
- yellow heart / letter: 300 points times current multiplier;
- red heart / letter: 800 points times current multiplier;
- vegetable: fixed score from the level catalog, not multiplied.

A blue heart is scored with the multiplier that was active before pickup, then it advances the multiplier for future collectibles.

### `src/game/gameplay/words/wordProgressState.ts`

Tracks SPECIAL and EXTRA progress.

Responsibilities:

- red letters can activate matching letters in SPECIAL;
- yellow letters can activate matching letters in EXTRA;
- blue letters are score-only;
- already-active letters do not change word progress again;
- report completed words to `GameScene`.

Completed-word awards are applied by `GameScene`:

- EXTRA adds one life and resets EXTRA;
- SPECIAL adds three lives in this remake and resets SPECIAL.

Word completion does not directly advance the level. Normal board clear still controls level progression.

### `src/game/input/gamepadInput.ts`

Small adapter around Phaser's browser gamepad plugin.

Responsibilities:

- find the first connected gamepad exposed by Phaser;
- report gamepad connection state for debug status;
- map the D-pad to four arcade directions;
- map the left analog stick to one dominant cardinal direction with a deadzone;
- give D-pad priority over analog stick;
- expose title-screen start detection using standard A / Start buttons.

### `src/game/gameplay/player/`

Player input, movement and death-sequence subsystem.

Files:

- `playerInputState.ts`: keyboard/gamepad last-pressed-wins direction buffer;
- `playerMovementMotor.ts`: fixed-tick one-pixel player movement motor;
- `playerMovementTuning.ts`: movement constants;
- `playerTurnTypes.ts`: turn-window data types;
- `playerTurnWindowMaps.ts`: generated turn-window maps from the maze;
- `playerTurnWindowResolver.ts`: arcade turn-window and assisted-turn resolution;
- `playerDeathSequenceState.ts`: semantic red/ghost death sequence.

Responsibilities:

- keep keyboard and gamepad input separate from movement rules;
- preserve last-pressed-wins behavior;
- move the player in integer arcade pixels;
- preserve short-tap movement context;
- apply rail snapping when starting or resuming movement;
- generate and use arcade-style turn windows;
- evaluate every committed pixel segment against fixed walls and rotating gates;
- push gates through the same movement step when contact is valid;
- keep the death sequence tick-based rather than render-frame-based.

### `src/game/gameplay/enemies/`

Enemy gameplay subsystem.

Files:

- `enemyReleaseBorderTimer.ts`: logical border timer and enemy release/warning events;
- `enemyLevelCatalog.ts`: enemy sprite selection by level and slot;
- `enemyMovementTuning.ts`: lair position, max count, movement offsets and decision-center checks;
- `monsterDirection.ts`: enemy direction constants and helpers;
- `monsterEntity.ts`: mutable runtime state for one enemy slot;
- `enemyNavigationGrid.ts`: allowed-direction grid and BFS guidance from the player's cell;
- `enemyBasePreferenceSystem.ts`: non-chase direction preference system;
- `enemyChaseSystem.ts`: level-dependent temporary BFS chase activation;
- `enemyMovementAi.ts`: one-pixel movement decision and collision checks;
- `enemySystem.ts`: four-slot lifecycle, release, movement, skull death and freeze coordination.

Responsibilities:

- create four enemy slots for the active level;
- keep only one waiting enemy visible in the lair;
- release the next waiting enemy when the border timer completes a release cycle;
- rebuild navigation guidance from the player's current logical cell;
- decide enemy movement only at valid decision centers;
- move enemies in one-pixel fixed simulation steps;
- use BFS chase override only while a slot's chase timer is active;
- apply deterministic fallback direction preferences otherwise;
- keep collision active for released enemies;
- detect enemy/skull contact at decision centers;
- return enemies killed by skulls to the lair;
- freeze and restore enemy movement through the vegetable bonus state;
- reset enemy runtime after player death without resetting collectibles or gates.

Level-dependent enemy pressure:

```text
border timer:
level 1      : 9 ticks per tile
levels 2-4   : 6 ticks per tile
level 5+     : 3 ticks per tile

first BFS chase activation:
level 1      : B8 = 0x15
levels 2-4   : B8 = 0x0D
level 5+     : B8 = 0x05
```

Enemy raw movement speed is not increased by level in the current Godot-aligned implementation.

## Render Modules

### `src/game/render/mazeBorderTimerView.ts`

View responsible for rendering the outer maze border timer.

Responsibilities:

- build the ordered list of border tiles;
- draw corner, horizontal and vertical border-timer sprites;
- own the `EnemyReleaseBorderTimer` runtime instance;
- configure the timer for the current level;
- advance the timer by one fixed simulation tick;
- repaint sprites as white or green from the runtime timer state;
- expose warning/release results to `GameScene` without reading sprite colors.

The border is built in cycle order so the logical timer can drive the visual ring directly.

### `src/game/render/gateView.ts`

View responsible for rendering rotating gates.

Responsibilities:

- iterate over `GATE_DEFINITIONS`;
- create the runtime `GateSystem`;
- create Phaser sprites for all gate ids;
- choose stable or diagonal spritesheet frames from runtime state;
- resynchronize sprites after fixed simulation ticks.

Gameplay decisions live in `src/game/gameplay/gates/`. This view only reflects that state visually.

### `src/game/render/pixelTextView.ts`

Bitmap-font text renderer used by HUD and overlays.

Responsibilities:

- render text from generated bitmap font atlases instead of browser text;
- support per-glyph tints for SPECIAL / EXTRA;
- support left, center and right alignment;
- avoid canvas antialiasing on TTF text;
- provide a small generated equals glyph because the current atlas does not contain `=`.

### `src/game/render/hudView.ts`

View responsible for the HUD.

Responsibilities:

- display SPECIAL;
- display EXTRA;
- display x2 / x3 / x5 multiplier labels;
- display up to five reserve life icons;
- display and update score;
- display and update multiplier indicators;
- display and update SPECIAL / EXTRA letter progress;
- own the temporary HUD-to-maze life-entry sprite.

The HUD starts the travelling ladybug from the rightmost available life icon, then hides only the source reserve icon while the temporary sprite moves into the maze. Scoring, word progress and multiplier state remain in gameplay classes and are pushed to the HUD by `GameScene`.

### `src/game/render/playerView.ts`

View responsible for the in-maze player sprite, death sprite and entry animations.

Responsibilities:

- create the hidden in-maze player sprite at the start position;
- show the player after HUD entry finishes;
- show the player directly at the start position after later level transitions;
- define entry movement animations used by the temporary HUD sprite;
- apply movement-motor positions to the rendered sprite;
- switch and flip the sprite animation according to facing direction;
- start and advance the red shrink / ghost death sprite sequence;
- render the death/ghost sequence above rotating gates;
- hide player visuals after the final life is lost.

Movement rules live in gameplay modules. This view converts arcade-pixel movement state into Phaser sprites.

### `src/game/render/titleScreenView.ts`

Godot-style title screen.

Responsibilities:

- draw a full black background;
- display `title_lady_bug_logo.png` centered at the Godot-authored position;
- display four decorative animated enemies above the logo;
- display an animated ladybug marker beside the prompt;
- pulse `PRESS ANY KEY` between white and grey;
- accept normal keyboard input, ignoring Escape and debug function keys;
- accept gamepad start from the primary controller using A / Start;
- intentionally not accept mouse clicks as start input.

### `src/game/render/gameOverView.ts`

Godot-style GAME OVER overlay.

Responsibilities:

- draw a black panel in the maze interior while leaving the HUD and purple frame visible;
- display `GAME OVER` centered in red-orange;
- stay visible while `GameScene` counts the measured 128 fixed ticks;
- let `GameScene` return to title automatically.

### `src/game/render/levelTransitionView.ts`

Arcade-style PART screen shown before each board.

Responsibilities:

- draw a black panel inside the purple maze frame while leaving the HUD visible;
- display the upcoming `PART` number;
- display the upcoming vegetable icon, score and name;
- display the upcoming skull count;
- display the three upcoming letters in transition-preview order;
- display the three heart icons;
- show `GOOD LUCK`;
- use the same pre-generated collectible spawn plan that will create the next board.

### `src/game/render/collectiblePickupPopupView.ts`

Temporary view shown when the player collects a heart or letter.

Responsibilities:

- place the popup at the logical cell anchor where the collectible was consumed;
- render the base score on the upper line;
- render the current multiplier in the lower-right popup area when greater than x1;
- use bitmap glyphs with a small shadow.

The player sprite is hidden and normal board simulation is frozen while this popup is active.

### `src/game/render/collectibleView.ts`

View responsible for rendering and consuming collectibles.

Responsibilities:

- read `collectibles_layout.json` from the Phaser JSON cache;
- draw all base flower cells;
- replace selected flowers with level/current-spawn-plan hearts, letters and skulls;
- keep semantic runtime state for each active collectible;
- keep references to sprites affected by the color cycle;
- update heart and letter colors when the cycle changes;
- consume flowers, hearts, letters and skulls when the player crosses their logical cell anchor;
- clear all remaining skulls after a skull starts the player death sequence;
- report when all progress collectibles have been consumed.

Progress collectibles are flowers, hearts and letters. Skulls do not need to be cleared to finish the level.

The heart collectible is drawn in two parts:

- colored outer ring;
- white center overlay.

### `src/game/render/enemyView.ts`

Phaser view for the enemy field.

Responsibilities:

- create the `EnemySystem` runtime for the current level;
- create four Phaser sprites;
- register shared enemy animations once;
- synchronize runtime enemy state into sprite position, visibility, texture and facing;
- keep waiting enemies animated in the lair without moving them;
- use right/up animations plus flips for left/down;
- hide all enemy sprites during the player death sequence when required;
- destroy enemy sprites when the level runtime is rebuilt.

Enemy movement, release and collision rules live in `src/game/gameplay/enemies/`.

### `src/game/render/vegetableBonusView.ts`

Phaser view for the central vegetable bonus.

Responsibilities:

- create the `VegetableBonusState` runtime for the current level;
- create the single vegetable sprite at the central lair position;
- mirror visibility and frame from runtime state;
- report pickup attempts from the player's arcade-pixel position;
- reset/destroy the sprite with the board runtime.

## Scene Orchestration

### `src/game/scenes/GameScene.ts`

Main Phaser scene and orchestration layer.

Responsibilities:

- preload all required visual and audio assets;
- create the title screen and GAME OVER overlay;
- install debug console hooks when `?debug=1` is present;
- create the playfield shell after title start;
- create and reset board runtime views for each level;
- run the fixed-step clock from Phaser's variable `update()` callback;
- advance title-screen animation from render delta;
- advance gameplay systems from fixed simulation ticks only;
- prioritize mutually exclusive flow states:
  - title screen;
  - GAME OVER;
  - HUD life entry;
  - player death;
  - pickup popup;
  - end-level freeze;
  - PART transition screen;
  - normal gameplay;
- advance gate timers, border timer, timer sound, vegetable state, enemies, player movement and color cycle in normal gameplay;
- consume collectibles along the player movement result;
- apply score, multiplier, word-progress and completed-word life awards;
- start pickup popup pause for hearts and letters;
- detect skull pickup and enemy collisions;
- manage death/respawn/game-over flow;
- manage level clear and transition flow;
- route gameplay events to `GameplaySoundPlayer`.

The scene coordinates systems, but gameplay rules should continue living in focused modules rather than growing directly inside this file.

## Debug Console

Debug helpers are installed only when the URL contains:

```text
?debug=1
```

Available globals:

```js
ladyBugDebug
lbDebug
```

Commands:

```js
ladyBugDebug.help();
ladyBugDebug.status();
ladyBugDebug.releaseNextEnemy();
ladyBugDebug.releaseAllEnemies();
ladyBugDebug.nextLevel();
ladyBugDebug.completeExtraWord();
ladyBugDebug.completeSpecialWord();
ladyBugDebug.runtime();
```

Intended use:

- inspect score, lives, level, gamepad and enemy state;
- force the next enemy release cycle for manual testing;
- release all enemies to test the vegetable quickly;
- trigger the next-level flow without manually clearing the board;
- simulate EXTRA and SPECIAL completion awards;
- access raw runtime objects for deeper local debugging.

The debug commands are intentionally high-level where possible, so they exercise the same systems used by normal gameplay.

## Assets Used

The assets used by the current implementation are in `public/assets`:

```text
public/assets/data/collectibles_layout.json
public/assets/data/maze.json
public/assets/fonts/PressStart2P-Regular.ttf
public/assets/fonts/hud_arcade_font_16.png
public/assets/fonts/hud_arcade_font_26.png
public/assets/fonts/hud_arcade_font_28.png
public/assets/images/maze_background.png
public/assets/images/title_lady_bug_logo.png
public/assets/audio/enter_maze.wav
public/assets/audio/flower_pickup.wav
public/assets/audio/collectible_pickup.wav
public/assets/audio/gate_rotated.wav
public/assets/audio/death_sequence.wav
public/assets/audio/enemy_exit.wav
public/assets/audio/death_enemy.wav
public/assets/audio/timer.wav
public/assets/audio/vegetable_pickup.wav
public/assets/audio/end_level.wav
public/assets/sprites/player/ladybug_spritesheet.png
public/assets/sprites/player/player_dead_red.png
public/assets/sprites/player/player_dead_ghost.png
public/assets/sprites/enemies/enemy_level1.png
public/assets/sprites/enemies/enemy_level2.png
public/assets/sprites/enemies/enemy_level3.png
public/assets/sprites/enemies/enemy_level4.png
public/assets/sprites/enemies/enemy_level5.png
public/assets/sprites/enemies/enemy_level6.png
public/assets/sprites/enemies/enemy_level7.png
public/assets/sprites/enemies/enemy_level8.png
public/assets/sprites/props/collectibles.png
public/assets/sprites/props/maze_border_timer_tiles.png
public/assets/sprites/props/rotating_gate.png
public/assets/sprites/props/vegetables.png
```

`public/assets/fonts/hud_arcade_font_22.png` is present in the repository but is not currently referenced by the TypeScript code.

## Timing Rules

The project should avoid tying gameplay speed to display refresh rate.

Current rule:

- Phaser rendering can run at any browser/display cadence;
- gameplay timers advance through `FixedArcadeClock`;
- `FixedArcadeClock` uses elapsed milliseconds and fixed simulation steps;
- the title screen pulse uses render delta because it is non-gameplay presentation;
- player entry movement advances by fixed simulation ticks;
- player and enemy movement advance by fixed simulation ticks and one-pixel arcade segments;
- gate turning timers advance by fixed simulation ticks;
- border timer visual progress advances by fixed simulation ticks;
- border timer sound cadence advances by fixed simulation ticks;
- collectible color cycle is separate from the border timer;
- collectible color cycle is paused during title, entry, popup, death, end-level freeze and transition states;
- gates, enemies, player movement and pickup processing are paused while popups, death, end-level freeze and transition screens are active;
- after title, the first board is preceded by a 120-tick PART transition screen;
- after board clear, gameplay is paused for a 120-tick frozen-board phase and then a 120-tick PART transition screen;
- GAME OVER lasts 128 fixed ticks;
- sound effects are triggered from gameplay events or fixed simulation ticks, not from render-frame callbacks;
- startup audio never blocks gameplay.

This separation is important because earlier web projects showed that frame-rate-dependent movement can behave differently on different browsers or displays.

## Scaling and Pixel-Perfect Measurements

During development there are two display modes.

### Normal Mode

Without a special URL parameter, Phaser uses uniform scaling to display the whole game screen inside the browser window.

This is convenient for playing or checking the complete screen.

### Native Mode

With `?native=1`, the canvas stays exactly at `800 x 880`.

This mode is required for measuring gaps and alignments in pixels, because browser scaling can turn a logical one-pixel movement into a different apparent distance on screen.

For measurements, it is best to:

- use `?native=1`;
- keep the browser zoom at 100%;
- remember that operating-system display scaling can still affect screenshots.

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

Potential later branches could focus on:

```text
feature/enemy-movement-refinements
feature/high-score-table
feature/attract-mode
feature/presentation-polish
```

The exact order may change, but branches should stay small and have a clear goal.

## Maintenance Notes

Rules to keep for future changes:

- do not fix positions only by eye from a scaled screenshot;
- use `?native=1` for pixel-perfect measurements;
- keep placement constants in `screenLayout.ts`;
- keep gate authoring data in `gateLayout.ts`;
- keep gate runtime logic in `src/game/gameplay/gates/`;
- keep player movement logic in `src/game/gameplay/player/`;
- keep enemy rules in `src/game/gameplay/enemies/`;
- keep input adapters in `src/game/input/` and let gameplay consume high-level direction state;
- keep collectible layout constants in `collectibleLayout.ts`;
- keep collectible rules in `src/game/gameplay/collectibles/`;
- keep scoring rules in `src/game/gameplay/scoring/`;
- keep word-progress rules in `src/game/gameplay/words/`;
- keep rendering facades in `src/game/render/`;
- keep browser-frame timing separate from gameplay timing;
- keep gameplay sound routing in `src/game/audio/`;
- keep browser audio-unlock handling non-blocking;
- avoid mixing rendering, game logic and dynamic state in the same file;
- prefer short branches with clear commits.
