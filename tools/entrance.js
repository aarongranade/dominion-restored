const { chromium } = require(process.env.PW || 'playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
  const pg = await b.newPage({ viewport: { width: 520, height: 800 } }); const errs = [];
  pg.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1])); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto('http://localhost:8765/index.html?god=1'); await pg.waitForTimeout(400);
  const out = await pg.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms)), G = () => __dr.G, o = [];
    __dr.newGame(); G().dialog = null; G().mode = 'play'; G().godmode = true; __dr.loadOver(1, 128, 100); G().room.enemies.length = 0;
    const e = G().room.info.entrance; G().p.x = e.x * 16 + 8; G().p.y = (e.y + 1) * 16 + 12; Input.keys = { u: true };
    for (let i = 0; i < 100 && G().loc.kind === 'over'; i++) await sleep(30); Input.keys = {};
    o.push('after walking up: mode=' + G().mode + ' loc=' + JSON.stringify(G().loc)); await sleep(1200); o.push('then mode=' + G().mode + ' loc=' + JSON.stringify(G().loc) + ' p=' + Math.round(G().p.x) + ',' + Math.round(G().p.y));
    // walk back out through the exit
    G().p.x = 128; Input.keys = { d: true }; for (let i = 0; i < 200 && G().loc.kind === 'dun'; i++) await sleep(30); Input.keys = {};
    await sleep(1200); o.push('after exit: mode=' + G().mode + ' loc=' + JSON.stringify(G().loc) + ' p=' + Math.round(G().p.x) + ',' + Math.round(G().p.y));
    return o;
  });
  console.log(out.join('\n')); console.log(errs.length ? 'ERR ' + errs.join('\n') : 'no errors'); await b.close();
})();
