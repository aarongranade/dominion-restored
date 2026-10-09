// Generates the dungeon layouts in js/data.js (run: node tools/gen-layouts.js). Each layout is checked so that:
// every key can be reached before any locked door is opened, the treasure room is locked, the boss room sits
// on the top row with only a door below it, the start room is on the bottom row, and the whole thing is solvable.
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = { console, Math, Set, Map, Uint8Array, Object, Array, Number, JSON, String }; vm.createContext(ctx);
for (const f of ['core', 'gfx', 'data', 'world'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8') + '\n;Object.assign(globalThis,{' + (f === 'core' ? 'mulberry32,DIRV' : f === 'gfx' ? 'T' : f === 'data' ? 'DUNGEONS' : 'validateDungeon,parseDungeon') + '})', ctx);
// [width, height, rooms, keys(=locks incl. treasure room), special rooms]
const SPEC = [[5, 5, 14, 2, ''], [5, 5, 16, 2, ''], [6, 6, 24, 3, ''], [7, 6, 28, 3, ''], [7, 7, 32, 4, ''], [7, 7, 30, 4, ''], [6, 7, 28, 3, 'uuu'], [6, 5, 20, 3, 'tpg'], [6, 6, 22, 3, ''], [8, 8, 42, 5, 'uuuu']];
const D4 = [[0, 1], [0, -1], [-1, 0], [1, 0]];
function gen(d, seed) {
  const [w, h, n, nk, special] = SPEC[d], r = ctx.mulberry32(seed), g = Array.from({ length: h }, () => Array(w).fill('.'));
  const sx = Math.floor(w / 2), bx = Math.floor(r() * w);
  const has = (x, y) => x >= 0 && y >= 0 && x < w && y < h && g[y][x] !== '.';
  const forbidden = (x, y) => y === 0; // keep the boss room's side neighbours empty (top row reserved)
  g[h - 1][sx] = 'C';
  // carve a wandering path from the start up to the room below the boss
  let x = sx, y = h - 1;
  while (!(x === bx && y === 1)) {
    const opts = []; if (y > 1) opts.push([0, -1]); if (x < bx) opts.push([1, 0]); if (x > bx) opts.push([-1, 0]);
    if (r() < .35 && y > 1 && y < h - 1) opts.push([r() < .5 ? 1 : -1, 0]);
    const [dx, dy] = opts[Math.floor(r() * opts.length)]; const nx = Math.max(0, Math.min(w - 1, x + dx)), ny = y + dy;
    if (forbidden(nx, ny)) continue; x = nx; y = ny; g[y][x] = 'C';
  }
  let count = g.flat().filter(c => c !== '.').length;
  for (let guard = 0; count < n - 1 && guard < 5000; guard++) {
    const cells = []; for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (g[yy][xx] !== '.') cells.push([xx, yy]);
    const [cx, cy] = cells[Math.floor(r() * cells.length)], [dx, dy] = D4[Math.floor(r() * 4)], nx = cx + dx, ny = cy + dy;
    if (nx < 0 || ny < 0 || nx >= w || ny >= h || has(nx, ny) || forbidden(nx, ny)) continue;
    if (ny === h - 1 && Math.abs(nx - sx) === 0) continue;
    g[ny][nx] = 'C'; count++;
  }
  if (count < n - 1) return null;
  g[0][bx] = 'B'; g[h - 1][sx] = 'S';
  // distances from the start (boss excluded)
  const key = (x, y) => x + ',' + y, dist = {}, q = [[sx, h - 1]]; dist[key(sx, h - 1)] = 0;
  while (q.length) { const [cx, cy] = q.shift(); for (const [dx, dy] of D4) { const nx = cx + dx, ny = cy + dy; if (has(nx, ny) && g[ny][nx] !== 'B' && dist[key(nx, ny)] === undefined) { dist[key(nx, ny)] = dist[key(cx, cy)] + 1; q.push([nx, ny]); } } }
  const rooms = Object.keys(dist).map(k => k.split(',').map(Number)).filter(([cx, cy]) => g[cy][cx] === 'C');
  const deg = (cx, cy) => D4.filter(([dx, dy]) => has(cx + dx, cy + dy)).length;
  const below = key(bx, 1);
  // treasure room: the farthest dead end (not the room under the boss)
  const ends = rooms.filter(([cx, cy]) => deg(cx, cy) === 1 && key(cx, cy) !== below).sort((a, b) => dist[key(...b)] - dist[key(...a)]);
  if (!ends.length) return null;
  const [jx, jy] = ends[0]; g[jy][jx] = 'J';
  const pickFree = (filter) => { const c = rooms.filter(([cx, cy]) => g[cy][cx] === 'C' && key(cx, cy) !== below && filter(cx, cy)); return c.length ? c[Math.floor(r() * c.length)] : null; };
  for (let i = 0; i < nk - 1; i++) { const c = pickFree((cx, cy) => deg(cx, cy) <= 2 && dist[key(cx, cy)] > 1); if (!c) return null; g[c[1]][c[0]] = 'L'; }
  for (let i = 0; i < nk; i++) { const c = pickFree(() => true); if (!c) return null; g[c[1]][c[0]] = 'K'; }
  for (const s of special) { const c = pickFree(() => true); if (!c) return null; g[c[1]][c[0]] = s; }
  // every key must be reachable without opening any lock
  const free = new Set([key(sx, h - 1)]), q2 = [[sx, h - 1]];
  while (q2.length) { const [cx, cy] = q2.pop(); for (const [dx, dy] of D4) { const nx = cx + dx, ny = cy + dy, k = key(nx, ny); if (has(nx, ny) && !free.has(k) && !'LJB'.includes(g[ny][nx])) { free.add(k); q2.push([nx, ny]); } } }
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (g[yy][xx] === 'K' && !free.has(key(xx, yy))) return null;
  // locks must actually guard something: the treasure must not be reachable lock-free (it is locked itself), fine.
  return g.map(row => row.join(''));
}
const out = [];
for (let d = 0; d < 10; d++) {
  let layout = null, seed = 1000 + d * 97;
  for (let tries = 0; !layout; tries++) {
    if (tries > 20000) throw new Error('no layout for d' + (d + 1));
    const l = gen(d, seed++);
    if (!l) continue;
    ctx.DUNGEONS[d].layout = l; for (const k in ctx.parseDungeon) { } // parse cache is per-run; clear below
    vm.runInContext('for (const k in _dunCache) delete _dunCache[k];', ctx);
    if (ctx.validateDungeon(d).length === 0) layout = l;
  }
  out.push(layout);
  console.log('d' + (d + 1) + ' rooms=' + layout.join('').replace(/\./g, '').length + '  ' + JSON.stringify(layout));
}
if (process.argv[2] === '--write') {
  const p = path.join(__dirname, '..', 'js', 'data.js'); let s = fs.readFileSync(p, 'utf8'), i = 0;
  s = s.replace(/layout: \[[^\]]*\]/g, () => 'layout: ' + JSON.stringify(out[i++]).replace(/,/g, ', ').replace(/"/g, "'"));
  fs.writeFileSync(p, s); console.log('wrote', i, 'layouts');
}
