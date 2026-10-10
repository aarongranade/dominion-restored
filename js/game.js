'use strict';
/* ===== Dominion Restored :: game (state, rooms, rendering, UI) ===== */

const cv = document.getElementById('screen'), ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;
const SHORT = ['EDEN', 'ARK', 'BABEL', 'EGYPT', 'JERICHO', 'ELAH', 'BABYLON', 'TEMPTATION', 'TOMB', 'REVELATION'];
const DARKBUF = mk(256, 192), dctx = DARKBUF.getContext('2d');

function freshState() {
  const s = {
    mode: 'title', t: 0, p: newPlayer(), room: null, loc: { kind: 'over', idx: 0 }, cleared: Array(10).fill(false), broken: {}, seen: {},
    ds: Array.from({ length: 10 }, () => ({ unlocked: {}, cleared: {}, taken: {}, keys: 0, bossOpen: false, item: false, boss: false, visited: {} })),
    shake: 0, dialog: null, bannerQ: null, trans: null, fade: null, godmode: false, menu: 0, timer: 0, entry: { x: 128, y: 120 }, msg: null, ended: false, owMemo: {}
  };
  return Object.assign(s, GM);
}

/* ---------- save / load ---------- */
const GM = {
  save() {
    if (G.mode === 'title') return;
    const p = G.p, heaven = G.loc.kind === 'heaven', ow = G.loc.kind === 'over' ? { idx: G.loc.idx, x: G.p.x, y: G.p.y } : G.overPos;
    Save.write({
      v: 2, p: { hp: p.max, max: p.max, sword: (p.stash || p).sword, items: (p.stash || p).items, shield: p.shield, armor: (p.stash || p).armor, crown: p.crown, sel: (p.stash || p).sel, blood: p.blood },
      cleared: G.cleared, broken: G.broken, seen: G.seen, ds: G.ds.map(d => ({ unlocked: d.unlocked, cleared: d.cleared, taken: d.taken, got: d.got || {}, heart: !!d.heart, keys: d.keys, bossOpen: d.bossOpen, item: d.item, boss: d.boss, visited: d.visited })),
      ow: ow || (heaven ? null : { idx: 0, x: 128, y: 120 }),
      done: !!G.restored, at: heaven ? 'heaven' : 'earth'
    });
  },
  slide, openChest, banner(text, dur) { G.bannerQ = { text: wrapText(text, 38), t: dur || 3.4 }; },
  onBump(tx, ty, q) {
    const rm = G.room, p = G.p;
    if (q === T.SIGN) { const st = rm.signText || (rm.info && rm.info.signText); if (rm.kind === 'over' && st) say([st]); return; }
    if (q === T.SEAL) { say([SEAL_TEXT[rm.k - 1]]); Aud.sfx('clink'); return; }
    if (q === T.CRACK) { say(['THE WALL IS CRACKED AND CRUMBLING. A MIGHTY TRUMPET BLAST MIGHT BRING IT DOWN.']); return; }
    if (q === T.DLOCK) {
      const dir = ty === 0 ? 1 : ty === 11 ? 0 : tx === 0 ? 2 : 3, n = rm.cell.exits[dir], ds = G.ds[rm.d];
      if (n && ds.keys > 0) { ds.keys--; ds.unlocked[n.key] = true; Aud.sfx('door'); openDoors(rm, G); fxText(p.x, p.y - 14, 'UNLOCKED', '#ff8'); }
      else { Aud.sfx('clink'); fxText(p.x, p.y - 14, 'LOCKED', '#f88'); }
      return;
    }
    if (q === T.DBOSS) { say(['THE BOSS DOOR IS SEALED. FIND THIS DUNGEON\'S TREASURE TO BREAK THE SEAL.']); return; }
  },
  onEntrance(tx, ty) {
    if (G.mode !== 'play' || G.room.kind !== 'over') return;
    if (G.restored) { G.p.y = (ty + 1) * 16 + 12; G.p.dir = 0; say(HEAVEN_TEXT.sealed); return; } // the dungeons are empty now
    const d = G.room.info.entrance.d;
    owRemember(G.room);
    G.overPos = { idx: G.room.idx, x: tx * 16 + 8, y: (ty + 1) * 16 + 10 };
    Aud.sfx('door');
    startFade(() => enterDungeon(d));
  },
  onExit() {
    if (G.mode !== 'play') return;
    if (G.loc.kind === 'heaven') { // down the stairs to the new earth, back where you climbed up (or to Eden the first time)
      Aud.sfx('door');
      startFade(() => { const o = G.overPos || { idx: WORLD.start, x: 128, y: 120 }; G.bannerQ = null; loadOver(o.idx, o.x, o.y); G.save(); });
      return;
    }
    const d = G.loc.d;
    startFade(() => { const o = G.overPos || { idx: WORLD.dungeon[d], x: 128, y: 60 }; loadOver(o.idx, o.x, o.y); G.save(); });
  },
  onContainer(k) {
    const p = G.p; G.ds[G.loc.d].heart = true; p.max += 2; p.hp = p.max; p.faith = p.maxFaith; Aud.sfx('fanfare'); fxBurst(p.x, p.y, ['#f83838', '#fff'], 20, 90, .8, 2);
    say(['YOU RECEIVED A HEART CONTAINER! YOUR LIFE GROWS STRONGER.', CLEAR_TEXT[G.loc.d]], () => { const ds = G.room.dropSpot || { x: 128, y: 96 }; G.room.beam = { x: ds.x, y: ds.y, t: 0 }; Aud.sfx('seal'); });
  },
  onBossDead(boss) {
    const rm = G.room, ds = G.ds[G.loc.d];
    ds.boss = true; rm.shut = false; openDoors(rm, G); Aud.music(''); Aud.sfx('win');
    const spot = rm.dropSpot || { x: 128, y: 96 }; rm.pickups.push({ x: spot.x, y: spot.y, type: 'container', t: 0 });
    for (const e of rm.enemies) e.hp = 0; rm.enemies.length = 0;
    Aud.music('d' + (G.loc.d + 1));
    if (boss.id === 'dragon') { // the crown is given, and every weapon comes home
      rearm(); const p = G.p; p.crown = true; p.hp = p.max; p.faith = p.maxFaith; G.room.projs.length = 0;
      G.chestGet = 'crown'; G.itemT = 3; G.itemMsg = ['YOU RECEIVED THE {CROWN OF LIFE}!', '"BE THOU FAITHFUL UNTO DEATH, AND I WILL GIVE THEE A {CROWN OF LIFE}." (REVELATION 2:10)', 'YOUR WEAPONS ARE RESTORED TO YOU.'];
      Aud.sfx('fanfare'); setMode('itemget');
    }
    G.save();
  },
  playerDied() { G.mode = 'dying'; G.timer = 1.6; Aud.music(''); Aud.sfx('over'); },
};

let G = freshState();

/* ---------- mode helpers ---------- */
function setMode(m) { G.mode = m; Input.clear(); }
function say(pages, cb) {
  const out = [];
  // text inside {curly braces} is shown in gold, to point the player at what matters
  for (const pg of pages) {
    let hl = false; const lines = wrapText(pg, 37).map(l => { const o = { s: '', hl: [] }; for (const ch of l) { if (ch === '{') hl = true; else if (ch === '}') hl = false; else { o.s += ch; o.hl.push(hl); } } return o; });
    for (let i = 0; i < lines.length; i += 4) out.push(lines.slice(i, i + 4));
  }
  G.dialog = { pages: out, i: 0, chars: 0, cb, prev: G.mode === 'dialog' ? G.dialog.prev : G.mode };
  if (G.mode !== 'dialog') setMode('dialog');
}
function endDialog() {
  const d = G.dialog; G.dialog = null; setMode(d.prev === 'itemget' || d.prev === 'trans' ? 'play' : d.prev || 'play');
  if (d.cb) d.cb();
}
function startFade(cb, dur) { G.fade = { t: 0, dur: dur || .5, cb, done: false }; setMode('fade'); }

/* ---------- rooms ---------- */
function makeRoom(r) {
  r.enemies = []; r.projs = []; r.pickups = []; r.fx = []; r.hazards = []; r.rings = []; r.parted = []; r.chest = null; r.boss = null; r.dark = false; r.wind = null; r.shut = false; r.beam = null;
  r.fireOn = (tx, ty) => Math.floor(G.t * 1.1 + tx * .5 + ty * .3) % 2 === 0; return r;
}
function freeSpot(minD, fly) {
  const rm = G.room, p = G.p, t = rm.tiles, sx = clamp(Math.floor(p.x / 16), 0, 15), sy = clamp(Math.floor((p.y + 4) / 16), 0, 11);
  // flood fill from the player so nothing spawns in a walled-off pocket
  const seen = new Uint8Array(192), q = [[sx, sy]], list = []; seen[sy * 16 + sx] = 1;
  const ok = (x, y) => x >= 0 && x < 16 && y >= 0 && y < 12 && !seen[y * 16 + x] && !SOLID.has(t[y * 16 + x]) && t[y * 16 + x] !== T.PIT && t[y * 16 + x] !== T.FIRE;
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of DIRV) { const nx = x + dx, ny = y + dy; if (ok(nx, ny)) { seen[ny * 16 + nx] = 1; q.push([nx, ny]); } }
    const ty = t[y * 16 + x];
    if (x > 0 && x < 15 && y > 0 && y < 11 && ty !== T.EXIT && ty !== T.SPRING && ty !== T.ENTRANCE && dist(x * 16 + 8, y * 16 + 8, p.x, p.y) >= minD) list.push([x * 16 + 8, y * 16 + 8]);
  }
  return list.length ? pick(list) : [128, 60];
}
function owRemember(room) {
  if (room && room.kind === 'over') G.owMemo[room.idx] = room.enemies.filter(e => e.hp > 0).map(e => ({ id: e.id, x: e.x, y: e.y, hp: e.hp }));
}
function owForgetFar(idx) {
  const [x, y] = ORDER[idx];
  for (const k in G.owMemo) { const [a, b] = ORDER[k]; if (Math.abs(a - x) + Math.abs(b - y) > 1) delete G.owMemo[k]; }
}
/* where room rewards appear: the floor tile nearest the middle of the room that the hero can walk to
   (some layouts put a block or a pit in the exact centre) */
function rewardSpot(room) {
  const t = room.tiles, p = G.p, sx = clamp(Math.floor(p.x / 16), 1, 14), sy = clamp(Math.floor((p.y + 4) / 16), 1, 10);
  const walk = (x, y) => x >= 1 && x <= 14 && y >= 1 && y <= 10 && !SOLID.has(t[y * 16 + x]) && t[y * 16 + x] !== T.PIT && t[y * 16 + x] !== T.FIRE;
  const seen = new Uint8Array(192), q = [[sx, sy]]; seen[sy * 16 + sx] = 1;
  let best = null, bd = 1e9;
  while (q.length) {
    const [x, y] = q.pop();
    if (walk(x, y)) { const d = Math.hypot(x * 16 + 8 - 128, y * 16 + 8 - 96); if (d < bd) { bd = d; best = { x: x * 16 + 8, y: y * 16 + 8 }; } }
    for (const [dx, dy] of DIRV) { const nx = x + dx, ny = y + dy; if (!seen[ny * 16 + nx] && walk(nx, ny)) { seen[ny * 16 + nx] = 1; q.push([nx, ny]); } }
  }
  return best || { x: 128, y: 96 };
}
function populate(room, fromSlide) {
  const p = G.p;
  if (room.kind === 'heaven') {
    room.npcs = HEAVEN_NPCS.map((n, i) => Object.assign({ t: i * .37, i: n.kind === 'angel' ? i : 0 }, n));
    return;
  }
  if (room.kind === 'over' && G.restored) { // no more enemies on the new earth
    if (room.ladder === true) { const r = rewardSpot(room); room.ladder = { x: r.x, y: r.y, t: 0, armed: dist(p.x, p.y, r.x, r.y) > 28 }; }
    return;
  }
  if (room.kind === 'over') {
    // enemies only come back once you've been more than one screen away; a quick step out and back keeps them as you left them
    owForgetFar(room.idx);
    const memo = G.owMemo[room.idx];
    if (memo) {
      for (const s of memo) { let [x, y] = [s.x, s.y]; if (dist(x, y, p.x, p.y) < 40) [x, y] = freeSpot(70); const e = spawnEnemy(s.id, x, y); e.hp = s.hp; }
      return;
    }
    const n = room.idx === WORLD.start ? 2 : 2 + (Math.random() * 2 | 0) + (room.k > 5 ? 1 : 0), pool = OPOOL[room.k - 1];
    for (let i = 0; i < n; i++) { const [x, y] = freeSpot(70); spawnEnemy(pick(pool), x, y); }
    return;
  }
  const d = room.d, cell = room.cell, ds = G.ds[d], def = DUNGEONS[d];
  ds.visited[cell.key] = true;
  if (room.cell.mod === 'pinnacle') room.wind = [0, 0];
  if (def.dark && !cell.boss && !cell.start && (def.dark >= 1 || (cell.x * 7 + cell.y * 3 + d) % 10 < def.dark * 10)) { room.dark = true; room.darkR = 42; }
  if (cell.boss) {
    if (!ds.boss) {
      shutDoors(room); room.shut = true; room.bossWait = true;
      G.bossIntro = { t: 0, id: def.boss }; setMode('bossintro'); Aud.music(''); Aud.sfx('bossroar');
    } else {
      // coming back after the boss: same arena, and anything left behind is still waiting
      openDoors(room, G);
      const b = makeBoss(def.boss); if (b.arena) b.arena(room);
      const spot = room.dropSpot || { x: 128, y: 96 };
      if (!ds.heart) room.pickups.push({ x: spot.x, y: spot.y, type: 'container', t: 0 });
      else if (!G.cleared[d]) room.beam = { x: spot.x, y: spot.y, t: 0 }; // the light out still breaks the seal
    }
    return;
  }
  if (ds.cleared[cell.key]) {
    if (cell.kroom && !ds.taken[cell.key]) { const r = rewardSpot(room); room.pickups.push({ x: r.x, y: r.y, type: 'key', t: 0, roomKey: cell.key }); }
    if (cell.item && !itemTaken(ds, cell)) { const r = rewardSpot(room); room.chest = { x: r.x, y: r.y - 4, open: false }; }
    return;
  }
  if (cell.start) { ds.cleared[cell.key] = true; return; }
  const pool = def.pool; let n = 2 + (d >= 3 ? 1 : 0) + (d >= 6 ? 1 : 0) + (cell.locked ? 1 : 0) + (Math.random() * 2 | 0);
  if (cell.item) {
    const [mx, my] = [128, 80]; spawnEnemy(def.minis ? def.minis[cell.itemIdx] : def.mini, mx, my, { mini: true }); n = 1 + (d >= 4 ? 1 : 0);
  }
  if (cell.mod === 'stones') { for (let i = 0; i < 3; i++) { const [x, y] = freeSpot(40); spawnEnemy('stonemimic', x, y); } n = 1; }
  if (cell.mod === 'kingdoms') {
    let c = 0; for (let i = 0; i < 192 && c < 3; i++) if (room.tiles[i] === T.GOLD) { spawnEnemy('coinmimic', (i % 16) * 16 + 8, (i / 16 | 0) * 16 + 8); c++; } n = 1;
  }
  for (let i = 0; i < n; i++) { const [x, y] = freeSpot(70); spawnEnemy(pick(pool), x, y); }
  if (room.enemies.length) { shutDoors(room); room.shut = true; Aud.sfx('shut'); } else ds.cleared[cell.key] = true;
}
function onRoomCleared(room) {
  const ds = G.ds[room.d], cell = room.cell;
  room.shut = false; ds.cleared[cell.key] = true; openDoors(room, G); Aud.sfx('door');
  const spot = rewardSpot(room);
  if (cell.kroom) room.pickups.push({ x: spot.x, y: spot.y, type: 'key', t: 0, roomKey: cell.key });
  if (cell.item && !itemTaken(ds, cell)) { room.chest = { x: spot.x, y: spot.y - 4, open: false }; Aud.sfx('seal'); fxBurst(spot.x, spot.y - 4, ['#f8d838', '#fff'], 20, 70, .8, 2); }
  if (cell.locked && !cell.item) { room.pickups.push({ x: spot.x - 6, y: spot.y, type: 'heart', t: 0 }, { x: spot.x + 6, y: spot.y, type: 'faith', t: 0 }); }
}
function loadOver(idx, px, py) {
  const room = makeRoom(buildOverRoom(idx, G));
  G.loc = { kind: 'over', idx }; G.room = room; G.p.x = px; G.p.y = py; unstick(G.p); px = G.p.x; py = G.p.y; G.p.dove = null; G.p.atk = 0; G.seen[idx] = true;
  G.entry = { x: px, y: py }; G.p.lastSafe = { x: px, y: py };
  populate(room); Aud.music('o' + room.k); setMode('play');
  if (!G.seenBiome) G.seenBiome = {};
  if (!G.seenBiome[room.k]) { G.seenBiome[room.k] = true; G.banner(OTH[room.k - 1].name + ' - ' + DUNGEONS[room.k - 1].ref, 3); }
}
function enterHeaven() {
  const room = makeRoom(buildHeavenRoom()), p = G.p;
  G.loc = { kind: 'heaven' }; G.room = room; G.trans = null;
  p.x = 128; p.y = 158; p.dir = 1; p.dove = null; p.atk = 0; p.hp = p.max; p.faith = p.maxFaith; p.lastSafe = { x: p.x, y: p.y }; G.entry = { x: p.x, y: p.y };
  populate(room); Aud.music('ending'); setMode('play'); G.banner('THE THRONE ROOM - REVELATION 4', 3);
  if (!G.seenHeaven) { G.seenHeaven = true; say(HEAVEN_TEXT.arrive); }
  G.save();
}
function enterDungeon(d) {
  const dn = parseDungeon(d), start = Object.values(dn.cells).find(c => c.start);
  const room = makeRoom(buildDunRoom(G, d, start));
  G.loc = { kind: 'dun', d, cell: start.key }; G.room = room; G.p.x = 128; G.p.y = 164; G.p.dir = 1; G.p.dove = null; G.p.lastSafe = { x: 128, y: 164 }; G.entry = { x: 128, y: 164 };
  populate(room); Aud.music('d' + (d + 1)); setMode('play');
  G.banner(DUNGEONS[d].name + ' - ' + DUNGEONS[d].ref, 3.4);
}
function slide(dir) {
  if (G.mode !== 'play' || G.loc.kind === 'heaven') return;
  let next, nloc;
  if (G.loc.kind === 'over') { const ni = G.room.exits[dir]; if (ni === undefined) return; owRemember(G.room); next = makeRoom(buildOverRoom(ni, G)); nloc = { kind: 'over', idx: ni }; }
  else { const cell = G.room.cell.exits[dir]; if (!cell) return; next = makeRoom(buildDunRoom(G, G.loc.d, cell)); nloc = { kind: 'dun', d: G.loc.d, cell: cell.key }; }
  const deep = G.loc.kind === 'dun' ? 24 : 12, p = G.p;
  let nx = p.x, ny = p.y;
  if (dir === 3) nx = deep; else if (dir === 2) nx = 256 - deep; else if (dir === 1) ny = 192 - deep - (G.loc.kind === 'dun' ? 0 : 4); else ny = deep - 2;
  G.trans = { dir, t: 0, dur: .55, from: G.room, to: next, nloc, sx: p.x, sy: p.y, nx, ny };
  setMode('trans');
}
/* never leave the hero standing in water or a wall: e.g. walking back over a parted Red Sea after
   the waters have closed. Moves him to the nearest open floor. */
function unstick(p) {
  if (!boxHitsSolid(p, p.x, p.y + p.oy) && tileAtPx(p.x, p.y + 4) !== T.PIT) return;
  const t = G.room.tiles; let best = null, bd = 1e9;
  for (let ty = 1; ty < 11; ty++) for (let tx = 1; tx < 15; tx++) {
    const v = t[ty * 16 + tx]; if (SOLID.has(v) || v === T.PIT || v === T.FIRE) continue;
    const x = tx * 16 + 8, y = ty * 16 + 4; if (boxHitsSolid(p, x, y + p.oy)) continue;
    const d = Math.hypot(x - p.x, y - p.y); if (d < bd) { bd = d; best = [x, y]; }
  }
  if (best) { p.x = best[0]; p.y = best[1]; }
}
function finishSlide() {
  const tr = G.trans; G.trans = null; const p = G.p;
  G.room = tr.to; G.loc = tr.nloc; p.x = tr.nx; p.y = tr.ny; unstick(p); p.lastSafe = { x: p.x, y: p.y }; G.entry = { x: p.x, y: p.y }; p.dove = null; p.atk = 0;
  setMode('play');
  if (G.loc.kind === 'over') { G.seen[G.loc.idx] = true; populate(G.room); Aud.music('o' + G.room.k); G.save();
    if (!G.seenBiome) G.seenBiome = {}; if (!G.seenBiome[G.room.k]) { G.seenBiome[G.room.k] = true; G.banner(OTH[G.room.k - 1].name + ' - ' + DUNGEONS[G.room.k - 1].ref, 3); } }
  else populate(G.room);
}
function itemTaken(ds, cell) { return ds.item || !!(ds.got && ds.got[cell.itemIdx || 0]); }
function openChest(ch) {
  const d = G.loc.d, ds = G.ds[d], def = DUNGEONS[d], idx = G.room.cell.itemIdx || 0, list = def.items || [def.item], it = list[idx], p = G.p;
  ds.got = ds.got || {}; ds.got[idx] = true;
  const all = list.every((_, i) => ds.got[i]); // the boss door opens once every treasure is found
  ch.open = true; if (all) { ds.item = true; ds.bossOpen = true; } G.chestGet = it; G.chestAll = all; G.itemMsg = null;
  switch (it) {
    case 'blood': p.blood = true; break;
    case 'flame': p.sword = Math.max(p.sword, 1); break; case 'spirit': p.sword = 2; break; case 'shield': p.shield = true; break; case 'armor': p.armor = true; break;
    case 'crown': p.crown = true; p.hp = p.max; p.faith = p.maxFaith; break;
    default: p.items[it] = true; if (!p.sel) p.sel = it; else if (ACTIVE_ITEMS.includes(it)) p.sel = it;
  }
  openDoors(G.room, G); Aud.music(''); Aud.sfx('fanfare'); G.itemT = 2.4; setMode('itemget'); G.save();
}

/* ---------- new game / continue ---------- */
function newGame() {
  Save.wipe(); G = freshState(); G.mode = 'play';
  loadOver(0, 128, 120);
  Aud.music('o1');
  say(INTRO.concat(['A: ATTACK. B: USE ITEM. ITEM: CYCLE ITEM. START: PAUSE. WALK TO THE SCREEN EDGE TO TRAVEL.']));
}
function applySave(s) {
  if (!s || !s.p || !s.ds) { newGame(); return; } // a broken or partial save starts over instead of freezing
  G = freshState(); G.mode = 'play';
  const p = G.p; Object.assign(p, { hp: s.p.hp, max: s.p.max, sword: s.p.sword, items: s.p.items, shield: s.p.shield, armor: s.p.armor, crown: s.p.crown, sel: s.p.sel, blood: !!s.p.blood });
  G.cleared = s.cleared; G.broken = s.broken || {}; G.seen = s.seen || {};
  G.ds = s.ds.map(d => Object.assign({ unlocked: {}, cleared: {}, taken: {}, keys: 0, bossOpen: false, item: false, boss: false, visited: {} }, d));
  G.ds.forEach((d, i) => { if (d.heart === undefined) d.heart = !!G.cleared[i]; }); // older saves: a finished dungeon's heart was already taken
  G.overPos = null;
  if (!s.v || s.v < 2) {
    // saves from the smaller world: keep items and seals, restart at the next region's first screen,
    // and reset room-by-room dungeon progress (the dungeons were redrawn)
    const k = Math.min(9, G.cleared.filter(Boolean).length);
    G.broken = (s.broken && s.broken[9]) ? { [WORLD.exit[4]]: true } : {}; G.seen = {};
    G.ds.forEach(d => { d.unlocked = {}; d.cleared = {}; d.taken = {}; d.visited = {}; d.keys = 0; });
    loadOver(WORLD.entry[k], 128, 96); return;
  }
  if (s.done) { // the Dragon is defeated: the new earth, and the throne room
    G.restored = true; G.cleared = G.cleared.map(() => true); G.seenHeaven = true;
    if (s.at === 'earth' && s.ow) { loadOver(s.ow.idx, s.ow.x, s.ow.y); return; }
    G.overPos = s.at === 'heaven' ? s.ow : null; G.seenHeaven = s.at === 'heaven'; enterHeaven(); return;
  }
  loadOver(s.ow.idx, s.ow.x, s.ow.y);
}
/* the Dragon strips the hero down to the Shield of Faith, the Word of Our Testimony and the Blood of the Lamb */
function disarm() {
  const p = G.p; if (p.stash) return;
  p.stash = { sword: p.sword, items: Object.assign({}, p.items), sel: p.sel, armor: p.armor };
  p.items = { testimony: true }; p.sel = 'testimony'; p.armor = false; p.lamb = true; p.dove = null;
}
function rearm() {
  const p = G.p; p.lamb = false; p.horse = false; if (!p.stash) return;
  p.sword = p.stash.sword; p.items = p.stash.items; p.sel = p.stash.sel; p.armor = p.stash.armor; p.stash = null;
}
function respawn() {
  rearm();
  G.owMemo = {}; // a fresh start after falling
  const p = G.p; p.hp = p.max; p.faith = p.maxFaith; p.inv = 1.5; p.confuse = 0; p.fall = 0; p.kbt = 0; p.dove = null;
  if (G.loc.kind === 'heaven') { enterHeaven(); return; }
  if (G.loc.kind === 'dun') {
    const d = G.loc.d, dn = parseDungeon(d), start = Object.values(dn.cells).find(c => c.start);
    const room = makeRoom(buildDunRoom(G, d, start)); G.loc = { kind: 'dun', d, cell: start.key }; G.room = room; p.x = 128; p.y = 164; populate(room); Aud.music('d' + (d + 1)); setMode('play');
  } else {
    loadOver(G.loc.idx, G.entry.x, G.entry.y);
  }
}

/* ---------- update ---------- */
function updateRoom(dt) {
  const rm = G.room, p = G.p;
  updatePlayer(dt); updateDove(dt);
  for (const e of rm.enemies.slice()) if (e.hp > 0) updateEnemy(e, dt);
  updateProjs(dt); updateHazards(dt); updatePickups(dt); updateFx(dt);
  for (let i = rm.rings.length - 1; i >= 0; i--) { const r = rm.rings[i]; r.r += 150 * dt; if (r.r > r.max) rm.rings.splice(i, 1); }
  for (let i = rm.parted.length - 1; i >= 0; i--) {
    const q = rm.parted[i]; q.t -= dt;
    if (q.t < 0) { const px = Math.floor(G.p.x / 16), py = Math.floor((G.p.y + 4) / 16); if (px === q.tx && py === q.ty) { q.t = .5; continue; } rm.tiles[q.ty * 16 + q.tx] = T.WATER; rm.parted.splice(i, 1); fxBurst(q.tx * 16 + 8, q.ty * 16 + 8, '#58a8f8', 3, 30, .3, 1); }
  }
  if (rm.boss) {
    rm.boss.update(dt);
    if (!rm.boss.dead && !rm.boss.dying) for (const part of rm.boss.parts()) if (part.harm !== false && overlap(part, hb(p)) && p.inv <= 0) hurtPlayer(rm.boss.touch, part.x, part.y, rm.boss);
  }
  if (rm.cell && rm.cell.mod === 'pinnacle') { rm.windT = (rm.windT || 0) + dt; rm.wind = [Math.sin(rm.windT * .7) > 0 ? 18 : -18, 0]; } // gusts on the pinnacle
  if (rm.kind === 'dun' && rm.shut && !rm.boss && !rm.bossWait && rm.enemies.length === 0) onRoomCleared(rm);
  if (rm.npcs) for (const n of rm.npcs) {
    n.t += dt; const dx = p.x - n.x, dy = p.y - n.y, d = Math.hypot(dx, dy);
    if (d < 13 && d > .01) { p.x = n.x + dx / d * 13; p.y = n.y + dy / d * 13; }
  }
  if (rm.ladder && rm.ladder.x !== undefined) {
    const L = rm.ladder, d = dist(p.x, p.y, L.x, L.y + 6); L.t += dt;
    if (d > 28) L.armed = true;
    else if (d < 11 && L.armed && G.mode === 'play') { L.armed = false; G.overPos = { idx: rm.idx, x: L.x, y: L.y + 30 }; Aud.sfx('seal'); say(HEAVEN_TEXT.ladder, () => startFade(() => enterHeaven(), .8)); }
  }
  // key pickups bookkeeping
  if (rm.beam) { rm.beam.t += dt; if (dist(p.x, p.y, rm.beam.x, rm.beam.y + 8) < 14 && G.mode === 'play') dungeonComplete(); }
  if (G.shake > 0) G.shake -= dt;
}
function dungeonComplete() {
  const d = G.loc.d; G.cleared[d] = true; Aud.sfx('seal');
  startFade(() => {
    const o = G.overPos || { idx: WORLD.dungeon[d], x: 128, y: 60 };
    if (d === 9) { startEnding(); return; }
    loadOver(o.idx, o.x, o.y); G.save();
    say(['SEAL ' + (d + 1) + ' OF 10 IS BROKEN! ' + (d < 9 ? 'A NEW PATH OPENS BEFORE YOU.' : '')]);
  }, .9);
}
function startBoss() {
  const rm = G.room, id = G.bossIntro.id;
  rm.boss = makeBoss(id); rm.bossWait = false; rm.boss.setup(rm); Aud.music(id === 'dragon' ? 'final' : 'boss'); setMode('play');
}
function startEnding() {
  G.ended = true; G.restored = true; G.cleared = G.cleared.map(() => true); G.overPos = null; G.seenHeaven = false;
  G.endT = 0; G.endPage = 0; G.save(); // test runs keep G.save a no-op, so they never mark the real save as finished
  setMode('ending'); Aud.music('ending'); Aud.sfx('win'); G.fade = null;
}
function update(dt) {
  G.t += dt; Input.poll();
  if (Input.consume('mute')) { Aud.setMuted(!Aud.muted); }
  const m = G.mode;
  if (m === 'title') return updateTitle(dt);
  if (m === 'play') {
    if (Input.consume('start')) { setMode('pause'); G.menu = 0; G.quitArm = false; return; }
    updateRoom(dt);
    if (G.bannerQ) { G.bannerQ.t -= dt; if (G.bannerQ.t <= 0) G.bannerQ = null; }
  } else if (m === 'trans') {
    const tr = G.trans; tr.t += dt; updateFx(dt); if (tr.t >= tr.dur) finishSlide();
  } else if (m === 'dialog') {
    const d = G.dialog, pg = d.pages[d.i], total = pageLen(pg);
    if (d.chars < total) { const before = Math.floor(d.chars); d.chars += dt * 50; if (Math.floor(d.chars) !== before && Math.floor(d.chars) % 3 === 0) Aud.sfx('text'); }
    if (Input.consume('a') || Input.consume('b')) {
      if (d.chars < total) d.chars = total; else { Aud.sfx('select'); d.i++; d.chars = 0; if (d.i >= d.pages.length) endDialog(); }
    }
    if (G.room) { updateFx(dt); }
  } else if (m === 'itemget') {
    G.itemT -= dt; updateFx(dt);
    if (G.itemT <= 0 && G.itemMsg) { Aud.music('d' + (G.loc.d + 1)); const m = G.itemMsg; G.itemMsg = null; say(m); }
    else if (G.itemT <= 0) { Aud.music('d' + (G.loc.d + 1)); const it = ITEMS[G.chestGet]; if (!G.chestAll) { say([it.name + '! ' + it.text, 'ANOTHER TREASURE STILL LIES HIDDEN IN THIS DUNGEON. THE BOSS DOOR OPENS WHEN YOU HAVE BOTH.']); } else say([it.name + '! ' + it.text, 'THE BOSS KEY IS YOURS! THE DOOR TO THE DUNGEON\'S GUARDIAN IS UNSEALED.']); }
  } else if (m === 'bossintro') {
    const bi = G.bossIntro; bi.t += dt; if (bi.t > 3.2) startBoss();
  } else if (m === 'dying') {
    G.timer -= dt; if (G.timer <= 0) { setMode('gameover'); G.menu = 0; }
  } else if (m === 'gameover') {
    if (Input.consume('mup') || Input.consume('mdown')) { G.menu ^= 1; Aud.sfx('select'); }
    if (Input.consume('a') || Input.consume('start')) { Aud.sfx('confirm'); if (G.menu === 0) respawn(); else toTitle(); }
  } else if (m === 'fade') {
    const f = G.fade; f.t += dt;
    if (!f.done && f.t >= f.dur) { f.done = true; if (f.cb) f.cb(); if (G.mode === 'fade') { /* callback may switch modes */ } }
    if (f.t >= f.dur * 2) { G.fade = null; if (G.mode === 'fade') setMode('play'); }
    if (G.mode !== 'fade' && G.fade && f.done) { /* mode changed by callback (dialog etc.); keep fade-in going visually */ }
  } else if (m === 'pause') updatePause(dt);
  else if (m === 'ending') updateEnding(dt);
  if (G.fade && m !== 'fade') { G.fade.t += dt; if (G.fade.t >= G.fade.dur * 2) G.fade = null; }
}
function toTitle() { G = freshState(); G.mode = 'title'; G.menu = 0; Aud.music('title'); Input.clear(); }

/* ---------- title / pause / ending ---------- */
/* title menu entries */
const menuY = () => 150, menuDY = () => titleOptions().length > 4 ? 11 : 13;
function titleOptions() {
  const o = Save.has() ? [['continue', 'CONTINUE']] : [];
  o.push(['new', 'NEW GAME'], ['options', 'OPTIONS']);
  return o;
}
/* the OPTIONS box that opens over the title screen */
const OPT_X = 98, OPT_Y = 132, OPT_DY = 14;
function optionList() {
  const o = [['look', 'HERO: < ' + (HeroLook.get() + 1) + ' OF ' + HERO_LOOKS.length + ' >'], ['sound', 'SOUND: ' + (Aud.muted ? 'OFF' : 'ON')]];
  if (!R3D.failed) o.push(['view', R3D.label()], ['camera', R3D.camLabel()]);
  o.push(['back', 'BACK']);
  return o;
}
function updateTitle(dt) {
  if (G.titleSub) { updateOptions(); return; }
  const opts = titleOptions().length;
  if (Input.consume('mup')) { G.menu = (G.menu + opts - 1) % opts; Aud.sfx('select'); }
  if (Input.consume('mdown')) { G.menu = (G.menu + 1) % opts; Aud.sfx('select'); }
  if (Input.consume('a') || Input.consume('start')) {
    Aud.init(); Aud.resume(); Aud.sfx('confirm');
    const sel = titleOptions()[G.menu][0];
    if (sel === 'new') newGame(); else if (sel === 'continue') { const s = Save.load(); if (s) applySave(s); else newGame(); }
    else if (sel === 'options') { G.titleSub = true; G.optMenu = 0; Input.clear(); }
  }
}
function updateOptions() {
  const list = optionList(), n = list.length, close = () => { G.titleSub = false; Aud.sfx('select'); Input.clear(); };
  if (Input.consume('mup')) { G.optMenu = (G.optMenu + n - 1) % n; Aud.sfx('select'); }
  if (Input.consume('mdown')) { G.optMenu = (G.optMenu + 1) % n; Aud.sfx('select'); }
  if (Input.consume('b') || Input.consume('start')) { close(); return; }
  const sel = list[G.optMenu][0];
  if (sel === 'look') { // left/right (or A) picks how the hero looks
    const k = HERO_LOOKS.length, step = Input.consume('mleft') ? -1 : Input.consume('mright') || Input.consume('a') ? 1 : 0;
    if (step) { HeroLook.set((HeroLook.get() + step + k) % k); G.p.look = HeroLook.get(); Aud.init(); Aud.sfx('select'); }
    return;
  }
  if (Input.consume('a')) {
    Aud.init(); Aud.resume(); Aud.sfx('confirm');
    if (sel === 'sound') Aud.setMuted(!Aud.muted); else if (sel === 'view') R3D.toggle(); else if (sel === 'camera') R3D.toggleCam(); else close();
  }
}
function updatePause(dt) {
  if (G.titleSub) { updateOptions(); return; }
  const n = 4;
  if (Input.consume('mup')) { G.menu = (G.menu + n - 1) % n; G.quitArm = false; Aud.sfx('select'); }
  if (Input.consume('mdown')) { G.menu = (G.menu + 1) % n; G.quitArm = false; Aud.sfx('select'); }
  if (Input.consume('start')) { G.quitArm = false; setMode('play'); return; }
  if (Input.consume('sel')) cycleItem();
  if (Input.consume('a')) {
    Aud.sfx('confirm');
    if (G.menu === 0) setMode('play'); else if (G.menu === 1) { G.titleSub = true; G.optMenu = 0; Input.clear(); } else if (G.menu === 2) { G.save(); toTitle(); }
    else if (!G.quitArm) G.quitArm = true; // quitting without saving asks for a second press
    else toTitle(); // back to the last automatic save
  }
}
function updateEnding(dt) {
  G.endT += dt;
  if (Input.consume('a') && G.endT > 1) { G.endPage++; G.endT = 0; Aud.sfx('select'); if (G.endPage > ENDING.length) startFade(() => enterHeaven(), .8); }
}

/* ---------- rendering ---------- */
function themeFor(room) { return room.theme; }
function drawTiles(c, room, ox, oy) {
  const th = room.theme, fr = Math.floor(G.t * 2.5) % 2;
  for (let ty = 0; ty < 12; ty++) for (let tx = 0; tx < 16; tx++) {
    const t = room.tiles[ty * 16 + tx]; let f = fr;
    if (t === T.FIRE) f = room.fireOn(tx, ty) ? 0 : 1;
    c.drawImage(tileImg(th, t, f), ox + tx * 16, oy + ty * 16);
  }
}
function drawRings(c, room) {
  for (const r of room.rings) {
    c.fillStyle = r.col || '#fcfcfc'; c.globalAlpha = Math.max(0, 1 - r.r / r.max);
    const n = Math.max(12, Math.floor(r.r * 1.6)); for (let a = 0; a < n; a++) c.fillRect(Math.round(r.x + Math.cos(a / n * 6.283) * r.r), Math.round(r.y + Math.sin(a / n * 6.283) * r.r), 2, 2);
  }
  c.globalAlpha = 1;
}
function punch(x, y, r) { for (let k = 0; k < 4; k++) { dctx.globalAlpha = .3; dctx.fillStyle = '#000'; disc(dctx, '#000', Math.round(x), Math.round(y), Math.round(r * (1 - k * .2))); } dctx.globalAlpha = 1; }
function drawDark(c, room) {
  dctx.globalCompositeOperation = 'source-over'; dctx.globalAlpha = 1; dctx.clearRect(0, 0, 256, 192); dctx.fillStyle = 'rgba(0,0,12,.94)'; dctx.fillRect(0, 0, 256, 192);
  dctx.globalCompositeOperation = 'destination-out';
  punch(G.p.x, G.p.y, room.darkR || 40);
  for (let i = 0; i < 192; i++) if (room.tiles[i] === T.TORCH) punch((i % 16) * 16 + 8, (i / 16 | 0) * 16 + 8, 26);
  for (const k of room.pickups) if (k.type === 'light') punch(k.x, k.y, 36);
  for (const o of room.projs) if (o.kind === 'fire' || o.kind === 'orb' || o.kind === 'soul' || o.kind === 'beam') punch(o.x, o.y, 12);
  if (room.chest) punch(room.chest.x, room.chest.y, 24);
  if (room.boss && !room.boss.dead) punch(room.boss.x, room.boss.y, 22);
  dctx.globalCompositeOperation = 'source-over';
  c.drawImage(DARKBUF, 0, 0);
}
function drawChest(c, k) {
  const x = k.x, y = k.y; c.globalAlpha = .4; R(c, '#000', x - 9, y + 7, 18, 3); c.globalAlpha = 1;
  R(c, '#603010', x - 8, y - 6, 16, 13); R(c, '#a06020', x - 7, y - 5, 14, 5); R(c, '#f8d838', x - 1, y - 3, 3, 5); R(c, '#401808', x - 8, y, 16, 1);
  if (k.open) { R(c, '#401808', x - 7, y - 8, 14, 3); R(c, '#201008', x - 6, y - 4, 12, 4); R(c, '#fff8c0', x - 5, y - 12, 10, 6); } else if (Math.floor(G.t * 4) % 6 === 0) R(c, '#fff', x + 5, y - 7, 2, 2);
}
function drawEntities(c, room) {
  if (room.chest) drawChest(c, room.chest);
  if (room.beam) {
    const b = room.beam; c.globalAlpha = .55 + .2 * Math.sin(G.t * 8); R(c, '#fff8c0', b.x - 10, 0, 20, 192); c.globalAlpha = .9; R(c, '#fff', b.x - 4, 0, 8, 192); c.globalAlpha = 1;
    for (let i = 0; i < 4; i++) R(c, '#fff', Math.round(b.x - 12 + ((G.t * 40 + i * 20) % 24)), Math.round(190 - ((G.t * 50 + i * 37) % 190)), 2, 2);
    c.drawImage(icon('seal'), Math.round(b.x - 8), Math.round(b.y + 6 + Math.sin(G.t * 4) * 3));
  }
  if (room.throne) drawThrone(c, room.throne);
  if (room.ladder && room.ladder.x !== undefined) drawLadder(c, room.ladder);
  drawPickups(c);
  const list = [...room.enemies, ...(room.npcs || [])];
  list.sort((a, b) => a.y - b.y);
  for (const e of list) if (e.def) drawEnemy(c, e); else drawNpc(c, e);
  if (room.boss && !room.boss.dead) room.boss.draw(c);
  drawPlayer(c);
  for (const o of room.projs) drawProj(c, o);
  drawFx(c);
  drawHazards(c);
  drawRings(c, room);
}
function drawWorld(c, room, ox, oy, withEnt) {
  c.save(); c.translate(ox, oy);
  drawTiles(c, room, 0, 0);
  if (withEnt) {
    drawEntities(c, room);
    if (room.dark) drawDark(c, room);
    if (G.p.dir !== -1 && G.mode === 'itemget') { c.drawImage(icon(ITEMS[G.chestGet].icon), Math.round(G.p.x - 8), Math.round(G.p.y - 26)); if (Math.floor(G.t * 8) % 2) R(c, '#fff', Math.round(G.p.x) + 8, Math.round(G.p.y) - 28, 2, 2); }
  }
  c.restore();
}
function drawHUD(c) {
  R(c, '#000', 0, 0, W, HUDH); R(c, '#303050', 0, HUDH - 2, W, 2); R(c, '#181830', 0, HUDH - 1, W, 1);
  const p = G.p, dung = G.loc.kind === 'dun';
  // minimap
  R(c, '#181828', 2, 2, 38, 28); R(c, '#404060', 2, 2, 38, 1); R(c, '#404060', 2, 29, 38, 1); R(c, '#404060', 2, 2, 1, 28); R(c, '#404060', 39, 2, 1, 28);
  if (!dung) {
    // 10x10 world: visited screens in their biome's colour, dungeon screens marked once seen
    for (let i = 0; i < ORDER.length; i++) {
      const [sx, sy] = ORDER[i], x = 6 + sx * 3, y = 6 + sy * 2, cur = i === G.loc.idx, k = WORLD.scr[i].k;
      R(c, cur ? (Math.floor(G.t * 4) % 2 ? '#f8d838' : '#fff') : G.seen[i] ? OTH[k - 1].g1 : '#22263a', x, y, 3, 2);
      if (G.seen[i] && !cur && WORLD.dungeon[k - 1] === i) R(c, G.cleared[k - 1] ? '#58f8f8' : '#f83838', x + 1, y, 1, 2);
    }
  } else {
    const dn = parseDungeon(G.loc.d), ds = G.ds[G.loc.d], cw = Math.min(7, Math.floor(34 / dn.w)), ch = Math.min(6, Math.floor(24 / dn.h)), ox = 4 + Math.floor((34 - cw * dn.w) / 2), oy = 4;
    for (const cell of Object.values(dn.cells)) {
      const x = ox + cell.x * cw, y = oy + cell.y * ch, vis = ds.visited[cell.key], cur = cell.key === G.loc.cell;
      let near = false; for (const n of Object.values(cell.exits)) if (ds.visited[n.key]) near = true;
      if (!vis && !near) continue;
      R(c, cur ? (Math.floor(G.t * 4) % 2 ? '#f8d838' : '#fff') : vis ? '#7878c8' : '#34344c', x, y, cw - 1, ch - 1);
      if (vis && cell.boss) R(c, '#f83838', x + 1, y + 1, cw - 3, ch - 3);
      else if (vis && cell.item && !itemTaken(ds, cell)) R(c, '#f8d838', x + 1, y + 1, cw - 3, ch - 3);
    }
  }
  // hearts
  const n = p.max / 2;
  for (let i = 0; i < n; i++) { const hv = clamp(p.hp - i * 2, 0, 2), x = 46 + (i % 7) * 9, y = 3 + Math.floor(i / 7) * 9; c.drawImage(heartImg(hv), x, y); }
  // faith
  c.drawImage(icon('faith'), 45, 20, 8, 8); R(c, '#101040', 55, 22, 56, 5); R(c, '#2878d8', 56, 23, Math.round(54 * p.faith / p.maxFaith), 3); R(c, '#a8d8ff', 56, 23, Math.round(54 * p.faith / p.maxFaith), 1);
  // keys / seals
  if (dung) {
    const ds = G.ds[G.loc.d]; c.drawImage(icon('key'), 115, 3, 12, 12); text(c, 'X' + ds.keys, 128, 6, '#fff');
    if (ds.bossOpen) c.drawImage(icon('bosskey'), 115, 17, 12, 12);
  } else { c.drawImage(icon('seal'), 115, 3, 12, 12); text(c, G.cleared.filter(Boolean).length + '/10', 128, 6, '#f8d838'); }
  // A / B
  const sw = p.lamb ? 'blood' : ['staff', 'flame', 'spirit'][p.sword];
  R(c, '#303050', 186, 3, 18, 18); R(c, '#000', 187, 4, 16, 16); c.drawImage(icon(sw), 187, 4); text(c, 'A', 192, 22, '#f88');
  R(c, '#303050', 212, 3, 18, 18); R(c, '#000', 213, 4, 16, 16); if (p.sel && p.items[p.sel]) c.drawImage(icon(ITEMS[p.sel].icon), 213, 4); text(c, 'B', 218, 22, '#8af');
  if (p.shield) c.drawImage(icon('shield'), 236, 4, 10, 10); if (p.armor) c.drawImage(icon('armor'), 236, 16, 10, 10);
}
function drawBox(c, x, y, w, h) { R(c, '#fff', x, y, w, h); R(c, '#000', x + 1, y + 1, w - 2, h - 2); R(c, '#2838a0', x + 3, y + 3, w - 6, h - 6); R(c, '#101858', x + 4, y + 4, w - 8, h - 8); }
const pageLen = pg => pg.reduce((a, l) => a + l.s.length, 0);
function drawDialog(c) {
  const d = G.dialog; if (!d) return;
  const oy = G.room && G.p.y + HUDH > 118 && G.mode === 'dialog' ? HUDH + 4 - 150 : 0; // keep the hero visible
  drawBox(c, 6, 150 + oy, 244, 68);
  let left = Math.floor(d.chars); const pg = d.pages[d.i];
  for (let i = 0; i < pg.length; i++) {
    const n = Math.min(pg[i].s.length, Math.max(0, left)); left -= pg[i].s.length;
    for (let j = 0; j < n; j++) c.drawImage(glyph(pg[i].s[j].toUpperCase(), pg[i].hl[j] ? '#f8d838' : '#fcfcfc', '#000'), 14 + j * 6, 158 + oy + i * 12);
  }
  if (d.chars >= pageLen(pg) && Math.floor(G.t * 3) % 2) { R(c, '#fff', 238, 208 + oy, 5, 2); R(c, '#fff', 239, 210 + oy, 3, 1); R(c, '#fff', 240, 211 + oy, 1, 1); }
}
function drawBanner(c) {
  const b = G.bannerQ; if (!b) return;
  const h = b.text.length * 10 + 8, y = HUDH + 6; c.globalAlpha = .88; R(c, '#000', 8, y, 240, h); c.globalAlpha = 1; R(c, '#f8d838', 8, y, 240, 1); R(c, '#f8d838', 8, y + h - 1, 240, 1);
  b.text.forEach((l, i) => textC(c, l, 128, y + 5 + i * 10, '#f8e8a0'));
}
function drawBossBar(c) {
  const b = G.room && G.room.boss; if (!b || b.dead) return;
  const y = 224 - 14; R(c, '#000', 8, y - 2, 240, 12); const w = 150;
  text(c, b.name, 12, y, '#f8d838'); const bx = 12 + textW(b.name) + 6, bw = 244 - bx;
  R(c, '#401018', bx, y + 1, bw, 6); R(c, '#000', bx, y + 1, bw, 1);
  R(c, '#f83838', bx + 1, y + 2, Math.round((bw - 2) * b.ratio), 4); R(c, '#f8a0a0', bx + 1, y + 2, Math.round((bw - 2) * b.ratio), 1);
}
function drawBossIntro(c) {
  const bi = G.bossIntro, t = bi.t; c.globalAlpha = Math.min(.8, t); R(c, '#000', 0, HUDH + 40, W, 90); c.globalAlpha = 1;
  const def = DUNGEONS[G.loc.d];
  if (t > .4) { textBig(c, def.bossName, 128, HUDH + 52, '#f83838', '#400', def.bossName.length > 16 ? 1 : 2); R(c, '#f8d838', 40, HUDH + 76, 176, 1); }
  if (t > 1.2) wrapText(BOSS_INTRO[bi.id], 36).forEach((l, i) => textC(c, l, 128, HUDH + 86 + i * 10, '#fff'));
}
function drawTitle(c) {
  const bands = ['#0b0b30', '#161048', '#241462', '#3a1c78', '#5c2882', '#8c3a82', '#c85a70', '#f08858', '#f8b868'];
  bands.forEach((b, i) => R(c, b, 0, i * 14, W, 14));
  const r = mulberry32(5); for (let i = 0; i < 50; i++) { const x = r() * 256, y = r() * 90; if ((Math.floor(G.t * 2 + i) % 4) !== 0) R(c, '#fff', Math.round(x), Math.round(y), 1, 1); }
  // sun & rays
  const sx = 128, sy = 126; c.save(); c.beginPath(); c.rect(0, 0, W, 150); c.clip();
  for (let i = 0; i < 14; i++) { const a = G.t * .08 + i * .45 - 3.14; c.strokeStyle = 'rgba(255,230,140,.22)'; c.lineWidth = 6; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + Math.cos(a) * 200, sy + Math.sin(a) * 200); c.stroke(); }
  disc(c, '#f8d838', sx, sy, 30); disc(c, '#fff8c0', sx, sy, 22); c.restore();
  // hills
  c.fillStyle = '#24603a'; for (let x = 0; x < 256; x += 2) { const h = 150 + Math.sin(x * .03) * 6 + Math.sin(x * .09) * 3; c.fillRect(x, h, 2, 224 - h); }
  c.fillStyle = '#16402a'; for (let x = 0; x < 256; x += 2) { const h = 170 + Math.sin(x * .05 + 2) * 6; c.fillRect(x, h, 2, 224 - h); }
  // tree of knowledge + serpent
  R(c, '#4a2a10', 36, 100, 8, 70); R(c, '#6a3a18', 36, 100, 3, 70); disc(c, '#206020', 40, 90, 22); disc(c, '#38a038', 38, 86, 16); R(c, '#f83838', 28, 90, 3, 3); R(c, '#f83838', 48, 84, 3, 3); R(c, '#f83838', 40, 99, 3, 3);
  for (let i = 0; i < 24; i++) { const y = 168 - i * 2.8, x = 40 + Math.sin(i * .6 + G.t * 2) * 8; disc(c, '#58c848', Math.round(x), Math.round(y), 2); }
  disc(c, '#58c848', 40 + Math.round(Math.sin(24 * .6 + G.t * 2) * 8), 100, 3); R(c, '#f83838', 41 + Math.round(Math.sin(24 * .6 + G.t * 2) * 8), 98, 1, 1);
  // the hero, as chosen on the HERO line, standing on the hill with the staff
  { const lk = HeroLook.get(), img = playerSprite(0, Math.floor(G.t * 2) % 2 && G.titleSub && optionList()[G.optMenu][0] === 'look' ? 1 : 0, null, lk);
    c.save(); c.translate(184, 128); c.scale(2, 2); c.drawImage(img, 0, 0); c.restore();
    R(c, '#4a2a10', 214, 124, 2, 36); R(c, '#f8f8c8', 214, 120, 2, 5); }
  // title
  textBig(c, 'DOMINION', 128, 14, '#f8d838', '#701818', 4); textBig(c, 'RESTORED', 128, 50, '#fcfcfc', '#2a2a80', 4);
  textC(c, 'FROM EDEN TO REVELATION', 128, 88, '#f8e8a0');
  titleOptions().forEach(([, l], i) => { const y = menuY() + i * menuDY(), bw = Math.max(136, textW(l) + 24); R(c, 'rgba(0,0,0,.55)', 128 - bw / 2, y - 2, bw, 11); textC(c, (G.menu === i && Math.floor(G.t * 3) % 2 === 0 ? '> ' : G.menu === i ? '> ' : '  ') + l, 128, y, G.menu === i ? '#f8d838' : '#c8c8d8'); });
  textC(c, 'TAP OR PRESS A', 128, 208, '#a0a0c0'); text(c, 'V1.0', 226, 214, '#707090');
  if (G.titleSub) drawOptions(c);
}
function drawOptions(c) { // the options box, beside the hero so a new look shows right away
  const list = optionList(), h = 26 + list.length * OPT_DY;
  c.globalAlpha = .6; R(c, '#000', 0, 0, W, H); c.globalAlpha = 1;
  drawBox(c, OPT_X - 76, OPT_Y - 20, 152, h);
  textC(c, 'OPTIONS', OPT_X, OPT_Y - 12, '#8af');
  list.forEach(([, l], i) => textC(c, (G.optMenu === i ? '> ' : '  ') + l, OPT_X, OPT_Y + 4 + i * OPT_DY, G.optMenu === i ? '#f8d838' : '#c8c8d8'));
  const lk = HeroLook.get(); c.save(); c.translate(184, 128); c.scale(2, 2); c.drawImage(playerSprite(0, Math.floor(G.t * 2) % 2, null, lk), 0, 0); c.restore();
}
const PAUSE_Y = 156;
function drawPause(c) {
  c.globalAlpha = .88; R(c, '#000', 0, 0, W, H); c.globalAlpha = 1;
  textC(c, 'PAUSED', 128, 8, '#f8d838');
  // seals list
  text(c, 'DOMINION SEALS', 12, 22, '#8af');
  for (let i = 0; i < 10; i++) { const col = i < 5 ? 0 : 1, row = i % 5, x = 12 + col * 116, y = 34 + row * 11; c.drawImage(icon('seal'), x, y - 2, 9, 9); if (!G.cleared[i]) { c.globalAlpha = .75; R(c, '#000', x, y - 2, 9, 9); c.globalAlpha = 1; } text(c, (i + 1) + ' ' + SHORT[i], x + 12, y, G.cleared[i] ? '#fff' : '#707090'); }
  text(c, 'WEAPONS', 12, 96, '#8af');
  const p = G.p;
  [['staff', 0], ['flame', 1], ['spirit', 2]].forEach(([id, lv], i) => { if (p.sword === lv) { c.drawImage(icon(id), 12, 108); R(c, '#f8d838', 12, 126, 16, 1); } });
  const own = ACTIVE_ITEMS.filter(i => p.items[i]);
  own.forEach((id, i) => { const x = 36 + i * 20; c.drawImage(icon(ITEMS[id].icon), x, 108); if (p.sel === id) { R(c, '#8af', x, 126, 16, 1); } });
  if (p.shield) c.drawImage(icon('shield'), 36 + own.length * 20, 108); if (p.armor) c.drawImage(icon('armor'), 56 + own.length * 20, 108);
  if (p.sel) text(c, ITEMS[p.sel].name, 12, 132, '#fff'); else text(c, 'NO ITEMS YET', 12, 132, '#707090');
  text(c, 'HEARTS ' + (p.hp / 2) + '/' + (p.max / 2), 12, 146, '#f88');
  const opts = ['RESUME', 'OPTIONS', 'SAVE AND QUIT', G.quitArm ? 'PRESS A AGAIN TO QUIT' : 'QUIT WITHOUT SAVING'];
  opts.forEach((o, i) => textC(c, (G.menu === i ? '> ' : '  ') + o, 128, PAUSE_Y + i * 10, G.menu === i ? (i === 3 && G.quitArm ? '#f88' : '#f8d838') : '#c8c8d8'));
  textC(c, 'ITEM BUTTON CYCLES B ITEM', 128, 206, '#707090');
  if (G.titleSub) drawOptions(c);
}
function drawEnding(c) {
  const pg = G.endPage, t = G.endT;
  const bands = ['#f8d878', '#f8e8a0', '#fff0b8', '#fff8d0', '#fffce8', '#fffce8'];
  bands.forEach((b, i) => R(c, b, 0, i * 32, W, 32));
  for (let i = 0; i < 12; i++) { const a = G.t * .1 + i * .52; c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 8; c.beginPath(); c.moveTo(128, 120); c.lineTo(128 + Math.cos(a) * 260, 120 + Math.sin(a) * 260); c.stroke(); }
  // city
  R(c, '#c8a838', 40, 100, 176, 70); R(c, '#f8d838', 42, 102, 172, 66);
  for (let i = 0; i < 12; i++) { const x = 46 + i * 14; R(c, '#fff8c0', x, 108, 10, 28); R(c, '#58d8f8', x + 3, 112, 4, 6); }
  for (const x of [70, 118, 166]) { R(c, '#f8d838', x, 70, 20, 40); R(c, '#fff', x + 8, 56, 4, 16); R(c, '#fff8c0', x + 2, 74, 16, 6); }
  R(c, '#fcfcfc', 114, 130, 28, 40); R(c, '#58d8f8', 118, 134, 20, 36); // gate
  R(c, '#38a038', 0, 170, W, 54); R(c, '#58d858', 0, 170, W, 6);
  R(c, '#58d8f8', 100, 176, 56, 48); R(c, '#a8f0ff', 112, 176, 32, 48); // river of life
  for (let i = 0; i < 16; i++) { const x = (i * 17) % 256; R(c, '#f83838', x, 186 + (i % 3) * 8, 2, 2); R(c, '#f8d838', (x + 8) % 256, 196 + (i % 2) * 6, 2, 2); }
  // tree of life
  R(c, '#7a4a1a', 20, 130, 8, 44); disc(c, '#38a038', 24, 124, 18); disc(c, '#58d858', 22, 120, 12); for (let i = 0; i < 6; i++) R(c, '#f8d838', 14 + i * 5, 118 + (i % 3) * 6, 3, 3);
  R(c, 'rgba(0,0,0,.65)', 0, 150, W, 0);
  if (pg < ENDING.length) { drawBox(c, 6, 4, 244, 56 + 0); wrapText(ENDING[pg], 37).slice(0, 4).forEach((l, i) => text(c, l, 14, 12 + i * 11, '#fff')); if (Math.floor(G.t * 3) % 2) text(c, 'A', 236, 48, '#fff'); }
  else { textBig(c, 'THE END', 128, 30, '#701818', '#fff8c0', 3); }
}
function drawGameOver(c) {
  c.globalAlpha = .75; R(c, '#200000', 0, 0, W, H); c.globalAlpha = 1;
  textBig(c, 'YOU FELL', 128, 60, '#f83838', '#000', 3); textC(c, '"THE RIGHTEOUS FALL SEVEN TIMES', 128, 100, '#f8e8a0'); textC(c, 'AND RISE AGAIN." PROV 24:16', 128, 112, '#f8e8a0');
  ['TRY AGAIN', 'QUIT TO TITLE'].forEach((l, i) => textC(c, (G.menu === i ? '> ' : '  ') + l, 128, 146 + i * 14, G.menu === i ? '#f8d838' : '#c8c8d8'));
}
function render() {
  const c = ctx; c.imageSmoothingEnabled = false;
  c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
  const m = G.mode;
  if (R3D.cv) R3D.cv.style.visibility = R3D.active() ? 'visible' : 'hidden';
  if (m === 'title') { drawTitle(c); return; }
  if (m === 'ending') { drawEnding(c); drawFade(c); return; }
  drawHUD(c);
  if (R3D.active()) { c.clearRect(0, HUDH, W, 192); R3D.render(); }
  else {
  c.save(); c.beginPath(); c.rect(0, HUDH, W, 192); c.clip();
  let sx = 0, sy = 0; if (G.shake > 0) { sx = Math.round(rnd(-1, 1) * Math.min(3, G.shake * 8)); sy = Math.round(rnd(-1, 1) * Math.min(3, G.shake * 8)); }
  if (m === 'trans' && G.trans) {
    const tr = G.trans, k = Math.min(1, tr.t / tr.dur), d = DIRV[tr.dir], ox = d[0] * 256, oy = d[1] * 192;
    drawWorld(c, tr.from, HUDH * 0 - ox * k, HUDH - oy * k, false);
    drawWorld(c, tr.to, ox * (1 - k), HUDH + oy * (1 - k), false);
    const p = G.p, px = tr.sx + (tr.nx - tr.sx) * k, py = tr.sy + (tr.ny - tr.sy) * k;
    c.drawImage(playerSprite(p.dir, Math.floor(G.t * 8) % 2), Math.round(px - 8), Math.round(py - 8 + HUDH));
  } else if (G.room) {
    c.translate(sx, HUDH + sy); drawEntitiesWrap(c);
  }
  c.restore();
  }
  if (G.room && m !== 'trans') { drawBossBar(c); }
  drawBanner(c);
  if (m === 'bossintro') drawBossIntro(c);
  if (m === 'dialog') drawDialog(c);
  if (m === 'pause') drawPause(c);
  if (m === 'dying' || m === 'gameover') { if (m === 'gameover') drawGameOver(c); else { c.globalAlpha = Math.min(.7, (1.6 - G.timer) * .6); R(c, '#800000', 0, HUDH, W, 192); c.globalAlpha = 1; } }
  drawFade(c);
}
function drawEntitiesWrap(c) {
  const room = G.room;
  drawTiles(c, room, 0, 0);
  drawEntities(c, room);
  if (G.mode === 'itemget') { const p = G.p; c.drawImage(icon(ITEMS[G.chestGet].icon), Math.round(p.x - 8), Math.round(p.y - 28 - Math.sin(G.t * 6))); if (Math.floor(G.t * 8) % 2) R(c, '#fff', Math.round(p.x) + 8, Math.round(p.y) - 30, 2, 2); R(c, 'rgba(255,255,200,.0)', 0, 0, 0, 0); }
  if (room.dark) drawDark(c, room);
  if (G.mode === 'dying') { /* player spins handled by tint */ }
}
function drawFade(c) {
  const f = G.fade; if (!f) return;
  const k = f.t < f.dur ? f.t / f.dur : Math.max(0, 2 - f.t / f.dur); c.globalAlpha = clamp(k, 0, 1); R(c, '#000', 0, 0, W, H); c.globalAlpha = 1;
}

/* ---------- main loop ---------- */
let last = performance.now(), acc = 0;
function frame(now) {
  let dt = (now - last) / 1000; last = now; if (dt > .1) dt = .1;
  acc += dt;
  while (acc >= 1 / 60) { update(1 / 60); acc -= 1 / 60; }
  render();
  requestAnimationFrame(frame);
}
function boot() {
  Input.init(); R3D.init();
  // tap on the screen advances menus / dialogs
  cv.addEventListener('pointerdown', e => {
    Aud.init(); Aud.resume();
    const m = G.mode;
    if ((m === 'title' || m === 'pause') && G.titleSub) { // a tap on an option picks it; a tap outside the box closes it
      const r = cv.getBoundingClientRect(), y = (e.clientY - r.top) / r.height * H;
      const list = optionList(), x = (e.clientX - r.left) / r.width * W;
      for (let i = 0; i < list.length; i++) { const yy = OPT_Y + 4 + i * OPT_DY; if (y >= yy - 5 && y <= yy + 9 && x > OPT_X - 76 && x < OPT_X + 76) { G.optMenu = i; if (list[i][0] === 'look' && x < OPT_X - 30) Input.press.mleft = true; else Input.press.a = true; return; } }
      if (x < OPT_X - 76 || x > OPT_X + 76 || y < OPT_Y - 20 || y > OPT_Y + 6 + list.length * OPT_DY) Input.press.b = true;
      return;
    }
    if (m === 'title') {
      const r = cv.getBoundingClientRect(), y = (e.clientY - r.top) / r.height * H, n = titleOptions().length;
      for (let i = 0; i < n; i++) { const yy = menuY() + i * menuDY(); if (y >= yy - 5 && y <= yy + 11) { G.menu = i; Input.press.a = true; return; } }
      Input.press.a = true;
    } else if (m === 'dialog' || m === 'gameover' || m === 'ending') Input.press.a = true;
    else if (m === 'pause') { const r = cv.getBoundingClientRect(), y = (e.clientY - r.top) / r.height * H; for (let i = 0; i < 4; i++) { const yy = PAUSE_Y + i * 10; if (y >= yy - 2 && y <= yy + 7) { G.menu = i; Input.press.a = true; return; } } }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (G.mode === 'play') setMode('pause'); Aud.ctx && Aud.ctx.suspend && Aud.ctx.suspend(); } else Aud.resume(); });
  // debug hooks for testing: ?d=N jumps into dungeon N with items, ?god for invulnerability
  const q = new URLSearchParams(location.search);
  if (q.has('god')) G.godmode = true;
  G.mode = 'title'; Aud.music('title');
  window.__dr = { get G() { return G; }, newGame, applySave, enterDungeon, loadOver, say, slide, toTitle, respawn, makeBoss, spawnEnemy };
  if (q.has('d')) {
    const d = +q.get('d') - 1; newGame(); G.dialog = null; setMode('play'); G.godmode = q.has('god');
    const p = G.p; p.max = 6 + 2 * d; p.hp = p.max;
    const give = ['flame', 'dove', 'bow', 'rod', 'shofar', 'sling', 'shield', 'spirit', 'armor'];
    for (let i = 0; i < d; i++) { G.cleared[i] = true; const it = give[i]; if (it === 'flame') p.sword = 1; else if (it === 'spirit') p.sword = 2; else if (it === 'shield') p.shield = true; else if (it === 'armor') p.armor = true; else p.items[it] = true; }
    if (d >= 8) p.sword = 2; p.sel = ACTIVE_ITEMS.find(i => p.items[i]) || null;
    if (q.has('boss')) { if (d === 9) { p.items.testimony = true; p.blood = true; } const it = give[d]; if (it === 'flame') p.sword = Math.max(p.sword, 1); else if (it === 'spirit') p.sword = 2; else if (it === 'shield') p.shield = true; else if (it === 'armor') p.armor = true; else if (it) p.items[it] = true; p.sel = ACTIVE_ITEMS.find(i => p.items[i]) || null; const ds = G.ds[d]; ds.item = true; ds.bossOpen = true; G.overPos = { idx: WORLD.dungeon[d], x: 128, y: 60 }; enterDungeon(d); const dn = parseDungeon(d), b = Object.values(dn.cells).find(c => c.boss); G.loc.cell = b.key; G.room = makeRoom(buildDunRoom(G, d, b)); G.p.x = 128; G.p.y = 164; populate(G.room); }
    else if (q.has('ow')) loadOver(WORLD.dungeon[d], 128, 100);
    else { G.overPos = { idx: WORLD.dungeon[d], x: 128, y: 60 }; enterDungeon(d); }
  }
  requestAnimationFrame(frame);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
}
boot();
