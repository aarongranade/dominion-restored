# Dominion Restored: future ideas

Ideas the owner wants to build later. Nothing here is implemented yet. Check with the owner before starting any of it.

## Post-dungeon mini-games (owner's idea)

Once a dungeon's boss is defeated, a circus tent goes up on that dungeon's overworld screen, near its entrance; walking into the tent plays a mini-game unique to that dungeon (the owner's choice: the dungeon entrance itself stays a normal dungeon). Each of the ten gets its own.

**Styles to mix:** side-scrollers, endless runners and Bible quizzes, among others.

**Scripture ideas so far** (not yet assigned to dungeons):
- Creation
- Fleeing the garden
- The plagues
- Moses climbing the mountain
- Marching around Jericho
- Jonah
- Paul's missionary journeys
- An amusement park after the throne room

Notes for whoever builds it:
- Today, entering a finished dungeon in the restored world (after the Dragon) shows a message instead (`HEAVEN_TEXT.sealed` in `js/data.js`, handled in `GM.onEntrance` in `js/game.js`). Before the Dragon, finished dungeons can still be entered and walked through. The mini-games would replace both.
- The amusement park "after the throne" fits the new earth and throne room that come after the Dragon (`enterHeaven` in `js/game.js`).
- Add every mini-game to the Claude page's **TESTS** box (`TESTS()` in `tools/claude-page/test-menu.js`) so it can be played directly. See `CLAUDE.md`.

**Built so far (Claude page only, in `tools/claude-page/minigames.js`):**
- **Dungeon 1, Eden: Fleeing the Garden.** A vertical scroller. Adam and Eve, in fig-leaf aprons, run from the angel with the flaming sword, dodging thorns, trees, serpents, lions and boars for one minute. Hedges of thorns leave a four-bush gap, never more than four bushes from the last one. Three hits and the angel catches them, and the run restarts from the last checkpoint (every 20 seconds). At the end a cutscene shows the angel blocking the east gate (Genesis 3:24).
- **Dungeon 2, the Ark: Noah's Ark (Genesis 6-8).** Three phases, each with its own soft fail state that costs time or material rather than restarting from zero. *Gather:* free-roam a clearing on Ararat collecting 12 logs and 3 pitch while wolves prowl and a storm clock runs; a wolf knocks a carried item loose, and the clock running out reverts to a checkpoint banked every 12.5 seconds, not to zero. *Build:* frame and seal the ark's three decks while a flood meter rises; the storm occasionally pops a log back out of an unsealed deck, and running out of material sends Noah back to the clearing for an untimed top-up of just the shortfall (the flood keeps rising while he's away); if the flood meter fills, the framing is swept away but stock on hand and sealed decks are not lost. *Summon:* a memory-match board of the animals two by two (sevens for the dove, Genesis 7:2-3) under a seven-day countdown (Genesis 7:4); a miss flips back and scrambles two other tiles, and running out of days reshuffles only the unboarded tiles, so each retry is shorter. Ends with "the Lord shut him in" (Genesis 7:16).
- **Dungeon 3 (the Tower of Babel's slot), the owner's choice: Job's servants (Job 1:13-22).** A side scroller in the style of Super Mario Bros. 3, in three 30-second runs. Each servant runs right to Job's house to bring the news, chased by the disaster he escaped: the Sabean raiders on camels firing arrows, the fire of God from heaven (a wall of flame, falling fire, burning ground), and the great wind (a whirlwind, gusts and flying debris). Hits and pits cost time; if the disaster catches up, that servant's run restarts. The servants gather at the house, and the closing cutscene shows Job tearing his mantle and falling to the ground, then Job 1:20-22.

## Other ideas discussed

- **First-person mode:** an old-school first-person view, like Doom, built on the existing 3D view (`js/render3d.js`) as a third VIEW option. A first playable version is about 2–3 sessions; polished with bosses rebalanced is about 6–10.
- **Fully 3D bosses:** start with the Serpent and the Dragon.
- **Follow camera:** now the default (`CAMERA: FOLLOW` under OPTIONS, 3D view only). Possible tuning: the zoom (`R3D.ZOOM`), or pulling back during boss fights so attacks from the edges stay visible.
- **Before a store launch:**
  - An art polish pass (hero, bosses, title screen, icon, store screenshots and a 30-second trailer).
  - An easier mode for kids and families.
  - Spanish and Portuguese translations.
  - Native touches in the app (vibration on hits, Game Center achievements, game controller support).
- **Microsoft Store:** package the Windows app as MSIX (it currently runs unpackaged).
