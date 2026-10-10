# Dominion Restored: future ideas

Ideas the owner wants to build later. Nothing here is implemented yet. Check with the owner before starting any of it.

## Post-dungeon mini-games (owner's idea)

Once a dungeon's boss is defeated, entering that dungeon again launches a mini-game unique to it, instead of the empty dungeon. Each of the ten gets its own.

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
