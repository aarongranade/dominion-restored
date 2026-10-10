/* Claude-page-only playtest menu. Not part of the web game or the app: tools/claude-page/build.py
   appends this to the single-file build published as the Claude page.
   Adds two title-menu entries: TEST BOSS and TEST DUNGEON. Left/right picks the dungeon, A starts it.
   Test runs never write the real save, and TRY AGAIN restarts the same test. */
(function () {
  let testD = 0;
  const baseOptions = titleOptions, baseUpdate = updateTitle, baseRespawn = respawn;
  const pickName = () => '< ' + (testD + 1) + ' ' + SHORT[testD] + ' >';
  titleOptions = function () {
    const o = baseOptions();
    o.splice(o.length - 1, 0, ['testboss', 'TEST BOSS ' + pickName()], ['testdun', 'TEST DUNGEON ' + pickName()]);
    return o;
  };
  function startTest(d, boss) {
    G = freshState(); G.mode = 'play'; G.test = { d, boss }; G.save = function () { };
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
  updateTitle = function (dt) {
    const opt = titleOptions()[G.menu];
    if (!G.titleSub && opt && opt[0].startsWith('test')) {
      if (Input.consume('mleft')) { testD = (testD + 9) % 10; Aud.sfx('select'); }
      if (Input.consume('mright')) { testD = (testD + 1) % 10; Aud.sfx('select'); }
      if (Input.consume('a') || Input.consume('start')) { Aud.init(); Aud.resume(); Aud.sfx('confirm'); startTest(testD, opt[0] === 'testboss'); return; }
    }
    baseUpdate(dt);
  };
  respawn = function () { if (G.test) { startTest(G.test.d, G.test.boss); return; } baseRespawn(); };
  // tapping the left or right third of a test row cycles the dungeon instead of starting it
  document.addEventListener('pointerdown', e => {
    if (G.mode !== 'title' || G.titleSub || e.target !== cv) return;
    const r = cv.getBoundingClientRect(), y = (e.clientY - r.top) / r.height * H, fx = (e.clientX - r.left) / r.width, opts = titleOptions();
    for (let i = 0; i < opts.length; i++) {
      const yy = menuY() + i * menuDY();
      if (y >= yy - 5 && y <= yy + 9 && opts[i][0].startsWith('test') && (fx < .3 || fx > .7)) {
        G.menu = i; Input.press[fx < .3 ? 'mleft' : 'mright'] = true; e.stopImmediatePropagation(); return;
      }
    }
  }, true);
})();
