const { chromium } = require(process.env.PW || 'playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
  for (const [name, w, h] of [['land', 844, 390], ['small', 360, 640], ['tall', 430, 932]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
    const pg = await ctx.newPage(); await pg.goto('http://localhost:8765/index.html?d=3&god=1'); await pg.waitForTimeout(700);
    await pg.evaluate(() => { __dr.G.bannerQ = null; });
    await pg.screenshot({ path: `/tmp/claude-0/shots/layout_${name}.png` }); await ctx.close();
  }
  await b.close();
})();
