# CLAUDE.md: working on Dominion Restored

An 8-bit, Bible-themed action adventure (Eden to Revelation) in plain HTML5 canvas and JavaScript, with no build step. Start with `README.md` for the game and its file layout, and `ROADMAP.md` for planned work.

## Branches
- Game work happens on `claude/dominion-restored-game-11hvfb` and reaches `main` through a pull request, only when the owner asks.
- The .NET MAUI app lives on `claude/maui-blazor-app`. Do not merge it into `main` or the game branch. Only update it when the owner asks; after a game change, merge the game branch into it and run `maui/scripts/sync-game.sh`.

## Checks before pushing
- `node tools/validate.js`: dungeon layouts, sprites and overworld connectivity.
- `node tools/flow.js 1,7`: plays dungeons end to end in headless Chromium. Needs `python3 -m http.server 8765` running from the repo root.
- Debug URL parameters: `?d=N&boss=1&god=1`, `&ow=1`, `?3d` / `?2d`.

## Claude page (playtest build)
- `python3 tools/claude-page/build.py <out.html>` builds a single-file copy of the game for the owner's Claude page. It inlines Three.js and appends `tools/claude-page/test-menu.js`.
- `test-menu.js` adds a **TESTS** box to the title screen. It exists only on the Claude page, never in the real game or the app.
- **Rule: every new testable area must get a line in TESTS.** That means the throne room (already there) and each dungeon's mini-game as it is built (see `ROADMAP.md`). Add an entry to the `TESTS()` list in `test-menu.js` with a start function that sets up the state the player would have when reaching it. Start through `testState(...)` so the run never writes the real save, and handle it in the `respawn` override so TRY AGAIN restarts the same test.
- **Mini-games are part of the real game.** They live in `js/minigames.js`, loaded after `js/game.js` (in `index.html`, `sw.js` and the Claude page build). One class per dungeon is registered in `MINI.games`. While `G.mini` is set, the mini-game runs the update and draws the screen, and each dungeon's circus tent stands on a different screen from the dungeon entrance (`MINI.tentScreen`: next to the dungeon's screen in the same land, never the land's first screen or gate screen); the tent is open from the start, before or after the dungeon is beaten (the owner's choice: some stories come before their dungeon, like Noah's, and some after); walking into the tent's door starts the mini-game, and the dungeon entrance stays a normal dungeon.
- **Rule: every mini-game, now and in the future, is entered through its own circus tent on a screen other than the dungeon entrance's.** Registering the mini-game in `MINI.games` under its dungeon's index is enough: the tent screen, placement, door and return trip are handled for it.
- After changing the game, rebuild and republish the Claude page.
