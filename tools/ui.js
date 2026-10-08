const { chromium } = require(process.env.PW || 'playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
  const pg = await b.newPage({ viewport: { width: 520, height: 800 } }); const errs = [];
  pg.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1])); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto('http://localhost:8765/index.html?d=4&god=1'); await pg.waitForTimeout(500);
  const shot = async n => { await pg.waitForTimeout(150); await pg.locator('#screen').screenshot({ path: `/tmp/claude-0/shots/ui_${n}.png` }); };
  await pg.evaluate(() => { __dr.G.bannerQ = null; __dr.G.p.sel = 'dove'; }); await shot('dungeon4');
  await pg.evaluate(() => { __dr.G.mode = 'pause'; __dr.G.menu = 0; }); await shot('pause');
  await pg.evaluate(() => { __dr.G.mode = 'play'; __dr.say(['PRESS A TO ADVANCE. THE LORD IS MY SHEPHERD; I SHALL NOT WANT. HE MAKES ME LIE DOWN IN GREEN PASTURES.']); __dr.G.dialog.chars = 999; }); await shot('dialog');
  await pg.evaluate(() => { Input.press.a = true; __dr.G.mode = 'dying'; __dr.G.timer = 0.01; }); await pg.waitForTimeout(300); await shot('gameover');
  await pg.evaluate(() => { __dr.respawn(); const G = __dr.G; G.chestGet = 'rod'; G.itemT = 5; G.mode = 'itemget'; }); await shot('itemget');
  await pg.evaluate(() => { const G = __dr.G; G.mode = 'ending'; G.endT = 2; G.endPage = 1; }); await shot('ending');
  await pg.evaluate(() => { const G = __dr.G; G.endPage = 4; }); await shot('theend');
  console.log(errs.length ? 'ERR ' + errs.join('\n') : 'no errors'); await b.close();
})();
