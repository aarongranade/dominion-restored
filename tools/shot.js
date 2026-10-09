// usage: node tools/shot.js "<query>" out.png [actions-js]
const { chromium } = require(process.env.PW || 'playwright');
(async () => {
  const [q, out, act, w, h] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const pg = await b.newPage({ viewport: { width: +(w || 420), height: +(h || 800) }, hasTouch: true });
  const errs = [];
  pg.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  await pg.goto('http://localhost:8765/index.html' + (q || ''));
  await pg.waitForTimeout(600);
  if (act) { const r = await pg.evaluate(act); if (r !== undefined) console.log('RESULT', JSON.stringify(r)); }
  await pg.screenshot({ path: out });
  console.log(errs.length ? errs.join('\n') : 'no console errors');
  await b.close();
})();
