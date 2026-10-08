const { chromium } = require(process.env.PW || 'playwright'); const fs = require('fs');
(async () => {
  const which = (process.argv[2] || '1,2,3,4,5,6,7,8,9,10').split(',').map(Number), secs = +(process.argv[3] || 6);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const botSrc = fs.readFileSync(__dirname + '/bot.js', 'utf8');
  for (const d of which) {
    const pg = await b.newPage({ viewport: { width: 760, height: 560 } });
    const errs = []; pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
    await pg.goto(`http://localhost:8765/index.html?d=${d}&boss=1&god=1`); await pg.waitForTimeout(500);
    await pg.evaluate(botSrc);
    await pg.waitForTimeout(3600); // boss intro
    await pg.evaluate('__bot.start()');
    for (let i = 0; i < 3; i++) { await pg.waitForTimeout(secs * 1000 / 3); await pg.screenshot({ path: `/tmp/claude-0/shots/boss${d}_${i}.png` }); }
    const st = await pg.evaluate('(()=>{const G=__dr.G,b=G.room&&G.room.boss;return {mode:G.mode,boss:b&&{hp:b.hp,max:b.max,state:b.state,phase:b.phase}, en:G.room.enemies.length, pr:G.room.projs.length}})()');
    console.log('D' + d, JSON.stringify(st), errs.length ? errs.slice(0, 3).join(' | ') : 'ok'); await pg.close();
  }
  await b.close();
})();
