const { chromium } = require(process.env.PW || 'playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
  const pg = await b.newPage({ viewport: { width: 520, height: 800 } }); const errs = [];
  pg.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1])); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto('http://localhost:8765/index.html'); await pg.waitForTimeout(400);
  const out = await pg.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms)), o = [], G = () => __dr.G;
    __dr.newGame(); G().dialog = null; G().mode = 'play'; G().godmode = true;
    const walkable = (t, tx, ty) => !SOLID.has(t[ty * 16 + tx]);
    const flood = (t, sx, sy) => { const seen = new Set([sx + ',' + sy]), q = [[sx, sy]]; while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of DIRV) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (nx >= 0 && nx < 16 && ny >= 0 && ny < 12 && !seen.has(k) && walkable(t, nx, ny)) { seen.add(k); q.push([nx, ny]); } } } return seen; };
    // seal
    __dr.loadOver(1, 128, 100); let t = G().room.tiles; const gate = G().room.info.gate; o.push('seal tiles solid: ' + gate.tiles.every(([x, y]) => t[y * 16 + x] === T.SEAL));
    G().cleared[0] = true; __dr.loadOver(1, 128, 100); t = G().room.tiles; o.push('seal open after clear: ' + gate.tiles.every(([x, y]) => t[y * 16 + x] === T.FLOOR));
    // sea
    G().p.items.rod = true; G().p.sel = 'rod'; G().cleared[3] = false; __dr.loadOver(7, 128, 100); t = G().room.tiles; const info = G().room.info;
    const exitD = info.gate.dir, et = exitTiles(exitD);
    let reach = flood(t, 8, 6); o.push('sea blocks exit: ' + !et.some(([x, y]) => reach.has(x + ',' + y)) + ' dir=' + exitD);
    // stand next to water facing the exit and strike
    const p = G().p; p.dir = exitD; // exit is west (2)
    let sx = 8, sy = 6; while (t[sy * 16 + (sx - 1)] !== T.WATER && sx > 1) sx--; p.x = sx * 16 + 8; p.y = sy * 16 + 8; p.faith = 10; p.atk = 0;
    useItem(); await sleep(50);
    t = G().room.tiles; reach = flood(t, 8, 6); o.push('after rod, parted tiles=' + G().room.parted.length + ' exit reachable=' + et.some(([x, y]) => reach.has(x + ',' + y)));
    // walk across and slide to Jericho
    G().p.x = 1; G().p.y = 5 * 16 + 20; p.dir = 2; await sleep(900); o.push('after crossing loc=' + JSON.stringify(G().loc) + ' mode=' + G().mode);
    // crack wall (screen 9)
    G().cleared[4] = false; G().p.items.shofar = true; __dr.loadOver(9, 128, 100); t = G().room.tiles; const g5 = G().room.info.gate;
    o.push('crack present: ' + g5.tiles.every(([x, y]) => t[y * 16 + x] === T.CRACK) + ' dir=' + g5.dir);
    const c0 = g5.tiles[0]; G().p.x = c0[0] * 16 + 8; G().p.y = c0[1] * 16 - 10; G().p.faith = 10; G().p.sel = 'shofar'; G().p.atk = 0; useItem(); await sleep(60);
    o.push('crack broken: ' + g5.tiles.every(([x, y]) => G().room.tiles[y * 16 + x] === T.PATH) + ' persisted=' + !!G().broken[9]);
    __dr.loadOver(9, 128, 100); o.push('persist after reload: ' + g5.tiles.every(([x, y]) => G().room.tiles[y * 16 + x] === T.PATH));
    // save/continue
    G().cleared[2] = true; G().save(); const s = Save.load(); o.push('save ok: ' + !!s + ' cleared=' + s.cleared.filter(Boolean).length);
    __dr.toTitle(); __dr.applySave(Save.load()); o.push('continue -> ' + JSON.stringify(G().loc) + ' sword=' + G().p.sword + ' rod=' + G().p.items.rod);
    // death + respawn on overworld
    G().godmode = false; G().p.hp = 1; G().p.inv = 0; hurtPlayer(2, 0, 0, {}); o.push('mode after lethal hit=' + G().mode); await sleep(2000); o.push('gameover mode=' + G().mode);
    Input.press.a = true; await sleep(100); o.push('after respawn mode=' + G().mode + ' hp=' + G().p.hp + '/' + G().p.max);
    // dungeon death + respawn
    G().p.items.dove = true; __dr.enterDungeon(0); G().p.hp = 1; G().p.inv = 0; hurtPlayer(2, 0, 0, {}); await sleep(2000); Input.press.a = true; await sleep(100); o.push('dungeon respawn loc=' + JSON.stringify(G().loc) + ' mode=' + G().mode);
    return o;
  });
  console.log(out.join('\n')); console.log(errs.length ? 'ERR ' + errs.join('\n') : 'no errors'); await b.close();
})();
