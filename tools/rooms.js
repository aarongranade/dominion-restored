const { chromium } = require(process.env.PW || 'playwright');
(async () => {
  const d = +(process.argv[2] || 8); const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
  const pg = await b.newPage({ viewport: { width: 520, height: 800 } }); const errs = [];
  pg.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1])); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto(`http://localhost:8765/index.html?d=${d}&god=1`); await pg.waitForTimeout(500);
  const keys = await pg.evaluate((d) => Object.keys(parseDungeon(d - 1).cells), d);
  let n = 0;
  for (const k of keys) {
    await pg.evaluate(([k, d]) => { const G = __dr.G; G.bannerQ = null; const cell = parseDungeon(d - 1).cells[k]; G.ds[d - 1].cleared = {}; G.ds[d - 1].item = false; const r = makeRoom(buildDunRoom(G, d - 1, cell)); G.loc = { kind: 'dun', d: d - 1, cell: k }; G.room = r; G.p.x = 128; G.p.y = 150; G.p.dir = 1; populate(r); if (G.mode === 'bossintro') { G.mode = 'play'; } G.mode = 'play'; r.enemies.forEach(e => e.spawn = 0); G.p.inv = 9; G.bannerQ = null; }, [k, d]);
    await pg.waitForTimeout(500);
    await pg.locator('#screen').screenshot({ path: `/tmp/claude-0/shots/room_${d}_${String(n++).padStart(2, '0')}.png` });
  }
  console.log(keys.join(' '), errs.length ? 'ERR ' + errs.join('\n') : 'no errors'); await b.close();
})();
