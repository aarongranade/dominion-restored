// Full-flow logic test: clears every dungeon room by room using teleports + instant kills, then verifies keys/chest/boss/seal flow.
const { chromium } = require(process.env.PW || 'playwright');
(async () => {
  const which = (process.argv[2] || '1,2,3,4,5,6,7,8,9,10').split(',').map(Number);
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
  for (const d of which) {
    const pg = await b.newPage({ viewport: { width: 700, height: 600 } });
    const errs = []; pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
    await pg.goto(`http://localhost:8765/index.html?d=${d}&god=1`); await pg.waitForTimeout(400);
    const log = await pg.evaluate(async (d0) => {
      const sleep = ms => new Promise(r => setTimeout(r, ms)), G0 = () => __dr.G, out = [];
      const dn = parseDungeon(d0 - 1), cells = Object.values(dn.cells);
      const killAll = async () => { const G = G0(); for (let i = 0; i < 400 && G.room.enemies.length; i++) { for (const e of G.room.enemies.slice()) damageEnemy(e, 99, G.p.x, G.p.y, 'sword'); await sleep(16); } };
      const walkTo = async (dir) => { const G = G0(); const rm = G.room; const sp = { 0: [128, 190], 1: [128, 2], 2: [1, 96], 3: [255, 96] }[dir]; G.p.x = sp[0]; G.p.y = sp[1]; for (let i = 0; i < 100 && G0().mode !== 'play' || G0().room === rm && i < 100; i++) { await sleep(16); if (G0().room !== rm) break; } for (let i = 0; i < 100 && G0().mode !== 'play'; i++) await sleep(16); };
      const dismiss = async () => { for (let i = 0; i < 300 && ['dialog', 'itemget', 'bossintro'].includes(G0().mode); i++) { if (G0().mode === 'dialog') Input.press.a = true; await sleep(30); } };
      // dungeon graph walk: DFS visiting cells; open locks with keys as available
      const visited = new Set(); let bossDone = false;
      const here = () => G0().room.cell;
      const goDir = async (dir) => {
        const G = G0(); const before = G.room.cell.key; const n = G.room.cell.exits[dir];
        if (n.locked && !G.ds[d0 - 1].unlocked[n.key] && G.ds[d0 - 1].keys <= 0) return false;
        if (n.boss && !G.ds[d0 - 1].bossOpen) return false;
        // bump lock if needed
        const et = exitTiles(dir);
        if (n.locked && !G.ds[d0 - 1].unlocked[n.key]) { GM.onBump.call(G, et[0][0], et[0][1], T.DLOCK); }
        await walkTo(dir); await sleep(100);
        return G0().room.cell && G0().room.cell.key === n.key;
      };
      const clearRoom = async () => {
        const G = G0(); let rm = G.room;
        await dismiss();
        if (G.mode === 'bossintro') { for (let i = 0; i < 300 && G0().mode === 'bossintro'; i++) await sleep(20); }
        if (rm.cell.boss) {
          out.push('boss room: ' + rm.boss?.id);
          const bo = G0().room.boss; if (bo) { for (let i = 0; i < 300 && !bo.dead; i++) { if (bo.id === 'colossus') bo.onShofar({ x: bo.x, y: bo.y + 20 }); if (bo.id === 'death' && bo.lit <= 0) bo.onLight(); const ps = bo.parts(), part = ps.find(q => q.vuln !== false) || ps[0]; if (part) { try { bo.hit(part, 99, 'stone'); } catch (e) { out.push('hit err ' + e.message); } } await sleep(30); } out.push('boss dead=' + bo.dead + ' mode=' + G0().mode); }
          return;
        }
        await killAll(); await sleep(150);
        // collect pickups & chest
        for (let i = 0; i < 20; i++) { const k = G0().room.pickups.find(q => q.type === 'key'); if (!k) break; G0().p.x = k.x; G0().p.y = k.y - 3; await sleep(60); }
        const ch = G0().room.chest; if (ch && !ch.open) { G0().p.x = ch.x; G0().p.y = ch.y + 10; await sleep(100); out.push('chest opened: ' + G0().chestGet + ' keys=' + G0().ds[d0 - 1].keys); await sleep(2800); await dismiss(); }
      };
      const dfs = async () => {
        const G = G0(), cell = G.room.cell; if (visited.has(cell.key)) return; visited.add(cell.key);
        await clearRoom(); if (cell.boss) { bossDone = true; return; }
        for (let pass = 0; pass < 2; pass++) for (const dir of [1, 3, 2, 0]) {
          const cur = G0().room.cell; if (cur.key !== cell.key) continue; const n = cur.exits[dir]; if (!n || visited.has(n.key)) continue;
          if (cur.start && dir === 0) continue;
          const ok = await goDir(dir); if (ok) { await dfs(); if (bossDone) return; const back = { 0: 1, 1: 0, 2: 3, 3: 2 }[dir]; if (G0().room.cell.key !== cell.key) { const ok2 = await goDir(back); if (!ok2) out.push('could not return from ' + G0().room.cell.key + ' to ' + cell.key + ' mode=' + G0().mode + ' shut=' + G0().room.shut + ' en=' + G0().room.enemies.length + ' keys=' + G0().ds[d0-1].keys); } }
        }
      };
      await sleep(300); await dfs();
      // the treasure is often found after the room below the boss was explored, so walk back to the boss door
      if (!bossDone) {
        const boss = cells.find(c => c.boss), route = (from) => { const prev = { [from.key]: null }, q = [from]; while (q.length) { const c = q.shift(); if (c.key === boss.key) break; for (const [dir, n] of Object.entries(c.exits)) if (!(n.key in prev)) { prev[n.key] = [c, +dir]; q.push(n); } } const steps = []; for (let k = boss.key; prev[k]; k = prev[k][0].key) steps.unshift(prev[k][1]); return steps; };
        for (const dir of route(G0().room.cell)) { const ok = await goDir(dir); if (!ok) { out.push('route to boss blocked at ' + G0().room.cell.key); break; } await clearRoom(); }
        if (G0().room.cell.boss) out.push('reached boss after treasure');
      }
      out.push('visited ' + visited.size + '/' + cells.length);
      return out;
    }, d);
    // after boss: container + beam
    await pg.waitForTimeout(500);
    const st = await pg.evaluate(async () => { const G = __dr.G; const sleep = ms => new Promise(r => setTimeout(r, ms)); const o = []; const c = G.room.pickups.find(k => k.type === 'container'); o.push('container=' + !!c + ' boss.dead=' + (G.room.boss && G.room.boss.dead)); if (c) { G.p.x = c.x; G.p.y = c.y; await sleep(200); for (let i = 0; i < 100 && __dr.G.mode === 'dialog'; i++) { Input.press.a = true; await sleep(40); } o.push('beam=' + !!G.room.beam + ' hp=' + G.p.hp + '/' + G.p.max); if (G.room.beam) { G.p.x = G.room.beam.x; G.p.y = G.room.beam.y; await sleep(1800); o.push('mode=' + __dr.G.mode + ' cleared=' + __dr.G.cleared.filter(Boolean).length + ' loc=' + JSON.stringify(__dr.G.loc)); for (let i = 0; i < 60; i++) { Input.press.a = true; await sleep(40); } } } return o; });
    console.log('D' + d, log.join(' | '), '||', st.join(' | '), errs.length ? 'ERR ' + errs.slice(0, 3).join(' | ') : 'ok');
    await pg.close();
  }
  await b.close();
})();
