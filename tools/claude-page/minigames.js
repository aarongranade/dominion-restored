/* Claude-page-only mini-games (see ROADMAP.md: one per dungeon, played by walking back into a beaten
   dungeon). Not part of the real game or the app yet: tools/claude-page/build.py appends this file to
   the Claude page build only, before test-menu.js.
   While G.mini is set and the mode is 'play', the mini-game runs the update and draws the whole screen;
   dialogs, the pause menu and fades still use the game's own code. */
const MINI = {
  games: { 0: () => new EdenRun() }, // dungeon index -> mini-game
  has(d) { return !!this.games[d]; },
  start(d) { G.mini = this.games[d](); G.mini.d = d; G.bannerQ = null; G.dialog = null; setMode('play'); G.mini.begin(); },
  // back to the overworld, just outside the dungeon entrance
  finish() { startFade(() => { G.mini = null; const o = G.overPos || { idx: WORLD.dungeon[0], x: 128, y: 60 }; loadOver(o.idx, o.x, o.y); }, .8); },
};

/* ---- 1. Eden: fleeing the garden (Genesis 3:22-24) ----
   A vertical scroller. Adam and Eve run up the screen toward the garden's east gate while the angel
   with the flaming sword follows behind. Thorns, trees, serpents, lions and boars are in the way; each
   hit lets the angel close in. Three hits and the run restarts from the last checkpoint (every 30 s).
   After two minutes the gate comes into view, and a cutscene shows the angel taking his place in it. */
class EdenRun {
  constructor() {
    this.LEN = 120; this.th = OTH[0]; this.t = 0; this.shake = 0;
    this.adam = { a: '#f0b088', b: '#6a3a18', c: '#f0b088' }; // skin, hair, skin (the tunic colour becomes skin: fig leaves are drawn on top)
    this.eve = { a: '#e8a070', b: '#a04818', c: '#e8a070' };
    this.reset(0);
  }
  reset(T) {
    Object.assign(this, { T, checkpoint: T, objs: [], fx: [], leaving: false, px: 128, py: 164, gap: 3, inv: 1.2, lastHit: T, spawnT: 1.2, state: 'run', gate: null, scene: null, ax: 128, ay: 260, ct: 0 });
    this.dist = T * 70;
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
    // everything else hurts
    for (const o of this.objs) {
      if (o.type === 'tree' || (o.type === 'boar' && o.st === 0)) continue;
      if (Math.abs(o.x - this.px) < 13 + o.hw && Math.abs(o.y - (this.py + 2)) < 5 + o.hh) this.hit();
    }
    if (this.state !== 'run') return;
    // what comes next, getting busier as the run goes on
    this.spawnT -= dt;
    if (this.spawnT <= 0 && this.T < this.LEN - 3) { this.spawnT = Math.max(.5, 1.3 - k * .7); this.spawn(); }
    if (this.T >= this.checkpoint + 30 && this.T < this.LEN) { this.checkpoint += 30; G.banner('CHECKPOINT: ' + Math.round(this.checkpoint / this.LEN * 100) + '% OF THE WAY', 1.6); Aud.sfx('key'); }
    if (this.gap < 3 && this.T - this.lastHit > 20) { this.gap++; this.lastHit = this.T; Aud.sfx('heart'); } // twenty clean seconds win back a heart
    if (this.T >= this.LEN) { this.state = 'gate'; this.gate = { y: -40 }; G.banner('THE EAST GATE OF EDEN!', 2.4); Aud.sfx('seal'); }
  }
  spawn() {
    const T = this.T, add = o => this.objs.push(Object.assign({ t: 0, st: 0, hw: 6, hh: 5 }, o));
    const kinds = [['thorns', 3], ['thorn', 2], ['snake', 2]].concat(T > 10 ? [['trees', 2]] : [], T > 25 ? [['lion', 1.6]] : [], T > 45 ? [['boar', 1.6]] : []);
    let r = Math.random() * kinds.reduce((a, q) => a + q[1], 0), kind = kinds[0][0];
    for (const [n, w] of kinds) { if ((r -= w) <= 0) { kind = n; break; } }
    if (kind === 'thorns') { // a hedge of thorns and thistles (Genesis 3:18) with a gap to slip through
      const gapAt = rint(1, 10), len = rint(4, 7);
      for (let i = 0; i < 13; i++) if ((i < gapAt || i > gapAt + 2) && Math.abs(i - (gapAt + 1)) <= len) add({ type: 'thorn', x: 32 + i * 16, y: -12 });
    } else if (kind === 'thorn') add({ type: 'thorn', x: rnd(32, 224), y: -12 });
    else if (kind === 'trees') { const n = rint(2, 3); for (let i = 0; i < n; i++) add({ type: 'tree', x: 40 + rint(0, 11) * 16, y: -14 - i * 22 }); }
    else if (kind === 'snake') { const left = Math.random() < .5; add({ type: 'snake', x: left ? -12 : 268, y: rnd(10, 60), vx: (left ? 1 : -1) * rnd(40, 60 + T * .4), hw: 7, hh: 4 }); }
    else if (kind === 'lion') { const left = Math.random() < .5; add({ type: 'lion', x: left ? 26 : 230, y: rnd(40, 100), left }); }
    else if (kind === 'boar') add({ type: 'boar', x: clamp(this.px + rnd(-20, 20), 32, 224), y: 26 });
  }
  hit() {
    if (this.inv > 0 || this.state !== 'run' && this.state !== 'gate') return;
    this.gap--; this.inv = 1.4; this.lastHit = this.T; this.py = Math.min(198, this.py + 14); this.shake = .25; Aud.sfx('hurt');
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
    for (let i = 1; i < 4; i++) R(c, '#f8d838', 64 + Math.round(132 * i / 4), 4, 1, 7);
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

/* ---- hooks into the game (Claude page only) ---- */
(function () {
  const baseUpdate = update, baseRender = render, baseEntrance = GM.onEntrance;
  update = function (dt) {
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
  // walking back into a beaten dungeon starts its mini-game
  GM.onEntrance = function (tx, ty) {
    if (G.mode === 'play' && G.room && G.room.kind === 'over') {
      const d = G.room.info.entrance.d;
      if (G.cleared[d] && MINI.has(d)) {
        owRemember(G.room); G.overPos = { idx: G.room.idx, x: tx * 16 + 8, y: (ty + 1) * 16 + 10 };
        Aud.sfx('door'); startFade(() => MINI.start(d)); return;
      }
    }
    return baseEntrance.call(this, tx, ty);
  };
  G.onEntrance = GM.onEntrance;
  // leaving to the title (pause menu) ends any mini-game
  const baseToTitle = toTitle;
  toTitle = function () { if (G) G.mini = null; baseToTitle(); };
})();
