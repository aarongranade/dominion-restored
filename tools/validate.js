// Dev check: every dungeon must be solvable, sprite grids well-formed, overworld screens connected.
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = { console, Math, Set, Map, Uint8Array, Object, Array, Number, JSON, String };
vm.createContext(ctx);
for (const f of ['core', 'gfx', 'data', 'world']) {
  // top-level const/let are not exposed on the context object; export them explicitly
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8');
  vm.runInContext(src + '\n;Object.assign(globalThis,{' + (f === 'core' ? 'mulberry32,DIRV' : f === 'gfx' ? 'T,SOLID,SHAPES,PLAYER_DOWN,PLAYER_UP,PLAYER_SIDE' : f === 'data' ? 'DUNGEONS,ENEMY,OTH,DTH,ITEMS,SIGNS' : 'validateDungeon,genOverScreen,genDunTiles,parseDungeon,ORDER,WORLD') + '})', ctx, { filename: f });
}
let bad = 0;
for (let d = 0; d < 10; d++) { const e = ctx.validateDungeon(d); if (e.length) { bad++; console.log('DUNGEON', d + 1, e.join('; ')); } }
for (const [n, rows] of Object.entries(ctx.SHAPES)) { if (rows.length !== 16 || rows.some(r => r.length !== 8)) { bad++; console.log('SHAPE', n, rows.map((r, i) => r.length !== 8 ? i + ':' + r.length : '').filter(Boolean).join(','), rows.length); } }
for (const [n, rows] of [['pdown', ctx.PLAYER_DOWN], ['pup', ctx.PLAYER_UP]]) if (rows.length !== 16 || rows.some(r => r.length !== 8)) { bad++; console.log('PLAYER', n); }
ctx.PLAYER_SIDE.forEach((rows, i) => { if (rows.length !== 16 || rows.some(r => r.length !== 16)) { bad++; console.log('SIDE', i, rows.length, rows.map(r => r.length).join(',')); } });
for (const [k, e] of Object.entries(ctx.ENEMY)) { if (!ctx.SHAPES[e.shape]) { bad++; console.log('ENEMY shape', k); } }
for (let i = 0; i < ctx.ORDER.length; i++) { const s = ctx.genOverScreen(i); /* flood from hub */
  const t = s.tiles, ok = (x, y) => x >= 0 && x < 16 && y >= 0 && y < 12 && !ctx.SOLID.has(t[y * 16 + x]);
  const seen = new Set(['7,5']), q = [[7, 5]]; while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of ctx.DIRV) { const k = (x + dx) + ',' + (y + dy); if (!seen.has(k) && ok(x + dx, y + dy)) { seen.add(k); q.push([x + dx, y + dy]); } } }
  for (const d in s.exits) for (const [x, y] of (d == 0 ? [[7, 11], [8, 11]] : d == 1 ? [[7, 0], [8, 0]] : d == 2 ? [[0, 5], [0, 6]] : [[15, 5], [15, 6]])) { const kk = x + ',' + y; const tt = t[y * 16 + x]; if (!seen.has(kk) && ![9, 8, 4].includes(tt)) { bad++; console.log('OVER', i, 'exit not reachable', kk, tt); } }
  if (s.entrance) { const e = s.entrance; if (!seen.has(e.x + ',' + (e.y + 1))) { bad++; console.log('OVER', i, 'entrance unreachable'); } }
}
// world graph: from the start, each region's dungeon is reachable before its gate, and each gate leads on
{ const W = ctx.WORLD; let bad2 = 0;
  for (let k = 0; k < 10; k++) {
    const seen = new Set([W.entry[k]]), q = [W.entry[k]];
    while (q.length) { const c = q.pop(); for (const n of Object.values(W.scr[c].exits)) if (W.scr[n].k === k + 1 && !seen.has(n)) { seen.add(n); q.push(n); } }
    if (seen.size !== 10) { bad2++; console.log('REGION', k + 1, 'only', seen.size, 'screens reachable'); }
    if (!seen.has(W.dungeon[k])) { bad2++; console.log('REGION', k + 1, 'dungeon unreachable'); }
    if (k < 9 && !Object.values(W.scr[W.exit[k]].exits).includes(W.entry[k + 1])) { bad2++; console.log('REGION', k + 1, 'exit does not reach next region'); }
  }
  bad += bad2; }
console.log(bad ? bad + ' problem(s)' : 'all good');
process.exit(bad ? 1 : 0);
