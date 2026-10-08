'use strict';
/* ===== Dominion Restored :: bosses ===== */

const ARENA = { x0: 26, x1: 230, y0: 26, y1: 166 };
function fan(x, y, tx, ty, n, spread, spd, kind, dmg, extra) {
  for (let i = 0; i < n; i++) shootAt(x, y, tx, ty, spd, kind, dmg, n > 1 ? (i - (n - 1) / 2) * spread : 0, extra);
}
function ring(x, y, n, spd, kind, dmg, off, extra) {
  for (let i = 0; i < n; i++) shootAng(x, y, (off || 0) + i / n * 6.283, spd, kind, dmg, extra);
}
function ppos() { return [G.p.x, G.p.y + 3]; }

class Boss {
  constructor(id, name, hp) { this.id = id; this.name = name; this.hp = hp; this.max = hp; this.t = 0; this.dead = false; this.dying = 0; this.flash = 0; this.touch = 2; this.x = 128; this.y = 60; this.hint = null; }
  get ratio() { return Math.max(0, this.hp) / this.max; }
  rawParts() { return []; }
  parts() { return this.dying > 0 || this.dead ? [] : this.rawParts(); }
  hit(part, dmg, src) {
    if (part.vuln === false) { Aud.sfx('clink'); fxBurst(G.p.x, G.p.y, '#fff', 2, 30, .2, 1); return 'block'; }
    this.damage(dmg * (part.mult ? part.mult(src) : 1), part, src); return 'dmg';
  }
  damage(n, part, src) {
    if (n <= 0) { Aud.sfx('clink'); return; }
    this.hp -= n; this.flash = .12; Aud.sfx('hit'); fxBurst(part ? part.x : this.x, part ? part.y : this.y, ['#fff', '#f8d838'], 4, 60, .3, 2);
    if (this.hp <= 0 && !this.dying) this.die();
  }
  die() {
    this.dying = 1.6; G.room.projs.length = 0; G.room.hazards.length = 0; Aud.sfx('bossroar'); G.shake = .8;
    for (const e of G.room.enemies.slice()) { e.hp = 0; fxBurst(e.x, e.y, '#fff', 8, 60, .5, 2); } G.room.enemies.length = 0;
    G.room.dark = false; G.room.wind = null;
  }
  update(dt) {
    this.t += dt; if (this.flash > 0) this.flash -= dt;
    if (this.dying > 0) {
      this.dying -= dt;
      if (Math.random() < .5) { fxBurst(this.x + rnd(-24, 24), this.y + rnd(-24, 24), ['#f8d838', '#f83838', '#fff'], 8, 90, .6, 3); if (Math.random() < .3) Aud.sfx('kill'); }
      if (this.dying <= 0) { this.dead = true; G.onBossDead(this); }
      return;
    }
    this.ai(dt);
  }
  ai() { }
  draw() { }
  drawFlash(c) { if (this.flash > 0) { c.globalAlpha = .55; for (const p of this.rawParts()) R(c, '#fff', Math.round(p.x - p.hw), Math.round(p.y - p.hh), p.hw * 2, p.hh * 2); c.globalAlpha = 1; } }
  setup() { }
}

/* ---- 1. the serpent of Eden ---- */
class Serpent extends Boss {
  constructor() {
    super('serpent', 'THE SERPENT', 22); this.x = 128; this.y = 52; this.ang = Math.PI / 2; this.trail = []; this.state = 'slither'; this.st = 0; this.tx = 128; this.ty = 100; this.n = 15;
    for (let i = 0; i < 70; i++) this.trail.push([this.x, this.y - i * 2]);
  }
  rawParts() {
    const out = [{ x: this.x, y: this.y, hw: 7, hh: 7, vuln: true, id: 'head' }];
    for (let i = 1; i < this.n; i++) { const s = this.seg(i); out.push({ x: s[0], y: s[1], hw: 5, hh: 5, vuln: false, id: 's' + i }); }
    return out;
  }
  seg(i) { const k = Math.min(this.trail.length - 1, i * 4); return this.trail[k]; }
  ai(dt) {
    const rage = 1 - this.ratio, p = ppos();
    // half speed and no lunges until its life drops to 10%, then full speed with lunges
    const frenzy = this.ratio <= 0.1;
    this.st -= dt;
    let spd = (52 + rage * 38) * (frenzy ? 1 : 0.5), turn = 2.3;
    if (this.state === 'slither') {
      if (dist(this.x, this.y, this.tx, this.ty) < 14 || this.st < -6) { this.tx = rnd(ARENA.x0 + 10, ARENA.x1 - 10); this.ty = rnd(ARENA.y0 + 10, ARENA.y1 - 10); this.st = 0; }
      if (this.t % 4.4 < dt) { this.state = frenzy && Math.random() < .5 ? 'lunge' : 'spit'; this.st = 0; this.sub = 0; }
    } else if (this.state === 'spit') {
      spd = 0; this.sub += dt; this.hint = null;
      const n = rage > .5 ? 5 : 3;
      if (this.sub > .6 && !this.f1) { this.f1 = 1; fan(this.x, this.y, p[0], p[1], n, .28, 100, 'venom', 1); Aud.sfx('spit'); }
      if (this.sub > 1.1 && !this.f2 && rage > .3) { this.f2 = 1; fan(this.x, this.y, p[0], p[1], n, .22, 120, 'venom', 1); Aud.sfx('spit'); }
      if (this.sub > 1.6) { this.state = 'slither'; this.f1 = this.f2 = 0; }
      const a = Math.atan2(p[1] - this.y, p[0] - this.x); this.ang = a;
    } else if (this.state === 'lunge') {
      this.sub += dt;
      if (this.sub < .55) { spd = 0; this.ang = Math.atan2(p[1] - this.y, p[0] - this.x); this.lunging = 0; }
      else if (this.sub < 1.25) { spd = 200; turn = 0.4; }
      else { this.state = 'slither'; }
    }
    if (this.state === 'slither' || this.state === 'lunge') {
      const want = Math.atan2(this.ty - this.y, this.tx - this.x);
      if (this.state === 'slither') {
        let da = want - this.ang; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283;
        this.ang += clamp(da, -turn * dt, turn * dt) + Math.sin(this.t * 3) * .02;
      }
    }
    const nx = this.x + Math.cos(this.ang) * spd * dt, ny = this.y + Math.sin(this.ang) * spd * dt;
    this.x = clamp(nx, ARENA.x0, ARENA.x1); this.y = clamp(ny, ARENA.y0, ARENA.y1);
    if (this.x !== nx || this.y !== ny) { this.ang += Math.PI * .6; this.tx = 128; this.ty = 96; }
    const last = this.trail[0];
    if (dist(last[0], last[1], this.x, this.y) >= 2) this.trail.unshift([this.x, this.y]);
    if (this.trail.length > 90) this.trail.length = 90;
  }
  draw(c) {
    for (let i = this.n - 1; i >= 1; i--) {
      const s = this.seg(i), r = 6 - Math.floor(i / 5), x = Math.round(s[0]), y = Math.round(s[1]);
      disc(c, '#1f5a1f', x, y, r + 1); disc(c, i % 2 ? '#48b848' : '#7ad858', x, y, r); if (i % 2) R(c, '#f8e838', x - 1, y - 1, 2, 2);
    }
    const x = Math.round(this.x), y = Math.round(this.y), f = [Math.cos(this.ang), Math.sin(this.ang)], pr = [-f[1], f[0]];
    disc(c, '#1f5a1f', x, y, 8); disc(c, '#58c848', x, y, 7); disc(c, '#7ad858', x - 1, y - 1, 4);
    for (const s of [-1, 1]) { const ex = Math.round(x + f[0] * 3 + pr[0] * 4 * s), ey = Math.round(y + f[1] * 3 + pr[1] * 4 * s); R(c, '#f83838', ex - 1, ey - 1, 3, 3); R(c, '#000', ex, ey, 1, 1); }
    if (Math.floor(this.t * 6) % 2 || this.state === 'spit') { const tx = Math.round(x + f[0] * 9), ty = Math.round(y + f[1] * 9); R(c, '#f83838', tx, ty, 1, 1); R(c, '#f83838', Math.round(x + f[0] * 11 + pr[0] * 2), Math.round(y + f[1] * 11 + pr[1] * 2), 1, 1); R(c, '#f83838', Math.round(x + f[0] * 11 - pr[0] * 2), Math.round(y + f[1] * 11 - pr[1] * 2), 1, 1); }
    if (this.state === 'lunge' && this.sub < .55 && Math.floor(this.t * 20) % 2) { disc(c, 'rgba(255,255,255,.5)', x, y, 8); }
    this.drawFlash(c);
  }
}

/* ---- 2. leviathan ---- */
class Leviathan extends Boss {
  constructor() { super('leviathan', 'LEVIATHAN', 28); this.state = 'dive'; this.st = 0; this.hx = 128; this.hy = 100; this.waveDone = false; }
  setup(room) { for (let x = 1; x < 15; x++) for (let y = 1; y <= 2; y++) room.tiles[y * 16 + x] = T.WATER; }
  headPos() { const k = this.state === 'up' ? 1 : this.state === 'rise' ? Math.min(1, this.st / .5) : this.state === 'sink' ? Math.max(0, 1 - this.st / .5) : 0; return [this.hx + Math.sin(this.t * 2) * 5 * k, this.hy - 34 * k]; }
  rawParts() {
    if (this.state !== 'up' && this.state !== 'rise' && this.state !== 'sink') return [];
    const h = this.headPos(), out = [{ x: h[0], y: h[1], hw: 10, hh: 9, vuln: this.state === 'up', id: 'head' }];
    for (let i = 1; i < 4; i++) out.push({ x: this.hx + (h[0] - this.hx) * (1 - i / 4), y: this.hy + (h[1] - this.hy) * (1 - i / 4) + 6, hw: 7, hh: 6, vuln: false, id: 'n' + i });
    return out;
  }
  ai(dt) {
    const p = ppos(), rage = 1 - this.ratio; this.st += dt;
    if (this.state === 'dive') {
      const a = Math.atan2(p[1] - this.hy, p[0] - this.hx), sp = 55 + rage * 40; this.hx += Math.cos(a) * sp * dt; this.hy += Math.sin(a) * sp * dt;
      this.hx = clamp(this.hx, 40, 216); this.hy = clamp(this.hy, 80, 160);
      if (!this.waveDone && rage > .3 && this.st > .3) { this.waveDone = true; const gap = rint(1, 13); for (let i = 1; i < 15; i++) if (Math.abs(i - gap) > 1) shootAng(i * 16 + 8, 36, Math.PI / 2, 70 + rage * 30, 'water', 1, { life: 3 }); Aud.sfx('boom'); }
      if (this.st > 2.2 - rage * .7) { this.state = 'rise'; this.st = 0; this.waveDone = false; Aud.sfx('boom'); }
    } else if (this.state === 'rise') {
      if (this.st > .5) { this.state = 'up'; this.st = 0; this.shots = 0; Aud.sfx('bossroar'); G.shake = .3; }
    } else if (this.state === 'up') {
      const h = this.headPos();
      if (this.st > .5 + this.shots * .9 && this.shots < 3) { this.shots++; ring(h[0], h[1], 10 + (rage > .5 ? 4 : 0), 70, 'water', 1, this.shots * .3); if (this.shots === 2) fan(h[0], h[1], p[0], p[1], 3, .3, 95, 'water', 1); Aud.sfx('spit'); }
      if (this.st > 3.4) { this.state = 'sink'; this.st = 0; }
    } else if (this.state === 'sink') {
      if (this.st > .5) { this.state = 'dive'; this.st = 0; }
    }
    if (this.state === 'dive' && Math.random() < .3) fxBurst(this.hx + rnd(-8, 8), this.hy + rnd(-4, 4), ['#58a8f8', '#fff'], 1, 20, .4, 1);
  }
  draw(c) {
    const x = Math.round(this.hx), y = Math.round(this.hy);
    if (this.state === 'dive' || this.state === 'rise') { // ripples
      const k = this.t * 3; c.fillStyle = 'rgba(255,255,255,.7)';
      for (let i = 0; i < 2; i++) { const r = ((k + i * .5) % 1) * 14 + 3; for (let a = 0; a < 16; a++) c.fillRect(Math.round(x + Math.cos(a / 16 * 6.283) * r), Math.round(y + Math.sin(a / 16 * 6.283) * r * .5), 1, 1); }
      if (this.state === 'dive') { c.fillStyle = 'rgba(20,60,140,.55)'; c.fillRect(x - 8, y - 2, 16, 5); }
    }
    if (this.state === 'dive') { this.drawFlash(c); return; }
    const h = this.headPos();
    for (let i = 4; i >= 1; i--) { const sx = Math.round(this.hx + (h[0] - this.hx) * (1 - i / 4)), sy = Math.round(this.hy + (h[1] - this.hy) * (1 - i / 4)) + 6; disc(c, '#103870', sx, sy, 8); disc(c, i % 2 ? '#2870c8' : '#3888e0', sx, sy, 7); }
    const hx = Math.round(h[0]), hy = Math.round(h[1]);
    disc(c, '#103870', hx, hy, 11); disc(c, '#3070d0', hx, hy, 10); disc(c, '#58a8f8', hx - 2, hy - 2, 5);
    R(c, '#f8d838', hx - 6, hy - 3, 4, 3); R(c, '#f8d838', hx + 3, hy - 3, 4, 3); R(c, '#000', hx - 5, hy - 2, 2, 2); R(c, '#000', hx + 4, hy - 2, 2, 2);
    R(c, '#fcfcfc', hx - 5, hy + 4, 2, 3); R(c, '#fcfcfc', hx + 4, hy + 4, 2, 3); R(c, '#601018', hx - 4, hy + 3, 9, 2);
    R(c, '#103870', hx - 8, hy - 11, 3, 4); R(c, '#103870', hx + 6, hy - 11, 3, 4);
    if (this.state !== 'up') { c.globalAlpha = .35; R(c, '#fff', x - 10, y - 2, 20, 4); c.globalAlpha = 1; }
    this.drawFlash(c);
  }
}

/* ---- 3. nimrod ---- */
class Nimrod extends Boss {
  constructor() { super('nimrod', 'NIMROD THE HUNTER', 28); this.x = 128; this.y = 54; this.state = 'strafe'; this.st = 0; this.n = 0; this.dx = 1; }
  rawParts() { return [{ x: this.x, y: this.y, hw: 12, hh: 14, vuln: true, id: 'b' }]; }
  ai(dt) {
    const p = ppos(), rage = 1 - this.ratio; this.st += dt;
    if (this.state === 'strafe') {
      const tx = clamp(p[0], 50, 206); this.x += clamp(tx - this.x, -1, 1) * (36 + rage * 24) * dt; this.y += (60 - this.y) * dt;
      if (this.st > 2.2) { const r = Math.random(); this.state = r < .4 ? 'volley' : r < .75 ? 'bricks' : (rage > .4 ? 'charge' : 'volley'); this.st = 0; this.n = 0; }
    } else if (this.state === 'volley') {
      if (this.st > .5 + this.n * .45 && this.n < 3) { this.n++; fan(this.x, this.y + 8, p[0], p[1], this.n === 2 ? 5 : 3, .22, 120, 'arrow', 1); Aud.sfx('arrow'); }
      if (this.st > 2.2) { this.state = 'strafe'; this.st = 0; }
    } else if (this.state === 'bricks') {
      if (this.st < .1 && !this.n) { this.n = 1; Aud.sfx('magic'); for (let i = 0; i < 6 + (rage > .5 ? 3 : 0); i++) { const bx = clamp(p[0] + rnd(-60, 60), 30, 226), by = clamp(p[1] + rnd(-40, 40), 40, 164); addHazard(bx, by, .9 + i * .22, 13, 2, 'brick', { fall: 100 }); } addHazard(p[0], p[1], 1.0, 13, 2, 'brick', { fall: 100 }); }
      if (this.st > 2.8) { this.state = 'strafe'; this.st = 0; }
    } else if (this.state === 'charge') {
      if (this.st < .7) { this.cx = p[0]; this.cy = p[1]; }
      else if (this.st < 1.4) { const a = Math.atan2(this.cy - this.y, this.cx - this.x); this.x += Math.cos(a) * 150 * dt; this.y += Math.sin(a) * 150 * dt; }
      else if (this.st > 2.2) { this.state = 'strafe'; this.st = 0; }
      if (this.st >= 1.4 && this.st < 1.45) { ring(this.x, this.y, 8, 70, 'brick', 1); G.shake = .3; Aud.sfx('boom'); }
    }
    this.x = clamp(this.x, ARENA.x0 + 14, ARENA.x1 - 14); this.y = clamp(this.y, ARENA.y0 + 16, ARENA.y1 - 16);
  }
  draw(c) {
    const x = Math.round(this.x), y = Math.round(this.y), pal = { a: '#b05838', b: '#4a2810', c: '#e8a878' };
    c.globalAlpha = .35; R(c, '#000', x - 12, y + 14, 24, 4); c.globalAlpha = 1;
    let img = sprite('human', pal, Math.floor(this.t * 3) % 2); if (this.flash > 0) img = flashed(img);
    c.save(); c.translate(x, y); c.scale(2, 2); c.drawImage(img, -8, -8); c.restore();
    R(c, '#f8c838', x - 8, y - 18, 16, 3); R(c, '#f8c838', x - 8, y - 21, 3, 3); R(c, '#f8c838', x + 5, y - 21, 3, 3); R(c, '#f8c838', x - 1, y - 22, 3, 4);
    const f = this.state === 'volley' ? Math.atan2(G.p.y - this.y, G.p.x - this.x) : 0; // bow
    R(c, '#8a5a2a', x + 14, y - 8, 2, 18); R(c, '#c0a060', x + 16, y - 6, 1, 14);
    if (this.state === 'charge' && this.st < .7 && Math.floor(this.t * 20) % 2) { R(c, '#fff', x - 12, y - 14, 24, 28); }
    if (this.state === 'bricks' && this.st < 1) { R(c, '#c05838', x - 5, y - 30, 10, 6); }
    this.drawFlash(c);
  }
}

/* ---- 4. pharaoh ---- */
class Pharaoh extends Boss {
  constructor() { super('pharaoh', 'PHARAOH', 32); this.x = 128; this.y = 50; this.cycle = 0; this.st = 0; this.state = 'idle'; this.dir = 1; this.n = 0; }
  rawParts() { return [{ x: this.x, y: this.y, hw: 12, hh: 14, vuln: true, id: 'b' }]; }
  ai(dt) {
    const p = ppos(), rage = 1 - this.ratio; this.st += dt;
    this.x += this.dir * (24 + rage * 16) * dt; if (this.x > 190) this.dir = -1; if (this.x < 66) this.dir = 1;
    if (this.state === 'idle') {
      if (this.st > 1.6) {
        this.st = 0; this.n = 0; const plague = ['frogs', 'locusts', 'darkness', 'staves'][this.cycle++ % 4]; this.state = plague;
        G.banner('PLAGUE OF ' + ({ frogs: 'FROGS', locusts: 'LOCUSTS', darkness: 'DARKNESS', staves: 'SERPENTS' })[plague]); Aud.sfx('magic');
      }
    } else if (this.state === 'frogs') {
      if (!this.n) { this.n = 1; for (let i = 0; i < 7; i++) addHazard(clamp(p[0] + rnd(-70, 70), 30, 226), clamp(p[1] + rnd(-50, 50), 40, 164), .9 + i * .3, 12, 1, 'frog', { fall: 110 }); }
      if (this.st > 3.6) { this.state = 'idle'; this.st = 0; }
    } else if (this.state === 'locusts') {
      if (this.n < 5 && this.st > this.n * .25) { this.n++; spawnEnemy('locust', rnd(40, 216), 36, { summoned: 1 }); }
      if (this.st > 4.5) { this.state = 'idle'; this.st = 0; }
    } else if (this.state === 'darkness') {
      G.room.dark = true; G.room.darkR = 34;
      if (this.st > .6 + this.n * 1.1 && this.n < 5) { this.n++; fan(this.x, this.y + 8, p[0], p[1], 3 + (rage > .5 ? 2 : 0), .3, 85, 'venom', 1); Aud.sfx('spit'); }
      if (this.st > 6.5) { G.room.dark = false; this.state = 'idle'; this.st = 0; }
    } else if (this.state === 'staves') {
      if (this.n < 3 && this.st > .4 + this.n * .6) { this.n++; spawnEnemy('viper', this.x + (this.n - 2) * 20, this.y + 24, { summoned: 1 }); fxBurst(this.x, this.y + 24, '#58e038', 6, 40, .4, 2); }
      if (this.st > 3.4) { this.state = 'idle'; this.st = 0; }
    }
  }
  draw(c) {
    const x = Math.round(this.x), y = Math.round(this.y), pal = { a: '#f8d838', b: '#2060c0', c: '#e8a878' };
    c.globalAlpha = .35; R(c, '#000', x - 12, y + 14, 24, 4); c.globalAlpha = 1;
    let img = sprite('human', pal, Math.floor(this.t * 3) % 2); if (this.flash > 0) img = flashed(img);
    c.save(); c.translate(x, y); c.scale(2, 2); c.drawImage(img, -8, -8); c.restore();
    R(c, '#2060c0', x - 10, y - 16, 20, 4); R(c, '#f8d838', x - 10, y - 14, 20, 1); R(c, '#2060c0', x - 11, y - 12, 3, 12); R(c, '#2060c0', x + 8, y - 12, 3, 12);
    R(c, '#c83838', x - 1, y - 22, 3, 6); R(c, '#58c838', x - 1, y - 26, 3, 4); // uraeus
    R(c, '#a07040', x + 14, y - 14, 2, 26); disc(c, '#f8d838', x + 15, y - 15, 3);
    this.drawFlash(c);
  }
}

/* ---- 5. colossus of jericho ---- */
class Colossus extends Boss {
  constructor() { super('colossus', 'COLOSSUS OF JERICHO', 26); this.x = 128; this.y = 62; this.cracked = 0; this.st = 0; this.n = 0; this.state = 'walk'; this.armorT = 0; this.hinted = false; }
  rawParts() { return [{ x: this.x, y: this.y, hw: 20, hh: 22, vuln: this.cracked > 0, id: 'b' }]; }
  hit(part, dmg, src) {
    if (this.cracked <= 0) { Aud.sfx('clink'); fxBurst(G.p.x, G.p.y, '#fff', 3, 30, .2, 1); if (!this.hinted) { this.hinted = true; G.banner('HIS STONE SKIN IS TOO HARD... TRY THE SHOFAR!'); } return 'block'; }
    this.damage(dmg, part, src); return 'dmg';
  }
  onShofar(p) {
    if (dist(p.x, p.y, this.x, this.y) < 110 && this.cracked <= 0) {
      this.cracked = 6.5; Aud.sfx('boom'); G.shake = .6; fxBurst(this.x, this.y, ['#a89878', '#d0c0a0', '#706048'], 30, 120, .9, 3);
      for (let i = 0; i < 2; i++) G.room.pickups.push({ x: this.x + (i ? 28 : -28), y: this.y + 28, type: 'faith', t: 0, ttl: 9 });
    }
  }
  ai(dt) {
    const p = ppos(); this.st += dt;
    if (this.cracked > 0) { this.cracked -= dt; if (this.cracked <= 0) { Aud.sfx('shut'); G.banner('HIS STONE SKIN HARDENS AGAIN!'); for (let i = 0; i < 2; i++) spawnEnemy('rubble', this.x + (i ? 30 : -30), this.y + 30, { summoned: 1 }); } }
    const sp = this.cracked > 0 ? 8 : 20;
    const a = Math.atan2(p[1] - this.y, p[0] - this.x); if (this.state === 'walk') { this.x += Math.cos(a) * sp * dt; this.y += Math.sin(a) * sp * dt * .6; }
    if (this.state === 'walk' && this.st > 3) { this.state = Math.random() < .5 ? 'slam' : 'throw'; this.st = 0; this.n = 0; }
    else if (this.state === 'slam') { if (this.st > .8 && !this.n) { this.n = 1; ring(this.x, this.y, 12, 75, 'brick', 1, .2); G.shake = .5; Aud.sfx('boom'); } if (this.st > 1.5) { this.state = 'walk'; this.st = 0; } }
    else if (this.state === 'throw') { if (this.st > .4 + this.n * .5 && this.n < 3) { this.n++; fan(this.x, this.y + 10, p[0], p[1], 3, .3, 100, 'brick', 1); Aud.sfx('arrow'); } if (this.st > 2) { this.state = 'walk'; this.st = 0; } }
    this.x = clamp(this.x, ARENA.x0 + 20, ARENA.x1 - 20); this.y = clamp(this.y, ARENA.y0 + 22, ARENA.y1 - 24);
  }
  draw(c) {
    const x = Math.round(this.x), y = Math.round(this.y), cr = this.cracked > 0;
    const base = cr ? '#b08858' : '#8a8a92', dark = cr ? '#705030' : '#505058', lt = cr ? '#e0b880' : '#c0c0c8';
    c.globalAlpha = .35; R(c, '#000', x - 20, y + 20, 40, 5); c.globalAlpha = 1;
    const sh = this.state === 'slam' && this.st < .8 ? Math.round(Math.sin(this.t * 60) * 1) : 0;
    R(c, dark, x - 20 + sh, y - 6, 40, 26); R(c, base, x - 19 + sh, y - 6, 38, 24); R(c, lt, x - 19 + sh, y - 6, 38, 2); // torso
    R(c, dark, x - 28 + sh, y - 4, 10, 22); R(c, base, x - 27 + sh, y - 4, 8, 20); R(c, dark, x + 18 + sh, y - 4, 10, 22); R(c, base, x + 19 + sh, y - 4, 8, 20);
    R(c, dark, x - 12 + sh, y - 24, 24, 20); R(c, base, x - 11 + sh, y - 24, 22, 18); R(c, lt, x - 11 + sh, y - 24, 22, 2); // head
    const eye = cr ? '#f8a038' : '#201820'; R(c, eye, x - 7 + sh, y - 17, 5, 3); R(c, eye, x + 2 + sh, y - 17, 5, 3); R(c, dark, x - 5 + sh, y - 9, 10, 2);
    for (let i = 0; i < 4; i++) { R(c, dark, x - 18 + i * 10 + sh, y + 4, 1, 14); }
    R(c, dark, x - 14 + sh, y + 18, 10, 6); R(c, dark, x + 4 + sh, y + 18, 10, 6);
    if (cr) { R(c, '#000', x - 4, y - 6, 1, 10); R(c, '#000', x - 3, y + 2, 5, 1); R(c, '#000', x + 6, y - 20, 1, 8); R(c, '#000', x - 12, y + 4, 4, 1); if (Math.floor(this.t * 8) % 2) R(c, '#f8d838', x - 3, y - 2, 6, 6); }
    this.drawFlash(c);
  }
}

/* ---- 6. goliath ---- */
class Goliath extends Boss {
  constructor() { super('goliath', 'GOLIATH OF GATH', 36); this.x = 190; this.y = 70; this.st = 0; this.state = 'walk'; this.n = 0; this.stagger = 0; this.dir = 3; this.hinted = false; }
  rawParts() {
    return [
      { x: this.x, y: this.y - 20, hw: 8, hh: 7, vuln: true, id: 'head', mult: (src) => src === 'stone' ? 4 : src === 'sword' ? 1 : 1 },
      { x: this.x, y: this.y + 2, hw: 15, hh: 17, vuln: false, id: 'body' }
    ];
  }
  hit(part, dmg, src) {
    if (part.id === 'body') {
      Aud.sfx('clink'); if (!this.hinted) { this.hinted = true; G.banner('BRONZE ARMOR! AIM FOR HIS FOREHEAD WITH THE SLING!'); } return 'block';
    }
    if (src === 'stone') { this.stagger = 1.6; this.state = 'stagger'; this.st = 0; G.banner('DIRECT HIT!'); }
    this.damage(dmg * (src === 'stone' ? 4 : 1), part, src); return 'dmg';
  }
  ai(dt) {
    const p = ppos(); this.st += dt;
    if (this.state === 'stagger') { if (this.st > 1.6) { this.state = 'walk'; this.st = 0; } return; }
    if (this.state === 'walk') {
      const a = Math.atan2(p[1] - this.y, p[0] - this.x), sp = 22 + (1 - this.ratio) * 14; this.x += Math.cos(a) * sp * dt; this.y += Math.sin(a) * sp * dt * .7; this.dir = Math.cos(a) > 0 ? 3 : 2;
      if (this.st > 2.8) { const r = Math.random(); this.state = r < .5 ? 'spear' : 'bash'; this.st = 0; this.n = 0; }
    } else if (this.state === 'spear') {
      if (this.st > .7 && !this.n) { this.n = 1; shootAt(this.x, this.y - 4, p[0], p[1], 150, 'spear', 2, 0, { big: true, hw: 5, hh: 5, life: 3 }); Aud.sfx('arrow'); }
      if (this.st > 1.6) { this.state = 'walk'; this.st = 0; }
    } else if (this.state === 'bash') {
      if (this.st < .7) { this.bx = p[0]; this.by = p[1]; } else if (this.st < 1.4) { const a = Math.atan2(this.by - this.y, this.bx - this.x); this.x += Math.cos(a) * 140 * dt; this.y += Math.sin(a) * 140 * dt; }
      else if (this.st > 2.2) { this.state = 'walk'; this.st = 0; }
      if (this.st >= 1.4 && this.st < 1.45) { ring(this.x, this.y, 8, 80, 'stone', 1); G.shake = .3; Aud.sfx('boom'); }
    }
    this.x = clamp(this.x, ARENA.x0 + 16, ARENA.x1 - 16); this.y = clamp(this.y, ARENA.y0 + 24, ARENA.y1 - 18);
  }
  draw(c) {
    const x = Math.round(this.x), y = Math.round(this.y), pal = { a: '#c88838', b: '#7a4818', c: '#e8a878' };
    c.globalAlpha = .35; R(c, '#000', x - 15, y + 17, 30, 4); c.globalAlpha = 1;
    let img = sprite('human', pal, Math.floor(this.t * 3) % 2); if (this.flash > 0) img = flashed(img);
    c.save(); c.translate(x, y - 6); c.scale(2.2, 2.2); c.drawImage(img, -8, -8); c.restore();
    R(c, '#d0a050', x - 9, y - 30, 18, 6); R(c, '#f8d878', x - 9, y - 30, 18, 1); R(c, '#c83838', x - 2, y - 36, 4, 6); // helmet & plume
    R(c, '#f8d838', x - 5, y - 22, 10, 2); // forehead target
    if (Math.floor(this.t * 5) % 2 || this.state === 'stagger') R(c, '#fff', x - 1, y - 22, 2, 2);
    const sx = this.dir === 3 ? x + 14 : x - 22; R(c, '#a07040', sx, y - 14, 8, 26); R(c, '#d0a050', sx, y - 14, 8, 26); R(c, '#7a4818', sx + 1, y - 12, 6, 22); R(c, '#f8d878', sx + 3, y - 8, 2, 14); // shield
    if (this.state === 'stagger') { for (let i = 0; i < 3; i++) { const a = this.t * 8 + i * 2.1; R(c, '#f8d838', Math.round(x + Math.cos(a) * 10), Math.round(y - 32 + Math.sin(a) * 3), 2, 2); } }
    if (this.state === 'bash' && this.st < .7 && Math.floor(this.t * 20) % 2) { R(c, '#fff', x - 15, y - 30, 30, 50); }
    this.drawFlash(c);
  }
}

/* ---- 7. the great image (Daniel 2) ---- */
class GreatImage extends Boss {
  constructor() {
    super('image', 'THE GREAT IMAGE', 35); this.x = 128; this.y = 60; this.phase = 0; this.st = 0; this.n = 0;
    this.sec = [
      { name: 'GOLD', y: 30, hw: 11, hh: 10, hp: 7, col: ['#f8c838', '#a07808', '#fff0a0'] }, { name: 'SILVER', y: 50, hw: 21, hh: 10, hp: 7, col: ['#d0d8e8', '#7080a0', '#fcfcfc'] },
      { name: 'BRONZE', y: 69, hw: 17, hh: 9, hp: 7, col: ['#c87838', '#784018', '#f0b070'] }, { name: 'IRON', y: 89, hw: 15, hh: 11, hp: 7, col: ['#808898', '#404858', '#b8c0d0'] },
      { name: 'CLAY', y: 110, hw: 19, hh: 10, hp: 7, col: ['#b87848', '#704018', '#e0a878'] }
    ];
  }
  rawParts() { return this.sec.map((s, i) => ({ x: 128, y: s.y, hw: s.hw, hh: s.hh, vuln: i === this.phase && s.hp > 0, id: 's' + i })).filter((p, i) => this.sec[i].hp > 0); }
  hit(part, dmg, src) {
    const i = +part.id.slice(1);
    if (i !== this.phase) { Aud.sfx('clink'); return 'block'; }
    const s = this.sec[i]; s.hp -= dmg; this.hp = this.sec.reduce((a, q) => a + Math.max(0, q.hp), 0); this.flash = .12; Aud.sfx('hit'); fxBurst(128, s.y, s.col, 6, 70, .4, 2);
    if (s.hp <= 0) {
      fxBurst(128, s.y, s.col, 30, 110, .9, 3); Aud.sfx('boom'); G.shake = .5; this.phase++; this.st = 0; this.n = 0; G.room.projs.length = 0;
      if (this.phase >= 5) this.die(); else G.banner('THE ' + this.sec[this.phase].name + ' STIRS!');
    }
    return 'dmg';
  }
  ai(dt) {
    const p = ppos(); this.st += dt;
    const s = this.sec[this.phase]; if (!s) return;
    const y = s.y;
    switch (this.phase) {
      case 0: if (this.st > 1.2 + this.n * 1.5) { this.n++; fan(128, y + 6, p[0], p[1], 5, .25, 95, 'gold', 1); Aud.sfx('spit'); if (this.n % 3 === 0) for (let i = 0; i < 3; i++) addHazard(clamp(p[0] + rnd(-40, 40), 30, 226), clamp(p[1] + rnd(-30, 30), 50, 164), 1 + i * .3, 11, 2, 'gold', { fall: 80 }); } break;
      case 1: if (this.st > 1 + this.n * 1.2) { this.n++; for (let i = 0; i < 6; i++) { const ax = clamp(p[0] + (i - 2.5) * 22 + rnd(-6, 6), 24, 232); shootAng(ax, 40, Math.PI / 2, 105, 'arrow', 1, { life: 2.2, pass: 0 }); } Aud.sfx('arrow'); } break;
      case 2: if (this.st > 1.5 && this.st % 4.5 < 3) { this.sp = (this.sp || 0) + dt; if (this.sp > .14) { this.sp = 0; this.a = (this.a || 0) + .55; for (let k = 0; k < 3; k++) shootAng(128, y + 4, this.a + k * 2.094, 75, 'fire', 1); Aud.sfx('spit'); } } break;
      case 3: if (this.st > 1.2 + this.n * 2.6) { this.n++; const gap = rint(2, 13); for (let i = 1; i < 15; i++) if (Math.abs(i - gap) > 1) shootAng(i * 16 + 8, 118, Math.PI / 2, 62, 'bar', 1, { life: 4, hw: 6, hh: 3 }); Aud.sfx('boom'); } break;
      case 4: if (this.st > 1 + this.n * 3 && G.room.enemies.length < 4) { this.n++; spawnEnemy('mudling', 100, 128, { summoned: 1 }); spawnEnemy('mudling', 156, 128, { summoned: 1 }); fan(128, y + 8, p[0], p[1], 3, .35, 70, 'mud', 1); } break;
    }
  }
  draw(c) {
    const cx = 128;
    // pedestal
    R(c, '#303040', 96, 120, 64, 8); R(c, '#505068', 98, 118, 60, 4);
    this.sec.forEach((s, i) => {
      if (s.hp <= 0) { if (i === this.phase - 1 || true) { c.globalAlpha = .6; R(c, s.col[1], cx - s.hw, s.y + s.hh - 3, s.hw * 2, 3); c.globalAlpha = 1; } return; }
      const x0 = cx - s.hw, w = s.hw * 2, active = i === this.phase;
      R(c, s.col[1], x0, s.y - s.hh, w, s.hh * 2); R(c, s.col[0], x0 + 1, s.y - s.hh + 1, w - 2, s.hh * 2 - 3); R(c, s.col[2], x0 + 2, s.y - s.hh + 1, w - 4, 2);
      if (i === 0) { R(c, '#000', cx - 5, s.y - 2, 3, 2); R(c, '#000', cx + 3, s.y - 2, 3, 2); R(c, s.col[1], cx - 3, s.y + 4, 7, 1); R(c, s.col[2], cx - 8, s.y - 10, 16, 2); }
      if (i === 1) { R(c, s.col[1], cx - 1, s.y - s.hh, 2, s.hh * 2); }
      if (i === 2) { R(c, s.col[1], cx - 6, s.y - 2, 12, 1); R(c, s.col[2], cx - 2, s.y + 1, 4, 3); }
      if (i === 3) { R(c, s.col[1], cx - 1, s.y - s.hh, 2, s.hh * 2); R(c, s.col[2], x0 + 3, s.y - 6, 3, 10); R(c, s.col[2], cx + 2, s.y - 6, 3, 10); }
      if (i === 4) { for (let k = 0; k < 5; k++) R(c, s.col[1], x0 + 3 + k * 7, s.y - 7 + (k % 2) * 4, 2, 6); R(c, s.col[1], cx - 1, s.y - 8, 2, 16); }
      if (active && Math.floor(this.t * 8) % 2) { c.strokeStyle = '#fcfcfc'; c.lineWidth = 1; c.strokeRect(x0 + .5, s.y - s.hh + .5, w - 1, s.hh * 2 - 1); }
      if (active && this.flash > 0) { c.globalAlpha = .6; R(c, '#fff', x0, s.y - s.hh, w, s.hh * 2); c.globalAlpha = 1; }
    });
  }
}

/* ---- 8. the tempter ---- */
class Tempter extends Boss {
  constructor() { super('tempter', 'THE TEMPTER', 40); this.x = 128; this.y = 60; this.state = 'gone'; this.st = 0; this.phase = 1; this.n = 0; this.alpha = 0; this.windT = 0; this.windDir = 1; }
  rawParts() { return this.alpha > .5 ? [{ x: this.x, y: this.y, hw: 11, hh: 15, vuln: true, id: 'b' }] : []; }
  hit(part, dmg, src) {
    const mult = src === 'reflect' ? 3 : 1; this.damage(dmg * mult, part, src);
    if (src === 'reflect') { fxText(this.x, this.y - 22, 'IT IS WRITTEN!', '#a8f0ff'); G.banner('IT IS WRITTEN!'); }
    return 'dmg';
  }
  damage(n, part, src) {
    const before = this.hp; super.damage(n, part, src);
    if (this.hp > 0) {
      if (this.phase === 1 && this.hp <= 26) this.nextPhase(2); else if (this.phase === 2 && this.hp <= 13) this.nextPhase(3);
    }
  }
  nextPhase(n) {
    this.phase = n; this.state = 'gone'; this.st = 0; G.room.projs.length = 0; G.room.hazards.length = 0; Aud.sfx('bossroar'); G.shake = .5;
    if (n === 2) {
      const t = G.room.tiles; // the pinnacle: pits around the rim
      for (let y = 1; y <= 10; y++) for (let x = 1; x <= 14; x++) if ((x <= 2 || x >= 13 || y <= 2) && !(y >= 9 && x >= 6 && x <= 9)) { t[y * 16 + x] = T.PIT; }
      G.banner('"IF YOU ARE THE SON OF GOD, THROW YOURSELF DOWN." DO NOT TEST THE LORD!');
      G.room.wind = [0, 0];
    } else {
      const t = G.room.tiles; for (let i = 0; i < 192; i++) if (t[i] === T.PIT && G.room.cell && !G.room.cell.mod) t[i] = T.FLOOR; G.room.wind = null;
      for (let i = 0; i < 9; i++) { const x = 2 + (Math.random() * 12 | 0), y = 3 + (Math.random() * 6 | 0); if (t[y * 16 + x] === T.FLOOR) t[y * 16 + x] = T.GOLD; }
      G.banner('"ALL THE KINGDOMS OF THE WORLD WILL BE YOURS IF YOU WORSHIP ME." SERVE THE LORD ONLY!');
    }
  }
  setup() { G.banner('IT IS WRITTEN: MAN SHALL NOT LIVE BY BREAD ALONE.'); }
  ai(dt) {
    const p = ppos(); this.st += dt;
    if (this.phase === 2) { this.windT += dt; if (this.windT > 3) { this.windT = 0; this.windDir *= -1; } G.room.wind = [this.windDir * 22, 0]; }
    const fast = this.phase === 3 ? .75 : 1;
    if (this.state === 'gone') {
      this.alpha = Math.max(0, this.alpha - dt * 4);
      if (this.st > .5 * fast) { for (let i = 0; i < 20; i++) { const nx = rnd(50, 206), ny = rnd(44, 100); if (dist(nx, ny, p[0], p[1]) > 56) { this.x = nx; this.y = ny; break; } } this.state = 'in'; this.st = 0; this.n = 0; }
    } else if (this.state === 'in') {
      this.alpha = Math.min(1, this.alpha + dt * 4); if (this.st > .45) { this.state = 'cast'; this.st = 0; this.n = 0; }
    } else if (this.state === 'cast') {
      this.alpha = 1;
      if (!this.n) {
        this.n = 1; Aud.sfx('magic');
        if (this.phase === 1) { for (let i = 0; i < 5; i++) addHazard(clamp(p[0] + rnd(-60, 60), 30, 226), clamp(p[1] + rnd(-40, 40), 44, 164), 1 + i * .25, 12, 2, 'rock', { fall: 100 }); shootAt(this.x, this.y, p[0], p[1], 85, 'orb', 2); }
        else if (this.phase === 2) { fan(this.x, this.y, p[0], p[1], 3, .35, 90, 'orb', 2); }
        else { for (let i = 0; i < 5; i++) addHazard(clamp(p[0] + rnd(-70, 70), 30, 226), clamp(p[1] + rnd(-50, 50), 44, 164), .9 + i * .22, 11, 2, 'gold', { fall: 90 }); ring(this.x, this.y, 8, 70, 'orb', 2, rnd(0, 1)); if (Math.random() < .35 && G.room.enemies.length < 2) spawnEnemy('coinmimic', this.x, this.y + 20, { summoned: 1 }); }
      }
      if (this.phase >= 2 && this.st > .7 && this.n === 1) { this.n = 2; shootAt(this.x, this.y, p[0], p[1], 105, 'orb', 2); }
      if (this.st > 1.9 * fast) { this.state = 'vanish'; this.st = 0; }
    } else if (this.state === 'vanish') {
      this.alpha = Math.max(0, 1 - this.st * 3); if (this.st > .35) { this.state = 'gone'; this.st = 0; }
    }
  }
  draw(c) {
    if (this.alpha <= 0) return;
    const x = Math.round(this.x), y = Math.round(this.y); c.globalAlpha = this.alpha;
    const wv = Math.round(Math.sin(this.t * 5) * 2);
    // wings
    for (const s of [-1, 1]) { for (let i = 0; i < 5; i++) { R(c, i % 2 ? '#401030' : '#601848', x + s * (10 + i * 4) - (s < 0 ? 4 : 0), y - 14 + i * 3 + wv, 5, 12 - i); } }
    let img = sprite('human', { a: '#301848', b: '#601890', c: '#a03040', o: '#100818' }, Math.floor(this.t * 3) % 2); if (this.flash > 0) img = flashed(img);
    c.save(); c.translate(x, y); c.scale(2, 2); c.drawImage(img, -8, -8); c.restore();
    R(c, '#f83838', x - 5, y - 8, 3, 3); R(c, '#f83838', x + 3, y - 8, 3, 3); R(c, '#601018', x - 10, y - 20, 3, 8); R(c, '#601018', x + 8, y - 20, 3, 8); // horns
    c.globalAlpha = 1;
  }
}

/* ---- 9. death ---- */
class Death extends Boss {
  constructor() { super('death', 'DEATH', 30); this.x = 128; this.y = 62; this.lit = 0; this.st = 0; this.state = 'float'; this.n = 0; this.lightT = 3; this.hinted = false; }
  setup() { G.room.dark = true; G.room.darkR = 40; G.banner('DEATH IS SHROUDED IN DARKNESS. SEEK THE LIGHT!'); }
  rawParts() { return [{ x: this.x, y: this.y, hw: 11, hh: 16, vuln: this.lit > 0, id: 'b' }]; }
  hit(part, dmg, src) {
    if (this.lit <= 0) { Aud.sfx('clink'); return 'block'; }
    this.damage(dmg, part, src); return 'dmg';
  }
  onLight() { this.lit = 7; G.room.dark = false; fxBurst(this.x, this.y, ['#fff8c0', '#fff'], 20, 100, .6, 2); G.banner('THE LIGHT SHINES! DEATH IS EXPOSED!'); }
  ai(dt) {
    const p = ppos(); this.st += dt;
    if (this.lit > 0) { this.lit -= dt; if (this.lit <= 0 && !this.dying) { G.room.dark = true; G.room.darkR = 40; } }
    this.lightT -= dt;
    if (this.lightT <= 0 && !G.room.pickups.some(k => k.type === 'light') && this.lit <= 0) { this.lightT = 8; G.room.pickups.push({ x: rnd(40, 216), y: rnd(70, 160), type: 'light', t: 0 }); Aud.sfx('magic'); }
    const sp = this.lit > 0 ? 8 : 24, a = Math.atan2(p[1] - this.y, p[0] - this.x);
    if (this.state === 'float') { this.x += Math.cos(a) * sp * dt; this.y += Math.sin(a) * sp * dt * .6; if (this.st > 2.4) { const r = Math.random(); this.state = r < .4 ? 'sweep' : r < .75 ? 'souls' : 'summon'; this.st = 0; this.n = 0; } }
    else if (this.state === 'sweep') {
      if (this.st > .5 + this.n * .07 && this.n < 8) { const base = Math.atan2(p[1] - this.y, p[0] - this.x); shootAng(this.x, this.y, base + (this.n - 3.5) * .22, 90, 'scythe', 2, { life: 2.5 }); this.n++; if (this.n === 1) Aud.sfx('sword'); }
      if (this.st > 1.8) { this.state = 'float'; this.st = 0; }
    } else if (this.state === 'souls') {
      if (this.st > .5 && this.n === 0) { this.n = 1; for (let i = 0; i < 3; i++) shootAng(this.x, this.y, i * 2.094 + this.t, 55, 'soul', 1, { homing: 1.6, life: 4.5, pass: 1 }); Aud.sfx('magic'); }
      if (this.st > 1.6) { this.state = 'float'; this.st = 0; }
    } else if (this.state === 'summon') {
      if (this.st > .6 && this.n === 0) { this.n = 1; if (G.room.enemies.length < 3) for (let i = 0; i < 2; i++) { spawnEnemy('skeleton', this.x + (i ? 26 : -26), this.y + 24, { summoned: 1 }); } fxBurst(this.x, this.y + 24, '#a8f8ff', 12, 60, .6, 2); Aud.sfx('magic'); }
      if (this.st > 1.6) { this.state = 'float'; this.st = 0; }
    }
    this.x = clamp(this.x, ARENA.x0 + 12, ARENA.x1 - 12); this.y = clamp(this.y, ARENA.y0 + 16, ARENA.y1 - 30);
  }
  draw(c) {
    const x = Math.round(this.x), y = Math.round(this.y + Math.sin(this.t * 3) * 3), lit = this.lit > 0;
    const robe = lit ? '#505068' : '#181828', robe2 = lit ? '#383850' : '#0c0c18';
    c.globalAlpha = .3; R(c, '#000', x - 10, y + 22, 20, 4); c.globalAlpha = 1;
    for (let i = 0; i < 6; i++) { R(c, i % 2 ? robe : robe2, x - 12 + i, y - 4 + i * 4, 24 - i * 2, 4); }
    R(c, robe, x - 11, y - 6, 22, 16); R(c, robe2, x - 11, y - 6, 22, 2); R(c, robe2, x - 14, y - 4, 4, 14); R(c, robe2, x + 10, y - 4, 4, 14);
    disc(c, '#101020', x, y - 14, 9); R(c, '#e8e8d8', x - 5, y - 18, 10, 9); R(c, '#e8e8d8', x - 3, y - 9, 6, 3);
    R(c, lit ? '#f83838' : '#a8f8ff', x - 4, y - 16, 3, 3); R(c, lit ? '#f83838' : '#a8f8ff', x + 2, y - 16, 3, 3); R(c, '#101020', x - 1, y - 12, 2, 2); R(c, '#101020', x - 3, y - 8, 1, 2); R(c, '#101020', x + 1, y - 8, 1, 2);
    // scythe
    R(c, '#8a6a3a', x + 17, y - 22, 2, 38); R(c, '#c8d0e0', x + 9, y - 24, 10, 2); R(c, '#c8d0e0', x + 7, y - 22, 4, 2); R(c, '#fcfcfc', x + 9, y - 24, 10, 1);
    if (lit && this.flash <= 0 && Math.floor(this.t * 6) % 2) { disc(c, 'rgba(255,255,200,.25)', x, y, 22); }
    this.drawFlash(c);
  }
}

/* ---- 10. the dragon ---- */
class Dragon extends Boss {
  constructor() {
    super('dragon', 'THE DRAGON', 35 + 30); this.phase = 1; this.heads = []; this.bx = 128; this.by = 24; this.st = 0; this.n = 0; this.state = 'idle';
    for (let i = 0; i < 7; i++) this.heads.push({ i, hp: 5, x: 30 + i * 32, y: 62, t: rnd(0, 3), at: rnd(1.5, 4), hf: 0 });
    this.bhp = 30; this.hint = 0;
  }
  setup() { G.banner('THE DRAGON! SEVEN HEADS AND TEN HORNS!'); }
  get ratio() { const h = this.heads.reduce((a, q) => a + Math.max(0, q.hp), 0); return (h + (this.phase === 2 ? this.bhp : 30)) / 65; }
  rawParts() {
    if (this.phase === 1) return this.heads.filter(h => h.hp > 0).map(h => ({ x: h.x, y: h.y, hw: 10, hh: 10, vuln: true, id: 'h' + h.i, h }));
    return [{ x: this.bx, y: this.by, hw: 30, hh: 20, vuln: true, id: 'body' }];
  }
  hit(part, dmg, src) {
    if (this.phase === 1) {
      const h = part.h; h.hp -= dmg; h.hf = .12; Aud.sfx('hit'); fxBurst(h.x, h.y, ['#fff', '#f8d838'], 4, 60, .3, 2);
      if (h.hp <= 0) { fxBurst(h.x, h.y, ['#f83838', '#f8a038', '#fff'], 24, 110, .8, 3); Aud.sfx('boom'); G.shake = .4; if (!this.heads.some(q => q.hp > 0)) { this.phase = 2; this.st = 0; this.state = 'fall'; G.room.projs.length = 0; G.room.hazards.length = 0; G.banner('THE HEADS FALL! THE DRAGON DESCENDS!'); } }
      this.hp = this.heads.reduce((a, q) => a + Math.max(0, q.hp), 0) + 30;
      return 'dmg';
    }
    if (this.state === 'fall') { Aud.sfx('clink'); return 'block'; }
    this.bhp -= dmg; this.flash = .12; Aud.sfx('hit'); this.hp = this.bhp; fxBurst(this.bx + rnd(-20, 20), this.by + rnd(-10, 10), ['#fff', '#f8d838'], 4, 60, .3, 2);
    if (this.bhp <= 0 && !this.dying) this.die();
    return 'dmg';
  }
  ai(dt) {
    const p = ppos(), alive = this.heads.filter(h => h.hp > 0).length; this.st += dt;
    if (this.phase === 1) {
      for (const h of this.heads) {
        if (h.hf > 0) h.hf -= dt;
        if (h.hp <= 0) continue;
        h.t += dt; h.x = 30 + h.i * 32 + Math.sin(h.t * 1.3 + h.i) * 8; h.y = 62 + Math.sin(h.t * 1.7 + h.i * 2) * 8 + (h.i % 2) * 6;
        h.at -= dt * (1 + (7 - alive) * .12);
        if (h.at <= 0) {
          h.at = rnd(2.6, 4.2); Aud.sfx('spit');
          switch (h.i) {
            case 0: shootAt(h.x, h.y + 8, p[0], p[1], 105, 'fire', 1); break;
            case 1: fan(h.x, h.y + 8, p[0], p[1], 3, .3, 95, 'fire', 1); break;
            case 2: ring(h.x, h.y + 8, 10, 65, 'fire', 1, rnd(0, 1)); break;
            case 3: shootAt(h.x, h.y + 8, p[0], p[1], 60, 'fire', 1, 0, { homing: 1.5, life: 4.5, big: false }); break;
            case 4: shootAt(h.x, h.y + 8, p[0], p[1], 110, 'fire', 1, -.1); shootAt(h.x, h.y + 8, p[0], p[1], 110, 'fire', 1, .1); break;
            case 5: for (let k = 0; k < 6; k++) shootAng(h.x + (k - 2.5) * 6, h.y + 10 + k * 3, Math.PI / 2, 90, 'fire', 1, { life: 2 }); break;
            case 6: for (let k = 0; k < 3; k++) addHazard(clamp(p[0] + rnd(-50, 50), 30, 226), clamp(p[1] + rnd(-40, 40), 70, 164), .9 + k * .3, 12, 2, 'star', { fall: 120 }); break;
          }
        }
      }
    } else {
      if (this.state === 'fall') {
        this.by += (70 - this.by) * dt * 2; if (this.st > 1.4) { this.state = 'chase'; this.st = 0; this.n = 0; G.shake = .6; Aud.sfx('boom'); ring(this.bx, this.by, 14, 80, 'fire', 1); }
      } else if (this.state === 'chase') {
        const a = Math.atan2(p[1] - this.by, p[0] - this.bx), sp = 22 + (1 - this.bhp / 30) * 18; this.bx += Math.cos(a) * sp * dt; this.by += Math.sin(a) * sp * dt * .5;
        if (this.st > 3) { const r = Math.random(); this.state = r < .4 ? 'breath' : r < .75 ? 'tail' : 'swarm'; this.st = 0; this.n = 0; }
      } else if (this.state === 'breath') {
        if (this.st > .6 && this.n < 12) { this.n++; shootAt(this.bx, this.by + 18, p[0], p[1], 120, 'fire', 1, rnd(-.35, .35)); if (this.n % 3 === 0) Aud.sfx('spit'); this.st -= .05; }
        if (this.n >= 12 && this.st > 1) { this.state = 'chase'; this.st = 0; }
      } else if (this.state === 'tail') {
        if (this.n === 0 && this.st > .6) { this.n = 1; const gap = rint(2, 13); for (let i = 1; i < 15; i++) if (Math.abs(i - gap) > 1) shootAng(i * 16 + 8, this.by + 24, Math.PI / 2, 78, 'bar', 1, { life: 3.5, hw: 6, hh: 3 }); Aud.sfx('boom'); }
        if (this.st > 2.2) { this.state = 'chase'; this.st = 0; }
      } else if (this.state === 'swarm') {
        if (this.n < 3 && this.st > this.n * .4 + .3) { this.n++; spawnEnemy('stinger', this.bx + rnd(-30, 30), this.by + 20, { summoned: 1 }); }
        if (this.st > 2) { this.state = 'chase'; this.st = 0; }
      }
      this.bx = clamp(this.bx, 50, 206); this.by = clamp(this.by, 40, 120);
    }
    this.x = this.bx; this.y = this.by;
  }
  draw(c) {
    const body = (cx, cy, s) => {
      R(c, '#501018', cx - 30 * s, cy - 18 * s, 60 * s, 34 * s); R(c, '#a82028', cx - 29 * s, cy - 17 * s, 58 * s, 30 * s); R(c, '#d84040', cx - 29 * s, cy - 17 * s, 58 * s, 4 * s);
      for (let i = 0; i < 9; i++) for (let j = 0; j < 3; j++) R(c, '#701018', Math.round(cx - 26 * s + i * 6.5 * s + (j % 2) * 3), Math.round(cy - 10 * s + j * 8 * s), 3, 2);
      for (let i = 0; i < 10; i++) R(c, '#f8d838', Math.round(cx - 29 * s + i * 6 * s), Math.round(cy - 22 * s - (i % 2) * 3), 3, 5); // horns
      for (const sg of [-1, 1]) { for (let i = 0; i < 4; i++) R(c, i % 2 ? '#701018' : '#a82028', Math.round(cx + sg * (32 + i * 6) * s - (sg < 0 ? 8 : 0)), Math.round(cy - 12 * s + i * 3), 8, 20 - i * 3); } // wings
    };
    if (this.phase === 1) {
      body(128, 14, 1.15);
      for (const h of this.heads) {
        if (h.hp <= 0) continue;
        const x = Math.round(h.x), y = Math.round(h.y), fl = h.hf > 0;
        for (let k = 0; k < 6; k++) { const nx = Math.round(128 + (h.x - 128) * (k / 6) * .5 + (30 + h.i * 32 - 128) * (1 - k / 6) * .5 * 0), ny = Math.round(24 + (h.y - 24) * (k / 6)); disc(c, '#701018', Math.round(30 + h.i * 32 + (h.x - 30 - h.i * 32) * (k / 6)), ny, 4); disc(c, '#a82028', Math.round(30 + h.i * 32 + (h.x - 30 - h.i * 32) * (k / 6)), ny, 3); }
        disc(c, '#501018', x, y, 10); disc(c, fl ? '#fff' : '#c83030', x, y, 9); R(c, fl ? '#fff' : '#e85050', x - 5, y - 6, 4, 3);
        R(c, '#f8d838', x - 6, y - 3, 4, 3); R(c, '#f8d838', x + 3, y - 3, 4, 3); R(c, '#000', x - 5, y - 2, 2, 2); R(c, '#000', x + 4, y - 2, 2, 2);
        R(c, '#f8d838', x - 7, y - 12, 2, 5); R(c, '#f8d838', x + 6, y - 12, 2, 5); R(c, '#201010', x - 5, y + 3, 10, 3); R(c, '#fcfcfc', x - 4, y + 3, 2, 2); R(c, '#fcfcfc', x + 3, y + 3, 2, 2);
        if (h.at < .5 && Math.floor(this.t * 20) % 2) disc(c, 'rgba(255,200,60,.7)', x, y + 8, 5);
        // hp pips
        for (let k = 0; k < 5; k++) R(c, k < h.hp ? '#f83838' : '#301010', x - 7 + k * 3, y + 12, 2, 2);
      }
    } else {
      const x = Math.round(this.bx), y = Math.round(this.by);
      c.globalAlpha = .35; R(c, '#000', x - 30, y + 18, 60, 5); c.globalAlpha = 1;
      body(x, y, 1);
      disc(c, '#501018', x, y + 4, 12); disc(c, '#c83030', x, y + 4, 11); R(c, '#f8d838', x - 7, y - 2, 5, 4); R(c, '#f8d838', x + 3, y - 2, 5, 4); R(c, '#000', x - 5, y - 1, 2, 3); R(c, '#000', x + 5, y - 1, 2, 3);
      R(c, '#201010', x - 6, y + 8, 12, 4); for (let i = 0; i < 4; i++) R(c, '#fcfcfc', x - 5 + i * 3, y + 8, 2, 3);
      if (this.state === 'breath' && this.st < .6) disc(c, 'rgba(255,160,40,.8)', x, y + 14, 6);
      if (this.flash > 0) { c.globalAlpha = .5; R(c, '#fff', x - 30, y - 18, 60, 34); c.globalAlpha = 1; }
    }
  }
}

function makeBoss(id) {
  switch (id) {
    case 'serpent': return new Serpent(); case 'leviathan': return new Leviathan(); case 'nimrod': return new Nimrod(); case 'pharaoh': return new Pharaoh();
    case 'colossus': return new Colossus(); case 'goliath': return new Goliath(); case 'image': return new GreatImage(); case 'tempter': return new Tempter();
    case 'death': return new Death(); case 'dragon': return new Dragon();
  }
}
