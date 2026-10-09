const { chromium } = require(process.env.PW || 'playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
  const botSrc = fs.readFileSync(__dirname + '/bot.js', 'utf8');
  for (let k = 1; k <= 10; k++) {
    const pg = await b.newPage({ viewport: { width: 400, height: 500 } }); const errs = [];
    pg.on('pageerror', e => errs.push(e.message));
    await pg.goto(`http://localhost:8765/index.html?d=${k}&ow=1`); await pg.waitForTimeout(400); await pg.evaluate(botSrc);
    const r = await pg.evaluate(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms)), G = () => __dr.G; const res = { hpLost: 0, kills: 0, n: 0, max: G().p.max };
      __bot.start();
      for (let round = 0; round < 3; round++) {
        G().godmode = false; G().p.hp = G().p.max; G().p.faith = 10; G().room.enemies.length = 0; G().p.x = 128; G().p.y = 92;
        const pool = OPOOL[G().room.k - 1]; for (let i = 0; i < 4; i++) { const [x, y] = freeSpot(70); spawnEnemy(pool[i % pool.length], x, y); } res.n += 4;
        const start = G().p.hp; let t = 0;
        while (G().room.enemies.length && t < 12000 && G().mode === 'play') { await sleep(50); t += 50; }
        res.hpLost += start - G().p.hp; res.kills += 4 - G().room.enemies.length; res.t = (res.t || 0) + t;
        if (G().mode !== 'play') { res.died = (res.died || 0) + 1; __dr.respawn(); __dr.G.godmode = false; }
      }
      __bot.stop(); return res;
    });
    console.log('biome', k, JSON.stringify(r), errs.join(';')); await pg.close();
  }
  await b.close();
})();
