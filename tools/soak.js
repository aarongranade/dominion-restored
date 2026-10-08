const { chromium } = require(process.env.PW || 'playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
  const pg = await b.newPage({ viewport: { width: 420, height: 800 } }); const errs = [];
  pg.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1])); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto('http://localhost:8765/index.html?god=1'); await pg.waitForTimeout(400); await pg.evaluate(fs.readFileSync(__dirname + '/bot.js', 'utf8'));
  const r = await pg.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms)), G = () => __dr.G; __dr.newGame(); G().dialog = null; G().mode = 'play'; G().godmode = true; __bot.start();
    let screens = 0;
    for (let i = 0; i < 20; i++) { __dr.loadOver(i, 128, 92); G().godmode = true; screens++; for (let k = 0; k < 4; k++) { await sleep(400); Input.keys = Object.assign({}, Input.keys, { l: Math.random() < .3, r: Math.random() < .3 }); } }
    for (let d = 0; d < 10; d++) { G().overPos = { idx: d * 2 + 1, x: 128, y: 60 }; __dr.enterDungeon(d); G().godmode = true; await sleep(1500); }
    __bot.stop(); return { screens, mode: G().mode };
  });
  console.log(JSON.stringify(r), errs.length ? 'ERR ' + errs.slice(0, 5).join('\n') : 'no errors'); await b.close();
})();
