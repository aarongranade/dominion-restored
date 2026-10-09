// 3D view screenshots: node tools/shot3d.js out.png "<query>" [setup-js] [wait-ms]
// Skips intros and dialogs by pressing A, then runs the optional setup and waits.
const { chromium } = require(process.env.PW || 'playwright');
(async () => {
  const [out, q, setup, wait] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 420, height: 800 }, hasTouch: true });
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  pg.on('console', m => { if (m.type() === 'error') errs.push('error: ' + m.text()); });
  await pg.goto('http://localhost:8765/index.html' + q);
  for (let i = 0; i < 14; i++) { await pg.waitForTimeout(350); await pg.evaluate(() => { const G = window.__dr.G; if (G.mode === 'dialog' || G.mode === 'bossintro') { Input.press.a = true; } }); }
  if (setup) { const r = await pg.evaluate(setup); if (r !== undefined) console.log('RESULT', JSON.stringify(r)); }
  await pg.waitForTimeout(+(wait || 900));
  await pg.screenshot({ path: out, clip: { x: 0, y: 0, width: 420, height: 380 } });
  console.log(errs.length ? errs.join('\n') : 'ok');
  await b.close();
})();
