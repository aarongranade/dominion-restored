const { chromium } = require(process.env.PW || 'playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
  const pg = await b.newPage({ viewport: { width: 520, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto('http://localhost:8765/index.html?god=1'); await pg.waitForTimeout(400);
  await pg.evaluate(() => { __dr.newGame(); __dr.G.dialog = null; __dr.G.mode = 'play'; for (let i = 0; i < 10; i++) __dr.G.cleared[i] = false; });
  for (let i = 0; i < 20; i++) {
    await pg.evaluate((i) => { const G = __dr.G; G.mode = 'play'; G.dialog = null; G.bannerQ = null; __dr.loadOver(i, 128, 100); G.room.enemies.forEach(e => e.spawn = 0); G.p.inv = 5; }, i);
    await pg.waitForTimeout(250);
    await pg.locator('#screen').screenshot({ path: `/tmp/claude-0/shots/ow_${String(i).padStart(2, '0')}.png` });
  }
  console.log(errs.length ? errs.slice(0, 5).join('\n') : 'no errors'); await b.close();
})();
