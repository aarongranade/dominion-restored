const { chromium } = require(process.env.PW || 'playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('http://localhost:8765/index.html'); await pg.waitForTimeout(400);
  const cdp = await ctx.newCDPSession(pg);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const box = async sel => { const r = await pg.locator(sel).boundingBox(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height }; };
  // tap title to start
  const cb = await pg.locator('#screen').boundingBox();
  await touch('touchStart', [{ x: cb.x + cb.width / 2, y: cb.y + cb.height * 0.73, id: 1 }]); await touch('touchEnd', []);
  await pg.waitForTimeout(300);
  console.log('after tap mode=', await pg.evaluate('__dr.G.mode'));
  // advance intro dialog by tapping A button
  const A = await box('#btnA'), B = await box('#btnB'), D = await box('#dpad');
  for (let i = 0; i < 12; i++) { await touch('touchStart', [{ x: A.x, y: A.y, id: 2 }]); await pg.waitForTimeout(40); await touch('touchEnd', []); await pg.waitForTimeout(150); }
  console.log('mode after dialogs=', await pg.evaluate('__dr.G.mode'));
  // hold dpad right
  const p0 = await pg.evaluate('[__dr.G.p.x,__dr.G.p.y]');
  await touch('touchStart', [{ x: D.x + 55, y: D.y, id: 3 }]); await pg.waitForTimeout(500);
  // while holding dpad, tap A with second finger (multitouch)
  await touch('touchStart', [{ x: D.x + 55, y: D.y, id: 3 }, { x: A.x, y: A.y, id: 4 }]); await pg.waitForTimeout(80);
  const atk = await pg.evaluate('__dr.G.p.atk');
  await touch('touchEnd', [{ x: D.x + 55, y: D.y, id: 3 }]); await pg.waitForTimeout(200);
  await touch('touchEnd', []);
  const p1 = await pg.evaluate('[__dr.G.p.x,__dr.G.p.y]');
  console.log('moved', p0.map(Math.round), '->', p1.map(Math.round), 'atk during multitouch=', atk);
  await pg.screenshot({ path: '/tmp/claude-0/shots/touch.png' });
  console.log(errs.length ? errs.join('\n') : 'no errors'); await b.close();
})();
