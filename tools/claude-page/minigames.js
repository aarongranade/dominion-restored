/* Claude-page-only mini-games (see ROADMAP.md: one per dungeon, played in a circus tent on the screen next to
   its dungeon, open from the start). Not part of the real game or the app yet: tools/claude-page/build.py appends this file to
   the Claude page build only, before test-menu.js.
   While G.mini is set and the mode is 'play', the mini-game runs the update and draws the whole screen;
   dialogs, the pause menu and fades still use the game's own code. */
const MINI = {
  games: { 0: () => new EdenRun(), 1: () => new NoahArk(), 2: () => new JobRun() }, // dungeon index -> mini-game
  has(d) { return !!this.games[d]; },
  start(d) { G.mini = this.games[d](); G.mini.d = d; G.bannerQ = null; G.dialog = null; setMode('play'); G.mini.begin(); },
  // back to the overworld, just outside the dungeon entrance
  finish() { startFade(() => { G.mini = null; const o = G.overPos || { idx: WORLD.dungeon[0], x: 128, y: 60 }; loadOver(o.idx, o.x, o.y); }, .8); },
};

/* ---- 1. Eden: fleeing the garden (Genesis 3:22-24) ----
   A vertical scroller. Adam and Eve run up the screen toward the garden's east gate while the angel
   with the flaming sword follows behind. Thorns, trees, serpents, lions and boars are in the way; each
   hit lets the angel close in. Three hits and the run restarts from the last checkpoint (every 20 s).
   After one minute the gate comes into view, and a cutscene shows the angel taking his place in it. */
class EdenRun {
  constructor() {
    this.LEN = 60; this.CP = 20; this.th = OTH[0]; // one minute, a checkpoint every 20 seconds
    this.t = 0; this.shake = 0;
    this.adam = { a: '#f0b088', b: '#6a3a18', c: '#f0b088' }; // skin, hair, skin (the tunic colour becomes skin: fig leaves are drawn on top)
    this.eve = { a: '#e8a070', b: '#a04818', c: '#e8a070' };
    this.reset(0);
  }
  reset(T) {
    Object.assign(this, { T, checkpoint: T, objs: [], fx: [], leaving: false, px: 128, py: 164, gap: 3, inv: 1.2, lastHit: T, lastGap: 6, state: 'run', gate: null, scene: null, ax: 128, ay: 260, ct: 0 });
    this.dist = T * 70; this.nextAt = this.dist + 90; // spawning is by distance run, so groups stay apart at any speed
  }
  begin() {
    Aud.music('o1');
    say(['{FLEEING THE GARDEN.} "THEREFORE THE LORD GOD SENT HIM FORTH FROM THE GARDEN OF EDEN, TO TILL THE GROUND FROM WHENCE HE WAS TAKEN." (GENESIS 3:23)',
      'RUN WITH ADAM AND EVE TO THE EAST GATE. DODGE {THORNS}, {TREES}, {SERPENTS}, {LIONS} AND {BOARS}. EACH HIT LETS THE ANGEL CLOSE IN.']);
  }
  speed() { return this.state === 'scene' ? 0 : this.gate && this.gate.y >= 72 ? 0 : 62 + 30 * Math.min(1, this.T / this.LEN); }

  update(dt) {
    this.t += dt; if (this.shake > 0) this.shake -= dt; if (this.inv > 0) this.inv -= dt;
    if (this.state === 'scene') return this.updateScene(dt);
    const sp = this.speed(), k = Math.min(1, this.T / this.LEN);
    if (this.state === 'run') this.T += dt;
    this.dist += sp * dt;
    if (this.gate) this.gate.y += sp * dt; // the gate scrolls into view, then everything stops
    // the pair
    if (this.state === 'run' || (this.state === 'gate' && this.gate.y < 72)) {
      this.px = clamp(this.px + Input.dx * 92 * dt, 24, 232); this.py = clamp(this.py + Input.dy * 80 * dt, 60, 196);
    } else if (this.state === 'gate') { // the gate is open ahead: walk out through it
      const tx = 128, ty = this.gate.y - 30; this.px += clamp(tx - this.px, -60 * dt, 60 * dt); this.py += clamp(ty - this.py, -60 * dt, 60 * dt);
      if (Math.abs(this.px - tx) < 2 && this.py - ty < 2 && !this.leaving) { this.leaving = true; Aud.sfx('door'); startFade(() => { this.state = 'scene'; this.scene = { t: 0 }; this.objs = []; }, .7); }
    } else if (this.state === 'caught') {
      this.ct += dt;
      if (this.ct > 1.2 && !this.caughtSaid) { this.caughtSaid = true; say(['THE ANGEL WITH THE FLAMING SWORD HAS CAUGHT UP WITH YOU. TRY AGAIN FROM THE LAST CHECKPOINT.'], () => { this.caughtSaid = false; this.reset(this.checkpoint); }); }
    }
    // the angel: farther back with every heart left, closing in after each hit
    const aty = this.state === 'caught' ? this.py + 22 : 238 - (3 - this.gap) * 13;
    this.ay += (aty - this.ay) * Math.min(1, dt * 3); this.ax += (this.px - this.ax) * Math.min(1, dt * 1.4);
    // obstacles scroll down and do their own thing
    for (const o of this.objs) {
      o.t += dt; o.y += sp * dt;
      if (o.type === 'snake') { o.x += o.vx * dt; o.y += Math.sin(o.t * 6) * 10 * dt; }
      else if (o.type === 'lion') {
        if (o.st === 0 && o.t > .9) { o.st = 1; const a = Math.atan2(this.py - o.y, this.px - o.x); o.vx = Math.cos(a) * 150; o.vy = Math.sin(a) * 150; Aud.sfx('bossroar'); }
        if (o.st === 1) { o.x += o.vx * dt; o.y += o.vy * dt; }
      } else if (o.type === 'boar') {
        if (o.st === 0) { o.y = 26; if (o.t > .9) { o.st = 1; o.y = -12; Aud.sfx('boom'); } }
        else o.y += 150 * dt;
      }
    }
    this.objs = this.objs.filter(o => o.y < 250 && o.x > -30 && o.x < 286);
    for (let i = this.fx.length - 1; i >= 0; i--) { const f = this.fx[i]; f.life -= dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.life <= 0) this.fx.splice(i, 1); }
    if (this.state !== 'run' && this.state !== 'gate') return;
    // trees are solid: they push the pair back toward the angel
    for (const o of this.objs) if (o.type === 'tree') {
      const dx = this.px - o.x, dy = this.py - (o.y + 2), ox = 18 - Math.abs(dx), oy = 10 - Math.abs(dy);
      if (ox > 0 && oy > 0) { if (ox < oy) this.px += Math.sign(dx || 1) * ox; else this.py += Math.sign(dy || 1) * oy; }
      if (this.py > 198) { this.hit(); this.py = 190; this.px = clamp(this.px + (dx < 0 ? -22 : 22), 24, 232); }
    }
    // touching the angel, or his flaming sword as it turns, costs a heart too
    const sa = this.t * 7, sy = this.ay - 14;
    let angel = Math.abs(this.px - this.ax) < 22 && this.py + 6 > this.ay - 28;
    for (let r = 4; r <= 24 && !angel; r += 4) if (dist(this.px, this.py, this.ax + Math.cos(sa) * r, sy + Math.sin(sa) * r) < 10) angel = true;
    if (angel) this.hit(true);
    // everything else hurts
    for (const o of this.objs) {
      if (o.type === 'tree' || (o.type === 'boar' && o.st === 0)) continue;
      if (Math.abs(o.x - this.px) < 13 + o.hw && Math.abs(o.y - (this.py + 2)) < 5 + o.hh) this.hit();
    }
    if (this.state !== 'run') return;
    // what comes next, getting busier as the run goes on
    if (this.dist >= this.nextAt && this.T < this.LEN - 3) this.nextAt = this.dist + this.spawn(k);
    if (this.T >= this.checkpoint + this.CP && this.T < this.LEN) { this.checkpoint += this.CP; G.banner('CHECKPOINT: ' + Math.round(this.checkpoint / this.LEN * 100) + '% OF THE WAY', 1.6); Aud.sfx('key'); }
    if (this.gap < 3 && this.T - this.lastHit > 15) { this.gap++; this.lastHit = this.T; Aud.sfx('heart'); } // fifteen clean seconds win back a heart
    if (this.T >= this.LEN) { this.state = 'gate'; this.gate = { y: -40 }; G.banner('THE EAST GATE OF EDEN!', 2.4); Aud.sfx('seal'); }
  }
  // adds the next group of obstacles and returns how far to run before the one after it
  spawn(k) {
    const T = this.T, add = o => this.objs.push(Object.assign({ t: 0, st: 0, hw: 6, hh: 5 }, o));
    const kinds = [['thorns', 3], ['thorn', 2], ['snake', 2]].concat(T > 5 ? [['trees', 2]] : [], T > 15 ? [['lion', 1.6]] : [], T > 25 ? [['boar', 1.6]] : []);
    let r = Math.random() * kinds.reduce((a, q) => a + q[1], 0), kind = kinds[0][0];
    for (const [n, w] of kinds) { if ((r -= w) <= 0) { kind = n; break; } }
    if (kind === 'thorns') { // a hedge of thorns and thistles (Genesis 3:18) with a gap to slip through
      // the gap is four bushes wide and never more than four bushes from the last one, so it can always be reached
      const gapAt = clamp(this.lastGap + rint(-4, 4), 0, 9), len = rint(4, 7); this.lastGap = gapAt;
      for (let i = 0; i < 13; i++) if ((i < gapAt || i > gapAt + 3) && Math.abs(i - (gapAt + 1.5)) <= len) add({ type: 'thorn', x: 32 + i * 16, y: -12 });
      return 140 - k * 25; // plenty of room before the next group, even at the slow start
    } else if (kind === 'thorn') add({ type: 'thorn', x: rnd(32, 224), y: -12 });
    else if (kind === 'trees') { const n = rint(2, 3); for (let i = 0; i < n; i++) add({ type: 'tree', x: 40 + rint(0, 11) * 16, y: -14 - i * 22 }); }
    else if (kind === 'snake') { const left = Math.random() < .5; add({ type: 'snake', x: left ? -12 : 268, y: rnd(10, 60), vx: (left ? 1 : -1) * rnd(40, 60 + T * .4), hw: 7, hh: 4 }); }
    else if (kind === 'lion') { const left = Math.random() < .5; add({ type: 'lion', x: left ? 26 : 230, y: rnd(40, 100), left }); }
    else if (kind === 'boar') add({ type: 'boar', x: clamp(this.px + rnd(-20, 20), 32, 224), y: 26 });
    return kind === 'trees' ? 120 : 80 - k * 15;
  }
  hit(fromAngel) {
    if (this.inv > 0 || this.state !== 'run' && this.state !== 'gate') return;
    // a stumble drops them back toward the angel; touching the angel throws them forward, away from him
    this.gap--; this.inv = 1.4; this.lastHit = this.T; this.py = fromAngel ? Math.max(60, this.py - 26) : Math.min(198, this.py + 14); this.shake = .25; Aud.sfx('hurt');
    for (let i = 0; i < 10; i++) { const a = Math.random() * 6.283, s = rnd(30, 80); this.fx.push({ x: this.px, y: this.py, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(.3, .6), col: pick(['#f83838', '#fff']) }); }
    if (this.gap <= 0) { this.state = 'caught'; this.ct = 0; Aud.sfx('over'); }
  }
  updateScene(dt) {
    const s = this.scene; s.t += dt;
    if (s.t > 1.6 && !s.flashed) { s.flashed = true; Aud.sfx('bossroar'); this.shake = .4; }
    if (s.t > 2.6 && !s.said) {
      s.said = true;
      say(['"SO HE DROVE OUT THE MAN; AND HE PLACED AT THE EAST OF THE GARDEN OF EDEN {CHERUBIMS}, AND A {FLAMING SWORD WHICH TURNED EVERY WAY}, TO KEEP THE WAY OF THE TREE OF LIFE." (GENESIS 3:24)',
        'BUT GOD HAD ALREADY MADE A PROMISE: THE SEED OF THE WOMAN WOULD {BRUISE THE SERPENT\'S HEAD} (GENESIS 3:15). ONE DAY THE WAY TO THE TREE OF LIFE WILL BE OPEN AGAIN (REVELATION 22:14).'],
        () => { Aud.sfx('seal'); MINI.finish(); });
    }
  }

  /* ---------- drawing ---------- */
  draw(c) {
    c.save();
    if (this.shake > 0) c.translate(Math.round(rnd(-2, 2)), Math.round(rnd(-2, 2)));
    if (this.state === 'scene') this.drawScene(c); else this.drawRun(c);
    c.restore();
  }
  ground(c, row, x, y, outside) {
    const h = (row * 73856093 ^ x * 19349663) >>> 0, th = this.th, col = x / 16;
    if (outside) { // east of Eden: bare sand and pebbles (the desert theme's tiles)
      c.drawImage(tileImg(col === 0 || col === 15 ? th : OTH[2], col === 0 || col === 15 ? T.ROCK : h % 9 === 0 ? T.DECO : T.FLOOR, 0), x, y); return;
    }
    const t = col === 0 || col === 15 ? T.TREE : col === 7 || col === 8 ? T.PATH : h % 7 === 0 ? T.DECO : T.FLOOR; // a path runs up the middle
    c.drawImage(tileImg(th, t, 0), x, y);
  }
  drawRun(c) {
    // ground scrolls down as the pair runs up; past the gate the land is bare
    const off = this.dist % 16, base = Math.floor(this.dist / 16);
    for (let j = -1; j < 15; j++) {
      const y = Math.round(224 - (j + 1) * 16 + off), row = base + j, outside = this.gate && y < this.gate.y - 24;
      for (let x = 0; x < 256; x += 16) this.ground(c, row, x, y, outside);
    }
    if (this.gate) { // the east gate: a hedge with an opening
      const gy = Math.round(this.gate.y);
      for (let x = 0; x < 256; x += 16) if (x < 104 || x >= 152) for (const dy of [-24, -8]) c.drawImage(tileImg(this.th, T.TREE, 0), x, gy + dy);
      R(c, '#c8b070', 104, gy - 24, 48, 32);
    }
    // obstacles, nearest last
    const list = this.objs.slice().sort((a, b) => a.y - b.y), fr = Math.floor(this.t * 6) % 2;
    for (const o of list) {
      const x = Math.round(o.x - 8), y = Math.round(o.y - 8);
      if (o.type === 'thorn') c.drawImage(sprite('thorn', { a: '#6a8a28', b: '#3a5018', c: '#c8d848' }, 0), x, y);
      else if (o.type === 'tree') c.drawImage(tileImg(this.th, T.TREE, 0), x, y);
      else if (o.type === 'snake') c.drawImage(sprite('snake', ENEMY.viper.pal, fr), x, y);
      else if (o.type === 'lion') { let img = sprite('beast', ENEMY.lion.pal, o.st ? fr : 0); if (o.st === 0 && Math.floor(o.t * 10) % 2) img = flashed(img); c.drawImage(img, x, y); if (o.st === 0) textC(c, '!', o.x, y - 8, '#f83838'); }
      else if (o.type === 'boar') {
        if (o.st === 0) { if (Math.floor(o.t * 8) % 2) { textC(c, '!', o.x, 18, '#f83838'); R(c, '#f83838', Math.round(o.x) - 1, 28, 3, 8); } }
        else c.drawImage(sprite('beast', { a: '#6a4a3a', b: '#3a2418', c: '#e8e0c8' }, fr), x, y);
      }
    }
    // the pair
    if (this.state !== 'caught' || Math.floor(this.ct * 8) % 2) if (!(this.inv > 0 && Math.floor(this.inv * 16) % 2)) this.drawPair(c, this.px, this.py, 1, Math.floor(this.t * 8) % 2);
    for (const f of this.fx) R(c, f.col, Math.round(f.x), Math.round(f.y), 2, 2);
    // the angel behind them
    this.drawAngel(c, this.ax, this.ay);
    // top bar: progress to the gate and the hits left
    R(c, '#000', 0, 0, 256, 14); R(c, '#303050', 0, 13, 256, 1);
    text(c, 'FLEE EDEN', 4, 4, '#f8e8a0');
    const k = Math.min(1, this.T / this.LEN); R(c, '#283828', 64, 5, 132, 5); R(c, '#58c848', 64, 5, Math.round(132 * k), 5);
    for (let i = this.CP; i < this.LEN; i += this.CP) R(c, '#f8d838', 64 + Math.round(132 * i / this.LEN), 4, 1, 7); // checkpoints
    R(c, '#c8b070', 196, 3, 4, 9);
    for (let i = 0; i < 3; i++) c.drawImage(heartImg(i < this.gap ? 2 : 0), 216 + i * 12, 3);
  }
  drawPair(c, x, y, dir, fr) {
    // Adam and Eve in aprons of fig leaves (Genesis 3:7)
    [[x - 8, this.adam, 0], [x + 8, this.eve, 1]].forEach(([cx, pal, look]) => {
      const X = Math.round(cx - 8), Y = Math.round(y - 8);
      c.globalAlpha = .3; R(c, '#000', X + 3, Y + 15, 10, 2); c.globalAlpha = 1;
      c.drawImage(playerSprite(dir, fr, pal, look), X, Y);
      R(c, '#2f8a2f', X + 4, Y + 11, 8, 2); R(c, '#58c848', X + 5, Y + 11, 2, 1); R(c, '#58c848', X + 9, Y + 12, 2, 1); R(c, '#2f8a2f', X + 6, Y + 13, 4, 1);
    });
  }
  drawAngel(c, x, y) {
    // a cherub, twice life size, with "a flaming sword which turned every way"
    const a = this.t * 7;
    c.save(); c.translate(Math.round(x), Math.round(y)); c.scale(2, 2); drawNpc(c, { kind: 'angel', x: 0, y: 0, t: this.t }); c.restore();
    for (let i = 2; i < 13; i++) { const r = i * 2; R(c, i > 10 ? '#fff8c0' : i % 2 ? '#f8a038' : '#f83800', Math.round(x + Math.cos(a) * r) - 1, Math.round(y - 14 + Math.sin(a) * r) - 1, 3, 3); }
  }
  drawScene(c) {
    // looking back from outside the gate: bare land above, the gate in the middle, the garden and the Tree of Life below
    const s = this.scene;
    for (let y = 0; y < 224; y += 16) for (let x = 0; x < 256; x += 16) this.ground(c, y / 16 * 31 + 7, x, y, y < 112);
    for (const [tx, ty] of [[40, 40], [200, 56], [72, 88], [176, 24]]) c.drawImage(sprite('thorn', { a: '#6a8a28', b: '#3a5018', c: '#c8d848' }, 0), tx, ty);
    for (let x = 0; x < 256; x += 16) if (x < 104 || x >= 152) for (const dy of [112, 128]) c.drawImage(tileImg(this.th, T.TREE, 0), x, dy);
    // the Tree of Life, glowing in the garden
    const tx = 128, ty = 186; c.globalAlpha = .35 + .15 * Math.sin(this.t * 3); disc(c, '#fff8c0', tx, ty - 6, 26); c.globalAlpha = 1;
    R(c, '#6a3a18', tx - 3, ty, 6, 22); disc(c, '#206020', tx, ty - 8, 16); disc(c, '#38a038', tx - 2, ty - 11, 12);
    for (const [fx, fy] of [[-8, -10], [6, -14], [0, -4], [9, -4], [-4, -17]]) R(c, '#f8d838', tx + fx, ty + fy, 2, 2);
    // Adam and Eve, turned to look back
    this.drawPair(c, 128, 70, 0, 0);
    // the angel rises from the garden and stands in the gate
    const k = Math.min(1, s.t / 1.6), ay = Math.round(250 - (250 - 136) * (1 - (1 - k) * (1 - k)));
    if (s.t > 1.5 && s.t < 1.9) { c.globalAlpha = 1 - (s.t - 1.5) / .4; R(c, '#fff', 0, 0, 256, 224); c.globalAlpha = 1; }
    this.drawAngel(c, 128, ay);
  }
}

/* ---- 2. Noah's Ark: gather, build, and summon (Genesis 6-8) ----
   Three phases in the Ark's dungeon slot, each with its own soft fail state: a setback costs time or
   materials, never the structural progress already made, so nothing is a hard restart from zero.
   GATHER: free-roam a clearing on Ararat collecting gopher wood and pitch (Genesis 6:14) while wolves
   prowl and the storm clock runs; reach the quota, then walk it to the ark-site marker. A wolf's touch
   knocks a carried item loose (real lost progress); the clock running out before the quota is met
   reverts to the last checkpoint (banked automatically every 12.5s), not to zero.
   BUILD: place logs and seal each of the ark's three decks with pitch while the flood meter rises.
   The storm periodically pops a log back out of an unsealed deck (a sealed deck is safe). Running out
   of a material mid-build sends Noah back to the clearing for a quick, untimed top-up of just the
   shortfall - but the flood keeps rising while he's away, so the trip is never free. If the flood
   meter fills, the unsealed framing is swept away and must be reframed, but spent material is not
   refunded and banked stock on hand carries over.
   SUMMON: a memory-match board of the animals coming two by two - sevens for the one clean kind, the
   dove (Genesis 7:2-3) - under a seven-day countdown (Genesis 7:4). A match boards for good; a miss
   flips back and scrambles two other hidden tiles. If the days run out before every pair is aboard,
   the rain starts and the board reshuffles - but boarded pairs stay boarded, so each retry is shorter
   than the last. */
const ARK_SPECIES = [
  { name: 'THE DOVE', pairs: 2, shape: 'bat', pal: { a: '#f0ece0', b: '#c8c0a8', c: '#f8d838' } },
  { name: 'THE RAVEN', pairs: 1, shape: 'bat', pal: ENEMY.raven.pal },
  { name: 'THE LION', pairs: 1, shape: 'beast', pal: ENEMY.lion.pal },
  { name: 'THE OX', pairs: 1, shape: 'beast', pal: { a: '#e8e0c8', b: '#5a3a20', c: '#2a1810' } },
  { name: 'THE CAMEL', pairs: 1, shape: 'beast', pal: { a: '#c8a060', b: '#8a6a3a', c: '#f0d8a0' } },
  { name: 'THE SERPENT', pairs: 1, shape: 'snake', pal: ENEMY.viper.pal },
  { name: 'THE FROG', pairs: 1, shape: 'blob', pal: ENEMY.frog.pal },
];
class NoahArk {
  constructor() {
    this.t = 0; this.shake = 0; this.wood = 0; this.pitch = 0;
    this.noahPal = { a: '#5a7a4a', b: '#d8d8d8', c: '#e0a878' }; // an elder's robe, grey hair and beard
    this.FLOOD_LEN = 42;
    this.phase = 'gather'; this.startGather(12, 3, true);
  }
  begin() {
    Aud.music('o2');
    say(['{THE ARK.} "MAKE THEE AN ARK OF GOPHER WOOD... AND PITCH IT WITHIN AND WITHOUT WITH PITCH." (GENESIS 6:14)',
      'GATHER {12 LOGS} AND {3 PITCH} BEFORE THE STORM BREAKS, THEN CARRY THEM TO THE ARK SITE. WATCH FOR WOLVES - THEY WILL KNOCK YOUR LOAD LOOSE!']);
  }
  spawnWolf() { return { x: rnd(40, 216), y: rnd(50, 190), vx: 0, vy: 0, t: rnd(0, 2) }; }

  /* ---------- shared gather sub-system: the opening phase, and the build phase's short top-up ---------- */
  startGather(tWood, tPitch, timed) {
    this.gA = {
      tWood, tPitch, timed, T: 0, LEN: 50, cpT: 0, cpWood: this.wood, cpPitch: this.pitch,
      px: 128, py: 190, inv: 0, items: [], fx: [], spawnT: .6, ready: false,
      wolves: [this.spawnWolf(), this.spawnWolf()].slice(0, timed ? 2 : 1),
    };
  }
  updateGather(dt) {
    const g = this.gA;
    if (g.timed) g.T += dt;
    g.px = clamp(g.px + Input.dx * 86 * dt, 16, 240); g.py = clamp(g.py + Input.dy * 86 * dt, 26, 212);
    g.spawnT -= dt;
    if (g.spawnT <= 0 && g.items.length < 5) {
      g.spawnT = rnd(1.1, 2.2);
      const needWood = this.wood < g.tWood, needPitch = this.pitch < g.tPitch;
      const type = needWood && needPitch ? pick(['log', 'log', 'pitch']) : needWood ? 'log' : needPitch ? 'pitch' : pick(['log', 'pitch']);
      g.items.push({ type, x: rnd(24, 232), y: rnd(32, 204), t: 0 });
    }
    for (const it of g.items) it.t += dt;
    g.items = g.items.filter(it => {
      if (Math.hypot(it.x - g.px, it.y - g.py) < 11) { if (it.type === 'log') this.wood++; else this.pitch++; Aud.sfx('pick'); return false; }
      return true;
    });
    for (const w of g.wolves) { // wander, and close in once the player strays near
      w.t -= dt; const d = Math.hypot(g.px - w.x, g.py - w.y);
      if (d < 60) { w.vx = (g.px - w.x) / (d || 1) * 44; w.vy = (g.py - w.y) / (d || 1) * 44; }
      else if (w.t <= 0) { w.t = rnd(1, 2.2); const a = Math.random() * 6.283; w.vx = Math.cos(a) * 30; w.vy = Math.sin(a) * 30; }
      w.x = clamp(w.x + w.vx * dt, 16, 240); w.y = clamp(w.y + w.vy * dt, 26, 212);
    }
    if (g.inv > 0) g.inv -= dt;
    for (const w of g.wolves) if (!(g.inv > 0) && Math.hypot(w.x - g.px, w.y - g.py) < 11) {
      g.inv = 1.1; this.shake = .2; Aud.sfx('hurt');
      if (this.pitch > 0 && (this.wood === 0 || Math.random() < .5)) this.pitch--; else if (this.wood > 0) this.wood--;
      for (let i = 0; i < 6; i++) g.fx.push({ x: g.px, y: g.py, vx: rnd(-50, 50), vy: rnd(-50, 50), life: .4, col: '#f83838' });
    }
    for (let i = g.fx.length - 1; i >= 0; i--) { const f = g.fx[i]; f.life -= dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.life <= 0) g.fx.splice(i, 1); }
    if (g.timed) { // bank a checkpoint every 12.5 seconds, so a timeout never loses more than one quarter-run
      g.cpT += dt;
      if (g.cpT >= 12.5) { g.cpT -= 12.5; g.cpWood = this.wood; g.cpPitch = this.pitch; Aud.sfx('heart'); }
    }
    if (!g.ready && this.wood >= g.tWood && this.pitch >= g.tPitch) { g.ready = true; G.banner('ENOUGH TO BEGIN - CARRY IT TO THE ARK SITE!', 2.4); }
    if (g.ready && Math.hypot(g.px - 128, g.py - 34) < 16) {
      Aud.sfx('door'); const wasInitial = this.phase === 'gather'; this.gA = null; if (wasInitial) this.startBuild();
      return;
    }
    if (g.timed && g.T >= g.LEN && !g.ready) { // the storm breaks: back to the checkpoint, not to zero
      this.wood = g.cpWood; this.pitch = g.cpPitch; g.T = 0; g.cpT = 0; g.items = []; g.wolves = [this.spawnWolf(), this.spawnWolf()];
      this.shake = .4; Aud.sfx('boom'); G.banner('THE SKY BREAKS OPEN - BACK TO THE LAST CHECKPOINT!', 2.6);
    }
  }
  groundG(c) {
    for (let y = 14; y < 224; y += 16) for (let x = 0; x < 256; x += 16) {
      const h = (((x / 16) * 73856093) ^ ((y / 16) * 19349663)) >>> 0;
      c.drawImage(tileImg(OTH[1], h % 11 === 0 ? T.DECO : T.FLOOR, 0), x, y);
    }
    for (let x = 0; x < 256; x += 16) { c.drawImage(tileImg(OTH[1], T.TREE, 0), x, 14); c.drawImage(tileImg(OTH[1], T.TREE, 0), x, 208); }
  }
  drawGather(c) {
    c.save(); if (this.shake > 0) c.translate(Math.round(rnd(-2, 2)), Math.round(rnd(-2, 2)));
    this.groundG(c);
    const g = this.gA;
    R(c, '#6a4a28', 112, 24, 32, 16); R(c, '#4a3218', 112, 20, 32, 6); // the ark-site marker
    if (g.ready && Math.floor(this.t * 4) % 2) textC(c, 'HERE!', 128, 10, '#f8d838');
    for (const it of g.items) {
      const bob = Math.sin(it.t * 4) * 2, x = Math.round(it.x), y = Math.round(it.y + bob);
      if (it.type === 'log') { R(c, '#8a5a2a', x - 6, y - 3, 12, 6); R(c, '#c89050', x - 6, y - 3, 12, 1); R(c, '#5a3a18', x - 6, y + 2, 12, 1); }
      else { disc(c, '#181818', x, y, 4); disc(c, '#3a3a3a', x - 1, y - 1, 2); }
    }
    for (const w of g.wolves) c.drawImage(sprite('beast', ENEMY.jackal.pal, Math.floor(this.t * 8) % 2), Math.round(w.x - 8), Math.round(w.y - 8));
    for (const f of g.fx) R(c, f.col, Math.round(f.x), Math.round(f.y), 2, 2);
    if (!(g.inv > 0 && Math.floor(g.inv * 16) % 2)) c.drawImage(playerSprite(0, Math.floor(this.t * 8) % 2, this.noahPal, 0), Math.round(g.px - 8), Math.round(g.py - 8));
    R(c, '#000', 0, 0, 256, 14); R(c, '#303050', 0, 13, 256, 1);
    text(c, 'LOGS ' + this.wood + '/' + g.tWood, 4, 4, '#c89050');
    text(c, 'PITCH ' + this.pitch + '/' + g.tPitch, 110, 4, '#a8a8a8');
    if (g.timed) { const k = Math.max(0, 1 - g.T / g.LEN); R(c, '#283828', 206, 5, 44, 5); R(c, k < .25 ? '#f83838' : '#5890d8', 206, 5, Math.round(44 * k), 5); }
    else text(c, 'FETCHING', 196, 4, '#f8d838');
    c.restore();
  }

  /* ---------- build: frame and seal the three decks ---------- */
  startBuild() {
    this.phase = 'build';
    this.decks = [{ logs: 0, sealed: false }, { logs: 0, sealed: false }, { logs: 0, sealed: false }];
    this.cur = 0; this.flood = 0; this.warpT = rnd(8, 14);
    startFade(() => { Aud.music('o2'); G.banner('BUILD THE ARK - THREE DECKS, FRAMED AND SEALED', 2.8); }, .7);
  }
  updateBuild(dt) {
    if (Input.consume('mup')) { this.cur = (this.cur + 2) % 3; Aud.sfx('select'); }
    if (Input.consume('mdown')) { this.cur = (this.cur + 1) % 3; Aud.sfx('select'); }
    if (Input.consume('a')) this.place();
    this.warpT -= dt;
    if (this.warpT <= 0) {
      this.warpT = rnd(8, 14);
      const cand = this.decks.filter(d => !d.sealed && d.logs > 0);
      if (cand.length) { pick(cand).logs--; this.shake = .25; Aud.sfx('warp'); }
    }
    if (this.decks.every(d => d.sealed)) this.startSummon();
  }
  place() {
    const d = this.decks[this.cur];
    if (d.sealed) return;
    if (d.logs < 4) {
      if (this.wood > 0) { this.wood--; d.logs++; Aud.sfx('clink'); if (d.logs === 4) G.banner('DECK ' + (this.cur + 1) + ' FRAMED - SEAL IT WITH PITCH!', 2); }
      else this.needGather('wood');
    } else if (this.pitch > 0) { this.pitch--; d.sealed = true; Aud.sfx('seal'); G.banner('DECK ' + (this.cur + 1) + ' SEALED!', 1.6); }
    else this.needGather('pitch');
  }
  needGather(type) { // an untimed top-up of just the shortfall; the flood keeps rising while Noah is gone
    let need;
    if (type === 'wood') need = Math.max(1, this.decks.reduce((s, d) => s + (d.sealed ? 0 : Math.max(0, 4 - d.logs)), 0) - this.wood);
    else need = Math.max(1, this.decks.filter(d => !d.sealed).length - this.pitch);
    G.banner(type === 'wood' ? 'OUT OF TIMBER - FIND MORE WHILE THE WATERS RISE!' : 'OUT OF PITCH - THE SEAL CANNOT WAIT!', 2.4);
    Aud.sfx('door');
    this.startGather(type === 'wood' ? this.wood + need : this.wood, type === 'pitch' ? this.pitch + need : this.pitch, false);
  }
  floodFail() {
    this.decks = this.decks.map(() => ({ logs: 0, sealed: false }));
    this.flood = 0; this.shake = .5; Aud.sfx('over');
    G.banner('THE FLOOD WAS TOO SWIFT - THE FRAME IS SWEPT AWAY!', 2.8);
  }
  drawBuild(c) {
    if (this.gA) return this.drawGather(c);
    c.save(); if (this.shake > 0) c.translate(Math.round(rnd(-2, 2)), Math.round(rnd(-2, 2)));
    for (let i = 0; i < 14; i++) R(c, '#606898', 0, 14 + i * 15, 256, 15);
    const wy = Math.round(224 - this.flood * 150);
    R(c, '#2858a8', 0, wy, 256, 224 - wy); for (let x = -8; x < 256; x += 8) R(c, '#5890d8', x + Math.floor(this.t * 20) % 8, wy, 4, 2);
    const hx = 60, hw = 136;
    for (let i = 0; i < 3; i++) {
      const d = this.decks[i], dy = 170 - i * 40;
      R(c, d.sealed ? '#5a3a1a' : '#3a281a', hx, dy, hw, 34);
      for (let j = 0; j < 4; j++) { const fx = hx + 6 + j * 32; R(c, j < d.logs ? '#a87038' : '#241810', fx, dy + 4, 26, 26); if (j < d.logs) R(c, '#c89050', fx, dy + 4, 26, 2); }
      if (d.sealed) { c.globalAlpha = .3; R(c, '#181818', hx, dy, hw, 34); c.globalAlpha = 1; }
      if (i === this.cur) R(c, '#f8d838', hx - 4, dy - 2, hw + 8, 2);
    }
    R(c, '#4a3218', hx - 8, 170, hw + 16, 10);
    R(c, '#000', 0, 0, 256, 14); R(c, '#303050', 0, 13, 256, 1);
    text(c, 'LOGS ' + this.wood, 4, 4, '#c89050'); text(c, 'PITCH ' + this.pitch, 86, 4, '#a8a8a8');
    text(c, 'FLOOD', 156, 4, '#f8e8a0'); R(c, '#283828', 194, 5, 56, 5); R(c, this.flood > .75 ? '#f83838' : '#5890d8', 194, 5, Math.round(56 * this.flood), 5);
    c.restore();
  }

  /* ---------- summon: match pairs aboard before the seven days end ---------- */
  startSummon() {
    startFade(() => {
      this.phase = 'summon'; this.buildBoard(); Aud.music('o2');
      setMode('play'); // back to play before the text, so closing it returns to the board (not to a finished fade)
      say(['"OF EVERY CLEAN BEAST THOU SHALT TAKE TO THEE BY SEVENS... OF BEASTS THAT ARE NOT CLEAN BY TWO." (GENESIS 7:2)',
        'MATCH THE PAIRS TO BRING THEM ABOARD BEFORE THE SEVEN DAYS ARE SPENT (GENESIS 7:4). A MISS COSTS TIME!']);
    }, .8);
  }
  buildBoard() {
    const list = [];
    ARK_SPECIES.forEach((s, i) => { for (let n = 0; n < s.pairs * 2; n++) list.push(i); });
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
    this.board = list.map(sp => ({ sp, state: 'hidden' }));
    this.cx = 0; this.cy = 0; this.flipped = []; this.checkT = 0; this.boarded = 0; this.sT = 0; this.SLEN = 64;
  }
  updateSummon(dt) {
    this.sT += dt;
    if (Input.consume('mleft')) { this.cx = (this.cx + 3) % 4; Aud.sfx('select'); }
    if (Input.consume('mright')) { this.cx = (this.cx + 1) % 4; Aud.sfx('select'); }
    if (Input.consume('mup')) { this.cy = (this.cy + 3) % 4; Aud.sfx('select'); }
    if (Input.consume('mdown')) { this.cy = (this.cy + 1) % 4; Aud.sfx('select'); }
    if (Input.consume('a')) this.flip();
    if (this.flipped.length === 2) { this.checkT -= dt; if (this.checkT <= 0) this.resolve(); }
    if (this.sT >= this.SLEN && this.boarded < 8) {
      const left = this.board.map((t, k) => t.state !== 'gone' ? k : null).filter(k => k !== null);
      const sps = left.map(k => this.board[k].sp);
      for (let i = sps.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [sps[i], sps[j]] = [sps[j], sps[i]]; }
      left.forEach((k, i) => { this.board[k].sp = sps[i]; this.board[k].state = 'hidden'; });
      this.flipped = []; this.sT = 0; this.shake = .4; Aud.sfx('boom');
      G.banner('THE RAIN HAS BEGUN - HURRY THEM ABOARD!', 2.6);
    }
    if (this.boarded >= 8) this.finishAll();
  }
  flip() {
    const idx = this.cy * 4 + this.cx, cell = this.board[idx];
    if (!cell || cell.state !== 'hidden' || this.flipped.length >= 2) return;
    cell.state = 'flipped'; this.flipped.push(idx); Aud.sfx('select');
    if (this.flipped.length === 2) this.checkT = .6;
  }
  resolve() {
    const [i, j] = this.flipped, a = this.board[i], b = this.board[j];
    if (a.sp === b.sp) {
      a.state = 'gone'; b.state = 'gone'; this.boarded++; Aud.sfx('dove');
      G.banner(ARK_SPECIES[a.sp].name + ' ABOARD! (' + this.boarded + '/8)', 1.4);
    } else {
      a.state = 'hidden'; b.state = 'hidden'; Aud.sfx('hurt');
      const hid = this.board.map((t, k) => t.state === 'hidden' ? k : null).filter(k => k !== null);
      if (hid.length >= 2) {
        const k1 = pick(hid), rest = hid.filter(k => k !== k1), k2 = rest.length ? pick(rest) : undefined;
        if (k2 !== undefined) { const tmp = this.board[k1].sp; this.board[k1].sp = this.board[k2].sp; this.board[k2].sp = tmp; }
      }
    }
    this.flipped = [];
  }
  finishAll() { startFade(() => { this.phase = 'scene'; this.scene = { t: 0, said: false }; }, .8); }
  drawSummon(c) {
    c.save(); if (this.shake > 0) c.translate(Math.round(rnd(-2, 2)), Math.round(rnd(-2, 2)));
    R(c, '#283048', 0, 14, 256, 210);
    const ox = 48, oy = 30, cs = 40;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const cell = this.board[y * 4 + x], px = ox + x * cs, py = oy + y * cs;
      if (cell.state === 'gone') { R(c, '#1a2030', px + 2, py + 2, cs - 4, cs - 4); }
      else {
        R(c, '#4a3a28', px + 2, py + 2, cs - 4, cs - 4);
        if (cell.state === 'flipped') { const sp = ARK_SPECIES[cell.sp]; c.drawImage(sprite(sp.shape, sp.pal, Math.floor(this.t * 6) % 2), px + cs / 2 - 8, py + cs / 2 - 8); }
        else { R(c, '#6a5438', px + 6, py + 6, cs - 12, cs - 12); textC(c, '?', px + cs / 2, py + cs / 2 - 4, '#a89060'); }
      }
      if (x === this.cx && y === this.cy) { c.strokeStyle = '#f8d838'; c.lineWidth = 2; c.strokeRect(px + 1, py + 1, cs - 2, cs - 2); }
    }
    textC(c, 'ABOARD', 232, 60, '#c8d8f8'); textC(c, this.boarded + '/8', 232, 72, '#f8e8a0');
    R(c, '#000', 0, 0, 256, 14); R(c, '#303050', 0, 13, 256, 1);
    text(c, 'BRING THEM ABOARD', 4, 4, '#c8d8f8');
    const days = 7, dk = Math.min(days, Math.floor(this.sT / (this.SLEN / days)));
    for (let i = 0; i < days; i++) R(c, i < dk ? '#5890d8' : '#283848', 174 + i * 8, 5, 6, 5);
    c.restore();
  }

  /* ---------- closing scene: the door shuts on its own (Genesis 7:16) ---------- */
  updateScene(dt) {
    const s = this.scene; s.t += dt;
    if (s.t > 1.2 && !s.said) {
      s.said = true;
      say(['NOAH WENT IN, AND HIS SONS, AND HIS WIFE, AND HIS SONS\' WIVES... AND EVERY BEAST AFTER HIS KIND, INTO THE ARK. (GENESIS 7:13-15)',
        '"AND THE {LORD SHUT HIM IN}." (GENESIS 7:16)'], () => { Aud.sfx('seal'); MINI.finish(); });
    }
  }
  drawScene(c) {
    c.save();
    for (let i = 0; i < 14; i++) R(c, '#404868', 0, i * 16, 256, 16);
    R(c, '#6a4a28', 40, 100, 176, 100); R(c, '#4a3218', 40, 92, 176, 10);
    R(c, this.scene.t > .8 ? '#4a3218' : '#241810', 112, 140, 32, 60);
    c.drawImage(playerSprite(0, 0, this.noahPal, 0), 96, 176);
    for (let i = 0; i < 6; i++) { const x = 60 + i * 14, y = 190 - (i % 2) * 6; disc(c, '#5890d8', x, y, 2); }
    c.restore();
  }

  /* ---------- top-level dispatch ---------- */
  update(dt) {
    this.t += dt; if (this.shake > 0) this.shake -= dt;
    if (this.phase === 'gather') return this.updateGather(dt);
    if (this.phase === 'build') {
      if (this.gA) this.updateGather(dt); else this.updateBuild(dt);
      this.flood += dt / this.FLOOD_LEN; if (this.flood >= 1) this.floodFail();
      return;
    }
    if (this.phase === 'summon') return this.updateSummon(dt);
    if (this.phase === 'scene') return this.updateScene(dt);
  }
  draw(c) {
    if (this.phase === 'gather') return this.drawGather(c);
    if (this.phase === 'build') return this.drawBuild(c);
    if (this.phase === 'summon') return this.drawSummon(c);
    if (this.phase === 'scene') return this.drawScene(c);
  }
}

/* ---- 3. Job's servants (Job 1:13-22), in the Tower of Babel's slot ----
   A side scroller in the style of Super Mario Bros. 3. Three servants, one after another, each run right
   to Job's house to tell him the news, chased by the disaster they escaped: the Sabean raiders, the fire of
   God from heaven, and the great wind from the wilderness. Run, jump (A, hold for higher), and stay ahead;
   hits and pits only cost time, but if the disaster catches up, that servant's run starts over.
   Each run is about 30 seconds. When all three have arrived, Job tears his mantle and falls to the ground. */
class JobRun {
  constructor() {
    this.t = 0; this.shake = 0; this.seg = 0; this.arrived = 0;
    this.SEGS = [
      { name: 'THE SABEANS', sky: ['#78b8f8', '#a8d8f8'], hill: '#c8a868', hill2: '#a88848', ground: OTH[2], chase: 60,
        news: '"THE OXEN WERE PLOWING... AND THE SABEANS FELL UPON THEM, AND TOOK THEM AWAY; YEA, THEY HAVE SLAIN THE SERVANTS... AND I ONLY AM ESCAPED ALONE TO TELL THEE." (JOB 1:14-15)', tunic: '#c8a050' },
      { name: 'FIRE FROM HEAVEN', sky: ['#601818', '#d86030'], hill: '#804030', hill2: '#5a2818', ground: OTH[2], chase: 64,
        news: '"THE FIRE OF GOD IS FALLEN FROM HEAVEN, AND HATH BURNED UP THE SHEEP, AND THE SERVANTS, AND CONSUMED THEM; AND I ONLY AM ESCAPED ALONE TO TELL THEE." (JOB 1:16)', tunic: '#6090c8' },
      { name: 'THE GREAT WIND', sky: ['#404858', '#8890a0'], hill: '#58606a', hill2: '#3a4048', ground: OTH[1], chase: 68,
        news: '"THERE CAME A GREAT WIND FROM THE WILDERNESS, AND SMOTE THE FOUR CORNERS OF THE HOUSE, AND IT FELL UPON THY CHILDREN, AND THEY ARE DEAD; AND I ONLY AM ESCAPED ALONE TO TELL THEE." (JOB 1:19)', tunic: '#a85050' },
    ];
    this.startSeg(0);
  }
  begin() {
    Aud.music('o3');
    say(['"THERE WAS A MAN IN THE LAND OF UZ, WHOSE NAME WAS {JOB}; AND THAT MAN WAS PERFECT AND UPRIGHT." (JOB 1:1)',
      'CARRY THE NEWS TO JOB. RUN RIGHT AND {JUMP WITH A} (HOLD IT TO JUMP HIGHER). STAY AHEAD OF THE DISASTER BEHIND YOU!']);
  }
  /* ---------- the course for one servant ---------- */
  startSeg(s) {
    this.seg = s; const S = this.SEGS[s];
    this.level = this.genLevel(s);
    this.p = { x: 40, y: 150, vx: 0, vy: 0, w: 10, h: 14, ground: false, coyote: 0, jumpBuf: 0, stun: 0, inv: 1, face: 1, safeX: 40 };
    this.cam = 0; this.cx = -90; this.haz = []; this.fx = []; this.hazT = 2; this.gustT = 3; this.gust = 0;
    this.state = 'run'; this.at = 0; this.caughtSaid = false; this.scene = null;
    if (s > 0) G.banner('WHILE HE WAS YET SPEAKING, THERE CAME ALSO ANOTHER... (JOB 1:' + (15 + s) + ')', 2.6);
  }
  genLevel(s) {
    const r = mulberry32(211 + s * 37), ri = (a, b) => a + Math.floor(r() * (b - a + 1)), W = 150, grid = [];
    for (let c = 0; c < W; c++) grid.push(new Array(14).fill(0));
    let g = 11, c = 0;
    const col = top => { for (let y = top; y < 14; y++) grid[c][y] = 1; c++; };
    while (c < 10) col(g);
    while (c < W - 14) {
      const f = r();
      // every obstacle is followed by at least four blocks of firm ground: room to land a full jump and run up to the next
      const land = () => { for (let i = 0; i < 4; i++) col(g); };
      if (f < .22) { const n = ri(3, 6); for (let i = 0; i < n; i++) col(g); }
      else if (f < .42) { c += ri(2, 3); land(); } // a pit
      else if (f < .56) { g = clamp(g + pick([-2, -1, 1, 2]), 8, 12); land(); } // a step
      else if (f < .7) { col(g); grid[c - 1][g - 1] = 2; if (r() < .5) grid[c - 1][g - 2] = 2; land(); } // a wall of blocks
      else if (f < .82) { for (let i = 0; i < 4; i++) { if (i === 1 || i === 2) grid[c][g - 2] = 2; c++; } land(); } // a wide pit with a ledge to hop on, two blocks up
      else if (s === 1) { col(g); grid[c - 1][g - 1] = 3; land(); } // burning ground
      else { land(); grid[c - 3][g - 4] = 2; grid[c - 2][g - 4] = 2; } // a floating ledge (just scenery to jump on)
    }
    g = 11; while (c < W) col(g); // the last stretch, to Job's house
    return { W, grid, house: (W - 6) * 16 };
  }
  solid(x, y) {
    const L = this.level, c = Math.floor(x / 16), r = Math.floor(y / 16);
    if (c < 0 || c >= L.W) return true; if (r < 0 || r > 13) return false;
    const v = L.grid[c][r]; return v === 1 || v === 2;
  }
  /* ---------- update ---------- */
  update(dt) {
    this.t += dt; if (this.shake > 0) this.shake -= dt;
    if (this.state === 'scene') return this.updateScene(dt);
    const p = this.p, S = this.SEGS[this.seg];
    for (let i = this.fx.length - 1; i >= 0; i--) { const f = this.fx[i]; f.life -= dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 200 * dt; if (f.life <= 0) this.fx.splice(i, 1); }
    if (this.state === 'arrive') { // the servant kneels before Job and gives the news
      this.at += dt; this.cx -= 80 * dt; p.vx = 0;
      if (this.at > 4.2 && !this.leaving) {
        this.leaving = true;
        startFade(() => { this.leaving = false; this.arrived++; if (this.seg < 2) this.startSeg(this.seg + 1); else { this.state = 'scene'; this.scene = { t: 0 }; this.cam = this.level.W * 16 - 256; } }, .6);
      }
      return;
    }
    if (this.state === 'caught') {
      this.at += dt;
      if (this.at > 1 && !this.caughtSaid) { this.caughtSaid = true; say([(this.seg === 0 ? 'THE RAIDERS' : this.seg === 1 ? 'THE FIRE' : 'THE WHIRLWIND') + ' OVERTOOK YOU. RUN AGAIN, AND STAY AHEAD!'], () => this.startSeg(this.seg)); }
      return;
    }
    // the servant
    if (p.stun > 0) p.stun -= dt; if (p.inv > 0) p.inv -= dt;
    const want = p.stun > 0 ? 0 : Input.dx * 96;
    p.vx += clamp(want - p.vx, -700 * dt, 700 * dt);
    if (this.gust > 0) { this.gust -= dt; p.vx -= 160 * dt; } // the wind pushes back
    if (Input.dx) p.face = Math.sign(Input.dx);
    if (Input.consume('a') || Input.consume('mup')) p.jumpBuf = .14; else p.jumpBuf -= dt;
    p.coyote = p.ground ? .09 : p.coyote - dt;
    if (p.jumpBuf > 0 && p.coyote > 0 && p.stun <= 0) { p.vy = -268; p.jumpBuf = 0; p.coyote = 0; Aud.sfx('select'); } // jumps clear three blocks
    if (p.vy < -110 && !Input.held.a && !Input.held.mup) p.vy = -110; // let go early for a short hop
    p.vy = Math.min(420, p.vy + 720 * dt);
    // move across, then up or down, against the blocks
    p.x += p.vx * dt;
    if (p.vx > 0 && (this.solid(p.x + p.w, p.y + 1) || this.solid(p.x + p.w, p.y + p.h - 1))) { p.x = Math.floor((p.x + p.w) / 16) * 16 - p.w - .01; p.vx = 0; }
    if (p.vx < 0 && (this.solid(p.x, p.y + 1) || this.solid(p.x, p.y + p.h - 1))) { p.x = Math.floor(p.x / 16) * 16 + 16.01; p.vx = 0; }
    if (p.x < this.cam + 2) { p.x = this.cam + 2; p.vx = Math.max(0, p.vx); }
    p.y += p.vy * dt; p.ground = false;
    if (p.vy >= 0 && (this.solid(p.x + 1, p.y + p.h) || this.solid(p.x + p.w - 1, p.y + p.h))) { p.y = Math.floor((p.y + p.h) / 16) * 16 - p.h; p.vy = 0; p.ground = true; }
    if (p.vy < 0 && (this.solid(p.x + 1, p.y) || this.solid(p.x + p.w - 1, p.y))) { p.y = Math.floor(p.y / 16) * 16 + 16; p.vy = 0; }
    if (p.ground && this.solid(p.x - 14, p.y + p.h + 2) && this.solid(p.x + p.w + 14, p.y + p.h + 2)) p.safeX = p.x; // firm ground on both sides: a safe place to come back to
    if (p.y > 230) { p.x = Math.max(p.safeX, this.cam + 2); this.cx = Math.min(this.cx, p.x - 70); p.y = 60; p.vy = 0; p.stun = .5; p.inv = 1; Aud.sfx('fall'); } // fell in a pit: back to firm ground, time lost
    const c0 = Math.floor((p.x + p.w / 2) / 16), r0 = Math.floor((p.y + p.h - 2) / 16);
    if (this.level.grid[c0] && this.level.grid[c0][r0] === 3) this.hurt(); // burning ground
    // the camera follows, and never goes back
    this.cam = clamp(Math.max(this.cam, p.x - 100), 0, this.level.W * 16 - 256);
    // the disaster behind: always just in view on the left edge, and faster than standing still
    this.cx = Math.max(this.cx + S.chase * dt, this.cam + 10);
    if (this.cx >= p.x - 4) { this.state = 'caught'; this.at = 0; this.shake = .5; Aud.sfx('over'); return; }
    this.hazards(dt);
    if (p.x >= this.level.house - 30) { this.state = 'arrive'; this.at = 0; this.p.x = this.level.house - 30; G.banner(S.news, 4); Aud.sfx('seal'); }
  }
  hurt() {
    const p = this.p; if (p.inv > 0) return;
    p.stun = .55; p.inv = 1.3; p.vx = -40; this.shake = .2; Aud.sfx('hurt');
    for (let i = 0; i < 8; i++) this.fx.push({ x: p.x + 5, y: p.y + 6, vx: rnd(-60, 60), vy: rnd(-90, -20), life: .5, col: pick(['#f83838', '#fff']) });
  }
  hazards(dt) {
    const p = this.p, s = this.seg;
    this.hazT -= dt;
    if (this.hazT <= 0) {
      if (s === 0) { this.hazT = rnd(1.8, 2.6); this.haz.push({ k: 'arrow', x: this.cam - 8, y: p.y + rnd(2, 10), warn: .7, t: 0 }); } // the raiders shoot from behind
      if (s === 1) { this.hazT = rnd(.9, 1.4); this.haz.push({ k: 'fire', x: p.x + rnd(30, 150), y: -10, warn: .8, t: 0 }); } // fire falls from heaven
      if (s === 2) { this.hazT = rnd(1.4, 2.2); this.haz.push({ k: 'plank', x: this.cam - 8, y: rnd(110, 175), warn: .6, t: 0, a: 0 }); } // debris on the wind
    }
    if (s === 2) { this.gustT -= dt; if (this.gustT <= 0) { this.gustT = rnd(3.5, 5); this.gust = 1.1; G.banner('A GUST OF WIND!', .9); } }
    for (const h of this.haz) {
      h.t += dt; if (h.t < h.warn) continue;
      if (h.k === 'arrow' || h.k === 'plank') { h.x += 190 * dt; h.a = (h.a || 0) + dt * 10; }
      else { // falling fire lands where its shadow is
        let gy = 13; for (let r = 0; r < 14; r++) if (this.solid(h.x, r * 16)) { gy = r; break; }
        h.y += 230 * dt; if (h.y >= gy * 16 - 4) { h.done = true; this.shake = .1; for (let i = 0; i < 8; i++) this.fx.push({ x: h.x, y: gy * 16 - 4, vx: rnd(-70, 70), vy: rnd(-120, -40), life: .5, col: pick(['#f83800', '#f8d838']) }); Aud.sfx('boom'); }
      }
      if (Math.abs(h.x - (p.x + p.w / 2)) < (h.k === 'fire' ? 9 : 8) && Math.abs(h.y - (p.y + p.h / 2)) < (h.k === 'fire' ? 11 : 9)) { this.hurt(); h.done = h.k !== 'plank'; }
    }
    this.haz = this.haz.filter(h => !h.done && h.x < this.cam + 300);
  }
  updateScene(dt) {
    const sc = this.scene; sc.t += dt;
    if (sc.t > 1.4 && !sc.rent) { sc.rent = true; Aud.sfx('hurt'); this.shake = .3; }
    if (sc.t > 2.4 && !sc.fell) { sc.fell = true; Aud.sfx('fall'); }
    if (sc.t > 4.6 && !sc.said) {
      sc.said = true;
      say(['"THEN JOB AROSE, AND {RENT HIS MANTLE}, AND SHAVED HIS HEAD, AND {FELL DOWN UPON THE GROUND}, AND WORSHIPPED." (JOB 1:20)',
        '"NAKED CAME I OUT OF MY MOTHER\'S WOMB, AND NAKED SHALL I RETURN THITHER: {THE LORD GAVE, AND THE LORD HATH TAKEN AWAY; BLESSED BE THE NAME OF THE LORD}." (JOB 1:21)',
        '"IN ALL THIS JOB SINNED NOT, NOR CHARGED GOD FOOLISHLY." (JOB 1:22)'], () => { Aud.sfx('seal'); MINI.finish(); });
    }
  }
  /* ---------- drawing ---------- */
  draw(c) {
    c.save(); if (this.shake > 0) c.translate(Math.round(rnd(-2, 2)), Math.round(rnd(-2, 2)));
    const S = this.SEGS[this.seg], cam = Math.round(this.cam);
    // sky and big rolling hills, in layers like Super Mario Bros. 3
    for (let i = 0; i < 14; i++) R(c, i < 7 ? S.sky[0] : S.sky[1], 0, i * 16, 256, 16);
    for (const [col, par, h, f] of [[S.hill2, .2, 70, .018], [S.hill, .45, 46, .03]]) {
      c.fillStyle = col; for (let x = 0; x < 256; x += 2) { const y = 176 - h - Math.sin((x + cam * par) * f) * 18 - Math.sin((x + cam * par) * f * 2.3) * 6; c.fillRect(x, Math.round(y), 2, 224 - y); }
    }
    if (this.seg === 1) for (let i = 0; i < 6; i++) { const x = (i * 53 - cam * .3 + 999) % 270 - 10; R(c, '#f8a038', Math.round(x), 30 + (i * 17) % 40, 2, 2); } // embers in the sky
    // the course
    const L = this.level, c0 = Math.floor(cam / 16);
    for (let cc = c0; cc < c0 + 18 && cc < L.W; cc++) for (let r = 0; r < 14; r++) {
      const v = L.grid[cc][r], x = cc * 16 - cam, y = r * 16; if (!v) continue;
      if (v === 1) { const top = r === 0 || !L.grid[cc][r - 1] || L.grid[cc][r - 1] === 3; c.drawImage(tileImg(S.ground, top ? T.PATH : T.FLOOR, 0), x, y); if (!top) { c.globalAlpha = .35; R(c, '#000', x, y, 16, 16); c.globalAlpha = 1; } else R(c, '#58a838', x, y, 16, 3); }
      else if (v === 2) c.drawImage(tileImg(OTH[2], T.BLOCK, 0), x, y);
      else if (v === 3) c.drawImage(tileImg(OTH[2], T.FIRE, Math.floor(this.t * 6) % 2), x, y);
    }
    // Job's house, with Job outside and the servants who have already come
    this.drawHouse(c, L.house - cam);
    // hazards
    for (const h of this.haz) {
      const x = Math.round(h.x - cam), y = Math.round(h.y);
      if (h.t < h.warn) { if (Math.floor(h.t * 10) % 2) { if (h.k === 'fire') { let gy = 13; for (let r = 0; r < 14; r++) if (this.solid(h.x, r * 16)) { gy = r; break; } c.globalAlpha = .5; R(c, '#000', x - 6, gy * 16 - 3, 12, 3); c.globalAlpha = 1; } else textC(c, '!', 8, y - 4, '#f83838'); } continue; }
      if (h.k === 'arrow') { R(c, '#c8a060', x - 8, y, 14, 1); R(c, '#e0e0f0', x + 5, y - 1, 3, 3); R(c, '#c83838', x - 9, y - 1, 2, 3); }
      else if (h.k === 'plank') { c.save(); c.translate(x, y); c.rotate(h.a); R(c, '#8a5a2a', -7, -2, 14, 4); R(c, '#c88040', -7, -2, 14, 1); c.restore(); }
      else { disc(c, '#f83800', x, y, 5); disc(c, '#f8a038', x, y, 3); R(c, '#fff8c0', x - 1, y - 1, 2, 2); R(c, '#f8a038', x - 1, y - 10, 2, 6); }
    }
    // the servant
    const p = this.p;
    if (this.state !== 'scene' && !(p.inv > 0 && Math.floor(p.inv * 16) % 2 && this.state === 'run')) {
      if (this.state === 'arrive') this.drawServant(c, p.x - cam - 3, p.y - 2, this.seg, 0, true);
      else this.drawServant(c, p.x - cam - 3, p.y - 2, this.seg, p.ground ? (Math.abs(p.vx) > 10 ? Math.floor(this.t * 10) % 2 : 0) : 1, false, p.face);
    }
    for (const f of this.fx) R(c, f.col, Math.round(f.x - cam), Math.round(f.y), 2, 2);
    // the disaster behind
    if (this.state !== 'scene') this.drawChaser(c, Math.round(this.cx - cam));
    // top bar
    R(c, '#000', 0, 0, 256, 14); R(c, '#303050', 0, 13, 256, 1);
    text(c, 'SERVANT ' + (this.seg + 1) + '/3', 4, 4, '#f8e8a0');
    const k = clamp(p.x / (L.house - 30), 0, 1); R(c, '#383028', 86, 5, 110, 5); R(c, '#f8c838', 86, 5, Math.round(110 * k), 5);
    if (p.x - this.cx < 90 && Math.floor(this.t * 6) % 2) text(c, 'DANGER!', 206, 4, '#f83838'); // the disaster is close
    if (this.state === 'scene') this.drawScene(c);
    c.restore();
  }
  drawServant(c, x, y, idx, fr, kneel, face) {
    const pal = { a: this.SEGS[idx].tunic, b: '#3a2418', c: '#d89868' }, img = playerSprite(kneel ? 3 : face < 0 ? 2 : 3, kneel ? 0 : fr, pal, 0);
    x = Math.round(x); y = Math.round(y);
    if (kneel) { c.drawImage(img, 0, 0, 16, 11, x, y + 5, 16, 11); return; } // knelt down: draw only the top of the sprite, lower
    c.drawImage(img, x, y);
  }
  drawJob(c, x, y, pose) {
    // Job: grey hair and beard, a purple mantle
    const pal = { a: '#7848a8', b: '#d8d8d8', c: '#e0a878' }, img = playerSprite(0, 0, pal, 0);
    x = Math.round(x); y = Math.round(y);
    if (pose === 'down') { // fallen on the ground, face down, sobbing
      const sob = Math.floor(this.t * 6) % 2;
      c.save(); c.translate(x + 8, y + 12 + sob); c.rotate(-Math.PI / 2); c.drawImage(img, -8, -8); c.restore();
      R(c, '#e8e8e8', x - 2, y + 8 + sob, 3, 4);
      for (let i = 0; i < 2; i++) { const ty = (this.t * 40 + i * 9) % 14; R(c, '#58b8f8', x - 6 - i * 3, Math.round(y + 6 + ty), 1, 2); }
      return;
    }
    c.drawImage(img, x, y);
    R(c, '#e8e8e8', x + 5, y + 7, 6, 4); R(c, '#e8e8e8', x + 6, y + 11, 4, 1); // beard
    if (pose === 'rent') { R(c, '#2a1840', x + 7, y + 9, 2, 6); R(c, '#e0a878', x + 7, y + 10, 1, 4); } // the torn mantle
  }
  drawHouse(c, hx) {
    if (hx > 300 || hx < -120) return;
    const gy = 176, x = Math.round(hx);
    R(c, '#806040', x - 4, gy - 52, 72, 6); R(c, '#a07850', x - 2, gy - 56, 68, 4); // a flat roof
    R(c, '#d8b888', x, gy - 46, 64, 46); R(c, '#b89868', x, gy - 46, 64, 2);
    R(c, '#5a3a20', x + 26, gy - 26, 12, 26); R(c, '#3a2410', x + 28, gy - 24, 8, 24); // door
    R(c, '#5a3a20', x + 8, gy - 36, 8, 8); R(c, '#5a3a20', x + 48, gy - 36, 8, 8); // windows
    // Job stands before his door, with the servants who have already come kneeling before him
    if (this.state !== 'scene') this.drawJob(c, x - 18, gy - 16, 'stand');
    const waiting = this.arrived;
    for (let i = 0; i < waiting; i++) this.drawServant(c, x - 40 - i * 14, gy - 16, i, 0, true);
  }
  drawChaser(c, x) {
    const s = this.seg, t = this.t;
    if (x < -80) return;
    if (s === 0) { // the Sabeans on camels, spears raised
      for (let i = 0; i < 3; i++) {
        const cx = x - 10 - i * 22, bob = Math.round(Math.sin(t * 10 + i) * 1.5), gy = 176;
        c.drawImage(sprite('beast', { a: '#c8a060', b: '#8a6a3a', c: '#f0d8a0' }, Math.floor(t * 8 + i) % 2), cx - 8, gy - 16 + bob);
        c.drawImage(sprite('human', { a: '#303030', b: '#181818', c: '#a87050' }, 0), cx - 8, gy - 28 + bob);
        R(c, '#a07040', cx + 6, gy - 40 + bob, 1, 16); R(c, '#e0e0f0', cx + 5, gy - 42 + bob, 3, 3);
      }
    } else if (s === 1) { // a wall of fire
      for (let y = 20; y < 192; y += 6) { const w = 14 + Math.sin(t * 9 + y * .3) * 6; R(c, '#f83800', x - 40, y, Math.round(40 + w), 6); R(c, '#f8a038', x - 30, y + 1, Math.round(26 + w * .6), 4); R(c, '#f8f038', x - 22, y + 2, Math.round(12 + w * .3), 2); }
    } else { // the whirlwind
      for (let i = 0; i < 18; i++) {
        const y = 176 - i * 9, w = 6 + i * 2.2, sw = Math.sin(t * 6 + i * .5) * (4 + i * .6);
        c.globalAlpha = .85; R(c, i % 2 ? '#6a7080' : '#9098a8', Math.round(x - w + sw - 16), y, Math.round(w * 2), 7); c.globalAlpha = 1;
        if (i % 4 === 0) R(c, '#5a3a20', Math.round(x - 16 + Math.cos(t * 8 + i) * w), y + 2, 3, 2); // debris swept up in it
      }
    }
  }
  drawScene(c) {
    // the last servant has spoken: Job tears his mantle and falls to the ground, the three servants kneeling
    const sc = this.scene, hx = this.level.house - this.cam, gy = 176;
    const pose = sc.t < 1.4 ? 'stand' : sc.t < 2.4 ? 'rent' : 'down';
    const jx = hx - 18 + (pose === 'stand' ? Math.round(Math.sin(sc.t * 30) * (sc.t > .6 ? 1 : 0)) : 0);
    this.drawJob(c, jx, gy - 16, pose);
    if (pose === 'rent' && Math.floor(sc.t * 10) % 2) for (let i = 0; i < 3; i++) R(c, '#7848a8', jx + 4 + i * 4, gy - 6 + i * 2, 2, 2);
  }
}

/* ---- hooks into the game (Claude page only) ---- */
(function () {
  const baseUpdate = update, baseRender = render;
  update = function (dt) {
    if (G.mini && G.mode === 'fade' && !G.fade) setMode('play'); // safety net: never get stuck in a fade that has ended
    if (!G.mini || G.mode !== 'play') return baseUpdate(dt);
    G.t += dt; Input.poll();
    if (Input.consume('mute')) Aud.setMuted(!Aud.muted);
    if (Input.consume('start')) { setMode('pause'); G.menu = 0; G.quitArm = false; return; }
    G.mini.update(dt);
    if (G.bannerQ) { G.bannerQ.t -= dt; if (G.bannerQ.t <= 0) G.bannerQ = null; }
  };
  render = function () {
    if (!G.mini || G.mode === 'title' || G.mode === 'ending') return baseRender();
    const c = ctx; c.imageSmoothingEnabled = false; c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    if (R3D.cv) R3D.cv.style.visibility = 'hidden';
    G.mini.draw(c);
    drawBanner(c);
    if (G.mode === 'dialog') drawDialog(c);
    if (G.mode === 'pause') drawPause(c);
    drawFade(c);
  };
  /* the circus tent: each dungeon with a mini-game has a tent on a screen next to the dungeon's screen in
     the same land, open whether or not the dungeon is beaten (some stories, like Noah's, come before the
     dungeon and some after), and walking into the tent's door plays that dungeon's mini-game */
  const OPEN = new Set([T.FLOOR, T.PATH, T.DECO, T.LAND]);
  // the tent's screen: next to the dungeon's screen in the same land, but never the land's first screen
  // (spring, sign, ladder), its gate screen or the dungeon screen itself
  const tentScr = {};
  MINI.tentScreen = function (d) {
    if (d in tentScr) return tentScr[d];
    const skip = new Set([WORLD.dungeon[d], WORLD.entry[d], WORLD.exit[d]]), land = i => WORLD.scr[i].k === d + 1 && !skip.has(i);
    const seen = new Set([WORLD.dungeon[d]]), q = [WORLD.dungeon[d]];
    while (q.length) { // nearest such screen by walking distance, adjacent ones first
      const c = q.shift();
      for (const n of Object.values(WORLD.scr[c].exits).sort((a, b) => a - b)) {
        if (seen.has(n) || WORLD.scr[n].k !== d + 1) continue;
        if (land(n)) return (tentScr[d] = n);
        seen.add(n); q.push(n);
      }
    }
    return (tentScr[d] = null);
  };
  function placeTent(room) {
    let d = -1; for (const k of Object.keys(MINI.games)) if (MINI.tentScreen(+k) === room.idx) d = +k;
    if (d < 0) return;
    const t = room.tiles, open = (x, y) => x >= 1 && x <= 14 && y >= 1 && y <= 10 && OPEN.has(t[y * 16 + x]);
    // only ground the hero can walk to from the screen's exits counts
    const walk = (x, y) => x >= 0 && x <= 15 && y >= 0 && y <= 11 && !SOLID.has(t[y * 16 + x]) && t[y * 16 + x] !== T.PIT && t[y * 16 + x] !== T.FIRE;
    const reach = new Uint8Array(192), q = [];
    for (let x = 0; x < 16; x++) q.push([x, 0], [x, 11]); for (let y = 0; y < 12; y++) q.push([0, y], [15, y]);
    while (q.length) { const [x, y] = q.pop(); if (!walk(x, y) || reach[y * 16 + x]) continue; reach[y * 16 + x] = 1; for (const [dx, dy] of DIRV) q.push([x + dx, y + dy]); }
    // two open tiles for the tent, with open ground in front of its door, as near the middle of the screen as possible
    let best = null, bd = 1e9;
    for (let y = 2; y <= 9; y++) for (let x = 1; x <= 13; x++) {
      if (!open(x, y) || !open(x + 1, y) || !open(x, y + 1) || !open(x + 1, y + 1) || !reach[(y + 1) * 16 + x]) continue;
      const dd = Math.hypot(x + 1 - 8, y - 5);
      if (dd < bd) { bd = dd; best = [x, y]; }
    }
    if (!best) return;
    const [tx, ty] = best;
    room.tent = { d, x: tx * 16, y: ty * 16, door: { x: tx * 16 + 16, y: (ty + 1) * 16 + 4 }, armed: false };
    if (!G.tentSeen) G.tentSeen = {};
    if (!G.tentSeen[d]) { G.tentSeen[d] = true; G.banner('A CIRCUS TENT!', 2.4); }
  }
  function drawTent(c, tn) {
    const x = tn.x, y = tn.y, fl = Math.floor(G.t * 4) % 2;
    c.globalAlpha = .3; R(c, '#000', x - 2, y + 14, 36, 3); c.globalAlpha = 1;
    for (let i = 0; i < 8; i++) R(c, i % 2 ? '#f8f8f8' : '#d83838', x + i * 4, y - 4, 4, 20); // striped walls
    for (let r = 0; r < 14; r++) { // the peaked roof, in stripes
      const w = 2 + Math.round(r * 2.3), rx = x + 16 - w / 2;
      for (let k = 0; k < w; k += 4) R(c, ((k + r) >> 2) % 2 ? '#f8f8f8' : '#d83838', Math.round(rx + k), y - 18 + r, Math.min(4, w - k), 1);
    }
    for (let i = 0; i < 8; i++) R(c, '#f8d838', x + i * 4 + 1, y - 4, 2, 2); // gold trim
    R(c, '#806040', x + 15, y - 27, 1, 10); R(c, fl ? '#f8d838' : '#f8a038', x + 16, y - 27, 5, 3); // flag
    R(c, '#301818', x + 12, y + 4, 8, 12); R(c, '#d83838', x + 11, y + 3, 2, 13); R(c, '#d83838', x + 19, y + 3, 2, 13); // open door flaps
    if (tn.armed && Math.floor(G.t * 3) % 2) R(c, '#fff8c0', x + 15, y + 8, 2, 2);
  }
  const basePopulate = populate, baseDrawEntities = drawEntities, baseUpdateRoom = updateRoom, base3D = R3D.entities;
  populate = function (room, fromSlide) { const r = basePopulate(room, fromSlide); if (room.kind === 'over') placeTent(room); return r; };
  drawEntities = function (c, room) { if (room.tent) drawTent(c, room.tent); return baseDrawEntities(c, room); };
  R3D.entities = function (room) { if (room.tent) { const tn = room.tent; this.card(tn.x + 16, tn.y + 16, 40, 48, 0, c => drawTent(c, tn), { shadow: 30 }); } return base3D.call(this, room); };
  updateRoom = function (dt) {
    baseUpdateRoom(dt);
    const rm = G.room, tn = rm && rm.tent, p = G.p;
    if (!tn || G.mode !== 'play') return;
    // the tent is solid: push the hero's feet out of its footprint (the ground under it stays flat for the 3D view)
    const fx0 = p.x - 5, fx1 = p.x + 5, fy0 = p.y, fy1 = p.y + 8, ox = Math.min(fx1 - tn.x, tn.x + 32 - fx0), oy = Math.min(fy1 - (tn.y - 2), tn.y + 16 - fy0);
    if (ox > 0 && oy > 0) { if (ox < oy) p.x += p.x < tn.x + 16 ? -ox : ox; else p.y += p.y < tn.y + 7 ? -oy : oy; }
    const d = dist(p.x, p.y, tn.door.x, tn.door.y);
    if (d > 24) tn.armed = true;
    else if (tn.armed && d < 9 && p.dir === 1) { // walking up into the door
      tn.armed = false; owRemember(rm); G.overPos = { idx: rm.idx, x: tn.door.x, y: tn.door.y + 12 };
      Aud.sfx('door'); startFade(() => MINI.start(tn.d));
    }
  };
  // leaving to the title (pause menu) ends any mini-game
  const baseToTitle = toTitle;
  toTitle = function () { if (G) G.mini = null; baseToTitle(); };
})();
