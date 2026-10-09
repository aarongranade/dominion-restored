# Dominion Restored

An 8-bit, Zelda-style action adventure for the web, built mobile-first. Walk the whole story of the Bible, from **Eden to Revelation**, through an overworld and **ten dungeons**. The first boss is **the Serpent** and the final boss is **the Dragon**.

> In the beginning God gave man dominion over the earth. A serpent deceived, and dominion was lost. You are the heir of the promise. Break ten seals and restore it.

No build step, no dependencies, no assets. All art (sprites, tiles, font) is drawn procedurally on a canvas and all music and sound is synthesised live with WebAudio.

## Play

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000   # then visit http://localhost:8000
```

To host it for your phone, turn on **GitHub Pages** (Settings → Pages → *Deploy from a branch* → `main` / root). On iOS or Android use *Add to Home Screen* for a fullscreen, offline-capable install (there is a service worker and manifest).

### Controls

| | Touch | Keyboard |
|---|---|---|
| Move | on-screen stick (8-way) | Arrows / WASD |
| Attack | **A** | Z / J / Space |
| Use item | **B** | X / K |
| Cycle item | **ITEM** | C / Q |
| Pause / menu | **START** | Enter / P / Esc |
| Mute | | M |

Portrait phones show the game on top and controls below; landscape phones get a full-screen game with floating controls. Progress is saved automatically (screen changes, items, bosses).

## The world

The overworld is a 10×10 grid of 100 screens. Each of the ten biomes, in biblical order, is a block of 10 screens joined by winding paths, and its dungeon entrance is on the screen farthest from where you enter the region. Each biome has its own enemies, tiles, and music scale. Beating a dungeon's boss breaks that region's **seal** and opens the way on. Some gates need the right tool instead:

* **Red Sea (Egypt)** — strike the water with the **Rod of Moses** to part it.
* **Walls of Jericho** — blast the cracked wall with the **Shofar**.
* **Thorny bushes** — burn them with a flaming sword.
* Springs scattered through each biome's first screen heal you.

## The ten dungeons

| # | Dungeon | Scripture | Boss | Treasure |
|---|---|---|---|---|
| 1 | Garden of Eden | Genesis 3 | **The Serpent** — slithers, spits venom, lunges | Flaming Sword |
| 2 | The Ark | Genesis 6–8 | **Leviathan** — dives, rises, tidal waves | Dove of Peace (boomerang) |
| 3 | Tower of Babel | Genesis 11 | **Nimrod the Hunter** — volleys, falling bricks, charge | Hunter's Bow |
| 4 | Pharaoh's Pyramid | Exodus 7–14 | **Pharaoh** — plagues of frogs, locusts, darkness, serpents | Rod of Moses |
| 5 | Walls of Jericho | Joshua 6 | **Colossus of Jericho** — stone skin only the Shofar can crack | Shofar |
| 6 | Valley of Elah | 1 Samuel 17 | **Goliath of Gath** — only a stone to the forehead hurts | Sling of David |
| 7 | Furnace of Babylon | Daniel 2–3 | **The Great Image** — head of gold to feet of clay; it slides about collapsed, rises every ten seconds or so, and the top section can only be struck while it stands (the first blow stuns it) | Shield of Faith (reflects projectiles) |
| 8 | **The Temptation** | Matthew 4 | **The Tempter** — three trials: Stones, the Pinnacle, the Kingdoms | Sword of the Spirit |
| 9 | The Empty Tomb | Matthew 28 | **Death** — shrouded in darkness until you seize the light | Armor of Light |
| 10 | The Abyss | Revelation 12 | **The Dragon** — strips away your weapons; stun each head with the Word of Our Testimony and strike it with the Blood of the Lamb (three strikes per head), then ride a white horse against the beast itself (Revelation 12:11, 19:14) | Word of Our Testimony, Blood of the Lamb (Crown of Life after the Dragon) |

Dungeon 8 is built around the three temptations of Jesus: a *Stones* room full of mimics, a windswept *Pinnacle* ringed by a drop, and a *Kingdoms* room of gold that turns on you. The Tempter's attacks follow the same three beats, and orbs he casts can be knocked back with the sword ("It is written!") for triple damage.

### Weapons and tools

Sword (A): Staff → Flaming Sword → Sword of the Spirit (fires beams). B items spend **Faith** (the blue bar, which refills over time and from drops): Dove (free), Bow (1), Sling (1), Rod (2), Shofar (3). Shield and Armor are passive.

Dungeons run from 14 rooms (Eden) to 42 (the Abyss); `node tools/gen-layouts.js` generates and checks the layouts. Every dungeon has a locked treasure room guarded by a mini-boss. The treasure also unseals that dungeon's boss door.

## Project layout

```
index.html, style.css      page + mobile layout
js/core.js                 input (touch/keyboard), save, chiptune audio engine
js/gfx.js                  pixel font, procedural sprites, tiles, icons
js/data.js                 themes, enemies, dungeon layouts, items, all text
js/world.js                overworld + dungeon generation, door/key logic
js/combat.js               player, enemy AI, projectiles, items, effects
js/bosses.js               the ten bosses
js/game.js                 state machine, rooms, HUD, menus, main loop
tools/                     dev scripts (Node)
```

### Dev tools

`node tools/validate.js` checks that every dungeon layout is solvable (keys vs. locks, boss reachable only after the treasure), that sprite grids are well formed, and that every overworld screen is connected. The other scripts in `tools/` drive headless Chromium with Playwright for screenshots and full-flow playtests (`flow.js` clears every dungeon end to end).

Debug URL parameters: `?d=N` jumps into dungeon N with the gear you would have, `&boss=1` starts at its boss, `&ow=1` drops you on its overworld screen, `&god=1` makes you invulnerable.
