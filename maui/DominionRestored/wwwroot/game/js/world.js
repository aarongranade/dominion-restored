'use strict';
/* ===== Dominion Restored :: world generation ===== */

/* overworld: 5x4 screens laid out as a snake, Eden -> Patmos */
const ORDER = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [4, 1], [3, 1], [2, 1], [1, 1], [0, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [4, 3], [3, 3], [2, 3], [1, 3], [0, 3]];
const OW = 5, OH = 4;
const OENTR = [[3, 2], [12, 2], [4, 2], [11, 2], [5, 2], [10, 2], [3, 2], [12, 2], [4, 2], [11, 2]]; // dungeon entrance tile per dungeon
const OBST = [ // [type, weight]
  [[T.TREE, .6], [T.BUSH, .3], [T.ROCK, .1]], [[T.ROCK, .5], [T.TREE, .3], [T.WATER, .2]], [[T.ROCK, .6], [T.TREE, .2], [T.BUSH, .2]],
  [[T.TREE, .4], [T.ROCK, .4], [T.WATER, .2]], [[T.TREE, .4], [T.ROCK, .4], [T.BUSH, .2]], [[T.TREE, .5], [T.ROCK, .4], [T.BUSH, .1]],
  [[T.ROCK, .5], [T.TREE, .3], [T.WATER, .2]], [[T.ROCK, .5], [T.TREE, .4], [T.BUSH, .1]], [[T.ROCK, .6], [T.TREE, .3], [T.BUSH, .1]],
  [[T.ROCK, .5], [T.TREE, .3], [T.WATER, .2]]
];
const BORDER = [T.TREE, T.ROCK, T.ROCK, T.ROCK, T.ROCK, T.TREE, T.ROCK, T.ROCK, T.ROCK, T.ROCK];

function dirBetween(a, b) { // direction from screen a to screen b: 0 S,1 N,2 W,3 E
  const dx = b[0] - a[0], dy = b[1] - a[1];
  return dy > 0 ? 0 : dy < 0 ? 1 : dx < 0 ? 2 : 3;
}
function exitTiles(dir) {
  return dir === 0 ? [[7, 11], [8, 11]] : dir === 1 ? [[7, 0], [8, 0]] : dir === 2 ? [[0, 5], [0, 6]] : [[15, 5], [15, 6]];
}
function screenExits(idx) {
  const ex = {};
  if (idx > 0) ex[dirBetween(ORDER[idx], ORDER[idx - 1])] = idx - 1;
  if (idx < ORDER.length - 1) ex[dirBetween(ORDER[idx], ORDER[idx + 1])] = idx + 1;
  return ex; // dir -> neighbouring screen index
}

const _overCache = {};
function genOverScreen(idx) {
  if (_overCache[idx]) return _overCache[idx];
  const k = (idx >> 1) + 1, th = OTH[k - 1], rng = mulberry32(7000 + idx * 131);
  const t = new Uint8Array(192), I = (x, y) => y * 16 + x;
  const exits = screenExits(idx), info = { idx, k, exits, gate: null, signPos: null, entrance: null };
  for (let i = 0; i < 192; i++) t[i] = rng() < .07 ? T.DECO : T.FLOOR;
  // coarse obstacle field
  const m = new Uint8Array(192);
  for (let y = 1; y < 11; y++) for (let x = 1; x < 15; x++) m[I(x, y)] = rng() < .4 ? 1 : 0;
  for (let it = 0; it < 3; it++) {
    const n2 = new Uint8Array(m);
    for (let y = 1; y < 11; y++) for (let x = 1; x < 15; x++) {
      let n = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (i || j) { const xx = x + i, yy = y + j; n += (xx < 1 || xx > 14 || yy < 1 || yy > 10) ? 1 : m[I(xx, yy)]; }
      n2[I(x, y)] = n >= 5 ? 1 : n <= 2 ? 0 : m[I(x, y)];
    }
    m.set(n2);
  }
  // patches choose obstacle type
  const cellType = {}, ob = OBST[k - 1];
  const pickType = () => { let r = rng(), a = 0; for (const [ty, w] of ob) { a += w; if (r < a) return ty; } return ob[0][0]; };
  for (let y = 1; y < 11; y++) for (let x = 1; x < 15; x++) {
    if (!m[I(x, y)]) continue;
    const ck = (x >> 2) + ',' + (y / 3 | 0); if (cellType[ck] === undefined) cellType[ck] = pickType();
    t[I(x, y)] = cellType[ck];
  }
  // sparse fruit trees / stray rocks in open land
  for (let i = 0; i < 6; i++) { const x = 1 + (rng() * 14 | 0), y = 1 + (rng() * 10 | 0); if (t[I(x, y)] === T.FLOOR || t[I(x, y)] === T.DECO) t[I(x, y)] = ob[0][0]; }
  // border
  const bt = BORDER[k - 1];
  for (let x = 0; x < 16; x++) { t[I(x, 0)] = bt; t[I(x, 11)] = bt; }
  for (let y = 0; y < 12; y++) { t[I(0, y)] = bt; t[I(15, y)] = bt; }
  const carve = (x0, y0, x1, y1) => {
    let x = x0, y = y0;
    const set = (a, b) => { if (a > 0 && a < 15 && b > 0 && b < 11) t[I(a, b)] = rng() < .3 ? T.PATH : T.FLOOR; };
    while (x !== x1) { set(x, y); set(x, y + 1); x += x < x1 ? 1 : -1; }
    while (y !== y1) { set(x, y); set(x + 1, y); y += y < y1 ? 1 : -1; }
    set(x, y); set(x + 1, y + 1); set(x, y + 1); set(x + 1, y);
  };
  const clear = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x > 0 && x < 15 && y > 0 && y < 11) t[I(x, y)] = T.FLOOR; };
  clear(6, 4, 9, 7); // hub
  for (const d in exits) {
    const et = exitTiles(+d), inside = et.map(([x, y]) => [x + (+d === 3 ? -1 : +d === 2 ? 1 : 0), y + (+d === 0 ? -1 : +d === 1 ? 1 : 0)]);
    for (const [x, y] of et) t[I(x, y)] = T.FLOOR;
    carve(Math.min(Math.max(inside[0][0], 1), 14), Math.min(Math.max(inside[0][1], 1), 10), 7, 5);
  }
  // sign
  t[I(6, 4)] = T.SIGN; info.signPos = [6, 4]; clear(5, 3, 7, 3); t[I(5, 4)] = T.FLOOR;
  // healing spring in first screen of biome
  if (idx % 2 === 0) { clear(11, 7, 12, 9); t[I(12, 8)] = T.SPRING; carve(11, 8, 9, 6); }
  // dungeon entrance
  if (idx % 2 === 1) {
    const [ex, ey] = OENTR[k - 1];
    clear(ex - 2, 3, ex + 2, 4); carve(ex, 3, 8, 6);
    for (let x = ex - 1; x <= ex + 1; x++) { t[I(x, 1)] = bt; if (x !== ex) t[I(x, 2)] = bt; }
    t[I(ex, 2)] = T.ENTRANCE; t[I(ex, 1)] = bt; info.entrance = { x: ex, y: ey, d: k - 1 };
  }
  // gate toward the next biome
  if (idx % 2 === 1 && idx < 19) {
    const dir = +Object.keys(exits).find(d => exits[d] === idx + 1), et = exitTiles(dir);
    info.gate = { k, dir, tiles: [] };
    const inner = et.map(([x, y]) => [x + (dir === 3 ? -1 : dir === 2 ? 1 : 0), y + (dir === 0 ? -1 : dir === 1 ? 1 : 0)]);
    if (k === 4) { // red sea
      info.gate.kind = 'sea';
      const rg = dir === 3 ? [11, 14, 1, 10] : dir === 2 ? [1, 4, 1, 10] : dir === 1 ? [1, 14, 1, 4] : [1, 14, 7, 10];
      for (let y = rg[2]; y <= rg[3]; y++) for (let x = rg[0]; x <= rg[1]; x++) t[I(x, y)] = T.WATER;
      for (const [x, y] of et) t[I(x, y)] = T.WATER;
      // keep other exits reachable: re-open any carved approach not in the band
    } else if (k === 5) {
      info.gate.kind = 'crack';
      for (const [x, y] of et.concat(inner)) { t[I(x, y)] = T.CRACK; info.gate.tiles.push([x, y]); }
    } else {
      info.gate.kind = 'seal';
      for (const [x, y] of et.concat(inner)) { t[I(x, y)] = T.SEAL; info.gate.tiles.push([x, y]); }
    }
  }
  // make sure the entrance approach & hub stay clear if the red sea overwrote them
  info.tiles = t;
  return _overCache[idx] = info;
}

/* apply persistent world state to a freshly copied screen */
function buildOverRoom(idx, G) {
  const info = genOverScreen(idx), tiles = new Uint8Array(info.tiles);
  if (info.gate && info.gate.kind === 'seal' && G.cleared.filter(Boolean).length >= info.gate.k && G.cleared[info.gate.k - 1]) {
    for (const [x, y] of info.gate.tiles) tiles[y * 16 + x] = T.FLOOR;
  }
  if (info.gate && info.gate.kind === 'crack' && G.broken[idx]) {
    for (const [x, y] of info.gate.tiles) tiles[y * 16 + x] = T.PATH;
  }
  return { kind: 'over', idx, k: info.k, theme: OTH[info.k - 1], tiles, exits: info.exits, info };
}

/* ---------------- dungeons ---------------- */
const _dunCache = {};
function parseDungeon(d) {
  if (_dunCache[d]) return _dunCache[d];
  const def = DUNGEONS[d], rows = def.layout, h = rows.length, w = rows[0].length, cells = {};
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ch = rows[y][x]; if (ch === '.') continue;
    cells[x + ',' + y] = {
      x, y, ch, key: x + ',' + y, d, start: ch === 'S', boss: ch === 'B', kroom: ch === 'K', item: ch === 'I' || ch === 'J',
      locked: ch === 'L' || ch === 'J', mod: ch === 't' ? 'stones' : ch === 'p' ? 'pinnacle' : ch === 'g' ? 'kingdoms' : ch === 'u' ? 'fire' : null,
      combat: 'CKLtpgu'.includes(ch)
    };
  }
  for (const c of Object.values(cells)) {
    c.exits = {};
    DIRV.forEach(([dx, dy], i) => { const n = cells[(c.x + dx) + ',' + (c.y + dy)]; if (n) c.exits[i] = n; });
  }
  return _dunCache[d] = { d, def, w, h, cells };
}

const PATTERNS = [
  () => [],
  () => [[4, 3], [11, 3], [4, 8], [11, 8]].map(p => [...p, T.BLOCK]),
  () => { const o = []; for (const [cx, cy] of [[3, 2], [11, 2], [3, 8], [11, 8]]) for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) o.push([cx + i, cy + j, T.BLOCK]); return o; },
  () => { const o = []; for (let y = 5; y <= 6; y++) for (let x = 6; x <= 9; x++) o.push([x, y, T.BLOCK]); return o; },
  () => { const o = []; for (const x of [5, 10]) for (const y of [2, 3, 4, 7, 8, 9]) o.push([x, y, T.BLOCK]); return o; },
  () => [[3, 2], [12, 2], [3, 9], [12, 9], [7, 3], [8, 8]].map(p => [...p, T.STATUE]),
  () => { const o = []; for (const x of [4, 6, 9, 11]) for (const y of [3, 8]) o.push([x, y, T.BLOCK]); return o; },
  () => { const o = []; for (const [cx, cy] of [[2, 2], [12, 2], [2, 8], [12, 8]]) for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) o.push([cx + i, cy + j, T.PIT]); return o; },
  () => { const o = []; for (const y of [3, 8]) for (const x of [3, 4, 5, 6, 9, 10, 11, 12]) o.push([x, y, T.BLOCK]); return o; },
  () => { const o = []; for (let y = 4; y <= 7; y++) for (let x = 6; x <= 9; x++) o.push([x, y, T.PIT]); return o; }
];

function reachable(tiles, exits, extraSolid) {
  const starts = [];
  if (exits[1]) starts.push([7, 1]); if (exits[0]) starts.push([7, 10]); if (exits[2]) starts.push([1, 5]); if (exits[3]) starts.push([14, 5]);
  if (!starts.length) starts.push([7, 5]);
  const ok = (x, y) => x >= 1 && x <= 14 && y >= 1 && y <= 10 && !SOLID.has(tiles[y * 16 + x]) && tiles[y * 16 + x] !== T.PIT;
  const seen = new Set(), q = [starts[0]]; seen.add(starts[0][0] + ',' + starts[0][1]);
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of DIRV) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (!seen.has(k) && ok(nx, ny)) { seen.add(k); q.push([nx, ny]); } }
  }
  for (const s of starts) if (!seen.has(s[0] + ',' + s[1])) return false;
  for (let y = 1; y <= 10; y++) for (let x = 1; x <= 14; x++) if (ok(x, y) && !seen.has(x + ',' + y)) return false;
  return true;
}

const _dRoomCache = {};
function genDunTiles(dn, cell) {
  const key = cell.d + '|' + cell.key;
  if (_dRoomCache[key]) return _dRoomCache[key];
  const d = cell.d, rng = mulberry32(900 + d * 101 + cell.x * 13 + cell.y * 29 + 5), t = new Uint8Array(192), I = (x, y) => y * 16 + x;
  t.fill(T.FLOOR);
  for (let y = 0; y < 12; y++) for (let x = 0; x < 16; x++) if (x === 0 || y === 0 || x === 15 || y === 11) t[I(x, y)] = T.WALL;
  for (let x = 3; x < 14; x += 5) { t[I(x, 0)] = T.TORCH; }
  for (const dir in cell.exits) for (const [x, y] of exitTiles(+dir)) t[I(x, y)] = T.FLOOR;
  if (cell.start) { t[I(7, 11)] = T.EXIT; t[I(8, 11)] = T.EXIT; }
  const apply = (list) => { for (const [x, y, ty] of list) { if (x >= 1 && x <= 14 && y >= 1 && y <= 10) t[I(x, y)] = ty; } };
  if (cell.boss) {
    apply([[1, 1, T.STATUE], [14, 1, T.STATUE], [1, 10, T.STATUE], [14, 10, T.STATUE]]);
  } else if (cell.mod === 'pinnacle') {
    for (let y = 1; y <= 10; y++) for (let x = 1; x <= 14; x++) if (x === 1 || x === 14 || y === 1 || y === 10) t[I(x, y)] = T.PIT;
    for (const dir in cell.exits) { const [a, b] = exitTiles(+dir); const dx = +dir === 3 ? -1 : +dir === 2 ? 1 : 0, dy = +dir === 0 ? -1 : +dir === 1 ? 1 : 0; for (const [x, y] of [a, b]) { t[I(x + dx, y + dy)] = T.FLOOR; } }
    apply([[7, 5, T.BLOCK], [8, 6, T.BLOCK]]);
  } else if (cell.mod === 'stones') {
    for (let i = 0; i < 14; i++) { const x = 2 + (rng() * 12 | 0), y = 2 + (rng() * 8 | 0); if (!(x >= 6 && x <= 9 && (y <= 2 || y >= 9)) && !(y >= 4 && y <= 7 && (x <= 3 || x >= 12))) t[I(x, y)] = T.STONE; }
    if (!reachable(t, cell.exits)) { for (let i = 0; i < 192; i++) if (t[i] === T.STONE) t[i] = T.FLOOR; }
  } else if (cell.mod === 'kingdoms') {
    for (let i = 0; i < 12; i++) { const x = 2 + (rng() * 12 | 0), y = 2 + (rng() * 8 | 0); t[I(x, y)] = T.GOLD; }
  } else if (cell.mod === 'fire') {
    apply([[4, 3, T.FIRE], [11, 3, T.FIRE], [4, 8, T.FIRE], [11, 8, T.FIRE], [7, 5, T.FIRE], [8, 6, T.FIRE]]);
  } else if (cell.item) {
    apply([[3, 3, T.STATUE], [12, 3, T.STATUE], [3, 8, T.STATUE], [12, 8, T.STATUE]]);
  } else if (!cell.start) {
    const lim = d >= 1 ? PATTERNS.length : 7;
    const p = PATTERNS[1 + (rng() * (lim - 1) | 0)](), save = new Uint8Array(t);
    apply(p);
    if (!reachable(t, cell.exits)) t.set(save);
  }
  for (let i = 0; i < 192; i++) if (t[i] === T.FLOOR && rng() < .04) t[i] = T.DECO;
  return _dRoomCache[key] = t;
}

/* build runtime dungeon room, applying door state */
function buildDunRoom(G, d, cell) {
  const dn = parseDungeon(d), ds = G.ds[d], tiles = new Uint8Array(genDunTiles(dn, cell)), th = DTH[d];
  const room = { kind: 'dun', d, cell, theme: th, tiles, exits: {}, dn };
  for (const dir in cell.exits) {
    room.exits[dir] = true;
    const n = cell.exits[dir], et = exitTiles(+dir);
    let ty = null;
    if (n.boss && !ds.bossOpen) ty = T.DBOSS;
    else if (n.locked && !ds.unlocked[n.key]) ty = T.DLOCK;
    if (ty !== null) for (const [x, y] of et) tiles[y * 16 + x] = ty;
  }
  return room;
}
function shutDoors(room) {
  for (const dir in room.exits) for (const [x, y] of exitTiles(+dir)) { const i = y * 16 + x; if (!(room.tiles[i] === T.DLOCK || room.tiles[i] === T.DBOSS)) room.tiles[i] = T.DSHUT; }
  if (room.cell.start) { room.tiles[11 * 16 + 7] = T.DSHUT; room.tiles[11 * 16 + 8] = T.DSHUT; }
}
function openDoors(room, G) {
  const ds = G.ds[room.d];
  for (const dir in room.exits) {
    const n = room.cell.exits[dir], et = exitTiles(+dir);
    for (const [x, y] of et) {
      const i = y * 16 + x;
      if (n.boss && !ds.bossOpen) room.tiles[i] = T.DBOSS; else if (n.locked && !ds.unlocked[n.key]) room.tiles[i] = T.DLOCK; else room.tiles[i] = T.FLOOR;
    }
  }
  if (room.cell.start) { room.tiles[11 * 16 + 7] = T.EXIT; room.tiles[11 * 16 + 8] = T.EXIT; }
}

/* validate that every dungeon can be completed (used by tools/validate.js and as a dev check) */
function validateDungeon(d) {
  const dn = parseDungeon(d), cells = Object.values(dn.cells), errs = [];
  const start = cells.find(c => c.start);
  if (!start) errs.push('no start'); if (!cells.find(c => c.boss)) errs.push('no boss');
  if (!cells.find(c => c.item)) errs.push('no item room');
  if (start && start.y !== dn.h - 1) errs.push('start not on bottom row');
  const keys = cells.filter(c => c.kroom).length, locks = cells.filter(c => c.locked).length;
  if (keys < locks) errs.push('keys ' + keys + ' < locks ' + locks);
  // greedy simulation
  const opened = new Set(), got = new Set(); let keysHeld = 0, bossKey = false, progress = true;
  const seen = new Set([start.key]);
  while (progress) {
    progress = false;
    const q = [...seen];
    for (const k of q) {
      const c = dn.cells[k];
      for (const n of Object.values(c.exits)) {
        if (seen.has(n.key)) continue;
        if (n.boss) { if (!bossKey) continue; }
        else if (n.locked && !opened.has(n.key)) { if (keysHeld <= 0) continue; keysHeld--; opened.add(n.key); }
        seen.add(n.key); progress = true;
        if (n.kroom && !got.has(n.key)) { got.add(n.key); keysHeld++; }
        if (n.item) bossKey = true;
      }
    }
  }
  for (const c of cells) if (!seen.has(c.key)) errs.push('unreachable ' + c.key);
  return errs;
}
