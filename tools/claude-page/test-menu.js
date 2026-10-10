/* Claude-page-only playtest menu. Not part of the web game or the app: tools/claude-page/build.py
   appends this to the single-file build published as the Claude page.
   Adds a TESTS line to the title screen. It opens a box (like OPTIONS) listing every test:
   BOSS and DUNGEON (left/right picks the dungeon, A starts it), THRONE ROOM, and one line per
   mini-game once they exist (add each new mini-game to TESTS below).
   Test runs never write the real save, and TRY AGAIN restarts the same test. */
(function () {
  let testD = 0;
  const baseOptions = titleOptions, baseUpdate = updateTitle, baseRespawn = respawn, baseList = optionList, baseUpdateOptions = updateOptions;
  const pick = () => '< ' + (testD + 1) + ' ' + SHORT[testD] + ' >';

  // every test in the TESTS box: [id, label, cycles through dungeons, start]
  const TESTS = () => [
    ['testboss', 'BOSS ' + pick(), true, () => startTest(testD, true)],
    ['testdun', 'DUNGEON ' + pick(), true, () => startTest(testD, false)],
    ['testheaven', 'THRONE ROOM', false, () => startHeaven()],
    ['testmini1', 'MINI-GAME: FLEEING EDEN', false, () => startMini(0)],
    ['testmini2', 'MINI-GAME: THE ARK', false, () => startMini(1)],
    ['testmini3', 'MINI-GAME: JOB\'S SERVANTS', false, () => startMini(2)],
    // each new mini-game gets a line here (see CLAUDE.md)
  ];

  titleOptions = function () {
    const o = baseOptions();
    o.splice(o.length - 1, 0, ['tests', 'TESTS']); // just above OPTIONS
    return o;
  };
  // TESTS shows three tests per page; MORE turns to the next page (and back to the first from the last)
  const PER = 3, pages = () => Math.ceil(TESTS().length / PER), pageTests = () => TESTS().slice((G.testsPage || 0) * PER, (G.testsPage || 0) * PER + PER);
  optionList = function () {
    if (!G.testsBox) return baseList();
    const rows = pageTests().map(t => [t[0], t[1], t[2]]);
    if (pages() > 1) rows.push(['more', 'MORE > (PAGE ' + ((G.testsPage || 0) + 1) + '/' + pages() + ')']);
    return rows.concat([['back', 'BACK']]);
  };
  updateTitle = function (dt) {
    const opt = titleOptions()[G.menu];
    if (!G.titleSub && opt && opt[0] === 'tests' && (Input.consume('a') || Input.consume('start'))) {
      Aud.init(); Aud.resume(); Aud.sfx('confirm');
      G.titleSub = true; G.testsBox = true; G.testsPage = 0; G.boxTitle = 'TESTS'; G.optMenu = 0; Input.clear(); return;
    }
    baseUpdate(dt);
  };
  updateOptions = function () {
    if (!G.testsBox) { baseUpdateOptions(); return; }
    const list = optionList(), n = list.length, close = () => { G.titleSub = false; G.testsBox = false; G.boxTitle = null; Aud.sfx('select'); Input.clear(); };
    if (Input.consume('mup')) { G.optMenu = (G.optMenu + n - 1) % n; Aud.sfx('select'); }
    if (Input.consume('mdown')) { G.optMenu = (G.optMenu + 1) % n; Aud.sfx('select'); }
    if (Input.consume('b') || Input.consume('start')) { close(); return; }
    const id = list[G.optMenu][0], t = pageTests()[G.optMenu];
    if (id === 'more') { if (Input.consume('a') || Input.consume('mright')) { G.testsPage = ((G.testsPage || 0) + 1) % pages(); G.optMenu = pageTests().length; Aud.sfx('select'); } return; } // the cursor stays on MORE
    if (t && t[2]) {
      if (Input.consume('mleft')) { testD = (testD + 9) % 10; Aud.sfx('select'); }
      if (Input.consume('mright')) { testD = (testD + 1) % 10; Aud.sfx('select'); }
    }
    if (Input.consume('a')) { if (!t) { close(); return; } Aud.init(); Aud.resume(); Aud.sfx('confirm'); t[3](); }
  };

  function testState(test) {
    G = freshState(); G.mode = 'play'; G.test = test; G.save = function () { };
  }
  function startTest(d, boss) {
    testState({ d, boss });
    const p = G.p; p.max = 6 + 2 * d; p.hp = p.max;
    const give = ['flame', 'dove', 'bow', 'rod', 'shofar', 'sling', 'shield', 'spirit', 'armor'];
    // gear from every earlier dungeon, plus this dungeon's treasure when jumping to its boss
    for (let i = 0; i < (boss ? d + 1 : d) && i < give.length; i++) {
      const it = give[i];
      if (it === 'flame') p.sword = Math.max(p.sword, 1); else if (it === 'spirit') p.sword = 2; else if (it === 'shield') p.shield = true; else if (it === 'armor') p.armor = true; else p.items[it] = true;
    }
    if (boss && d === 9) { p.items.testimony = true; p.blood = true; } // the Abyss treasures
    for (let i = 0; i < d; i++) G.cleared[i] = true;
    p.sel = ACTIVE_ITEMS.find(i => p.items[i]) || null;
    G.overPos = { idx: WORLD.dungeon[d], x: 128, y: 60 };
    if (boss) { const ds = G.ds[d]; ds.item = true; ds.bossOpen = true; }
    enterDungeon(d);
    if (boss) {
      G.bannerQ = null;
      const b = Object.values(parseDungeon(d).cells).find(c => c.boss);
      G.loc.cell = b.key; G.room = makeRoom(buildDunRoom(G, d, b)); p.x = 128; p.y = 164; p.dir = 1; p.lastSafe = { x: 128, y: 164 };
      populate(G.room);
    }
  }
  // the throne room as it is after the Dragon: every seal broken, all gear and the Crown of Life
  function startHeaven() {
    testState({ heaven: true });
    const p = G.p; p.max = 26; p.hp = p.max; p.sword = 2; p.shield = true; p.armor = true; p.crown = true; p.blood = true;
    for (const id of ACTIVE_ITEMS) p.items[id] = true; p.sel = ACTIVE_ITEMS[0];
    G.restored = true; G.cleared = G.cleared.map(() => true); G.ds.forEach(d => { d.boss = true; d.item = true; d.heart = true; });
    G.overPos = null; G.seenHeaven = false;
    enterHeaven();
  }
  // a mini-game as the player meets it: that dungeon beaten, standing at its entrance on the overworld
  function startMini(d) {
    testState({ mini: d });
    const p = G.p, give = ['flame', 'dove', 'bow', 'rod', 'shofar', 'sling', 'shield', 'spirit', 'armor'];
    p.max = 8 + 2 * d; p.hp = p.max;
    for (let i = 0; i <= d && i < give.length; i++) { const it = give[i]; if (it === 'flame') p.sword = 1; else if (it === 'spirit') p.sword = 2; else if (it === 'shield') p.shield = true; else if (it === 'armor') p.armor = true; else p.items[it] = true; }
    p.sel = ACTIVE_ITEMS.find(i => p.items[i]) || null;
    for (let i = 0; i <= d; i++) { G.cleared[i] = true; G.ds[i].boss = true; G.ds[i].item = true; G.ds[i].heart = true; }
    G.overPos = { idx: WORLD.dungeon[d], x: 128, y: 60 };
    const ts = MINI.tentScreen(d) ?? WORLD.dungeon[d]; loadOver(ts, 128, 96); G.bannerQ = null;
    const tn = G.room.tent; G.overPos = tn ? { idx: ts, x: tn.door.x, y: tn.door.y + 12 } : { idx: ts, x: G.p.x, y: G.p.y }; // come back out in front of the circus tent
    MINI.start(d);
  }
  respawn = function () {
    if (G.test && G.test.mini !== undefined) { startMini(G.test.mini); return; }
    if (G.test && G.test.heaven) { startHeaven(); return; }
    if (G.test) { startTest(G.test.d, G.test.boss); return; }
    baseRespawn();
  };
})();
