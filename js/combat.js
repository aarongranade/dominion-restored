'use strict';
/* ===== Dominion Restored :: combat (player, enemies, projectiles, items, fx) ===== */

const hb = e => ({ x: e.x, y: e.y + (e.oy || 0), hw: e.hw, hh: e.hh });
const tileOf = (tx, ty) => G.room.tiles[ty * 16 + tx];
function tileAtPx(x, y) { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return (tx < 0 || ty < 0 || tx > 15 || ty > 11) ? T.WALL : tileOf(tx, ty); }

function tileSolidFor(e, tx, ty) {
  const rm = G.room;
  if (tx < 0 || tx >= 16 || ty < 0 || ty >= 12) {
    if (e.isPlayer) {
      const ex = rm.exits;
      if (tx < 0 && ex[2] && ty >= 5 && ty <= 6) return false;
      if (tx >= 16 && ex[3] && ty >= 5 && ty <= 6) return false;
      if (ty < 0 && ex[1] && tx >= 7 && tx <= 8) return false;
      if (ty >= 12 && ex[0] && tx >= 7 && tx <= 8) return false;
    }
    return !e.noclip;
  }
  if (e.noclip) return false;
  const t = rm.tiles[ty * 16 + tx];
  if (t === T.WATER && e.fly) return false;
  if (SOLID.has(t)) return true;
  if (!e.fly && !e.isPlayer && (t === T.PIT || t === T.FIRE)) return true;
  return false;
}
function boxHitsSolid(e, cx, cy) {
  const x0 = Math.floor((cx - e.hw) / TS), x1 = Math.floor((cx + e.hw - .01) / TS), y0 = Math.floor((cy - e.hh) / TS), y1 = Math.floor((cy + e.hh - .01) / TS);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (tileSolidFor(e, tx, ty)) return true;
  const ch = G.room.chest;
  if (ch && e.isPlayer && Math.abs(cx - ch.x) < e.hw + 7 && Math.abs(cy - ch.y) < e.hh + 6) return true;
  return false;
}
/* returns true when movement was blocked */
function moveEnt(e, dx, dy) {
  let blocked = false; const oy = e.oy || 0;
  if (dx) {
    if (!boxHitsSolid(e, e.x + dx, e.y + oy)) e.x += dx;
    else {
      blocked = true;
      if (e.isPlayer) for (const n of [2, 4, 6]) { // slide around corners
        if (!boxHitsSolid(e, e.x + dx, e.y + oy - n)) { e.y -= Math.min(n, 1.2); break; }
        if (!boxHitsSolid(e, e.x + dx, e.y + oy + n)) { e.y += Math.min(n, 1.2); break; }
      }
    }
  }
  if (dy) {
    if (!boxHitsSolid(e, e.x, e.y + oy + dy)) e.y += dy;
    else {
      blocked = true;
      if (e.isPlayer) for (const n of [2, 4, 6]) {
        if (!boxHitsSolid(e, e.x - n, e.y + oy + dy)) { e.x -= Math.min(n, 1.2); break; }
        if (!boxHitsSolid(e, e.x + n, e.y + oy + dy)) { e.x += Math.min(n, 1.2); break; }
      }
    }
  }
  return blocked;
}

/* ---------------- effects ---------------- */
function fxBurst(x, y, col, n, spd, life, size) {
  const rm = G.room; if (!rm) return;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283, s = rnd(.3, 1) * (spd || 60);
    rm.fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(.5, 1) * (life || .5), max: life || .5, col: Array.isArray(col) ? pick(col) : col, size: size || 2 });
  }
}
function fxText(x, y, s, col) { G.room.fx.push({ x, y, vx: 0, vy: -18, life: .8, max: .8, text: s, col: col || '#fff' }); }
function updateFx(dt) {
  const fx = G.room.fx;
  for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.life -= dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= .96; f.vy *= .96; if (f.life <= 0) fx.splice(i, 1); }
}
function drawFx(c) {
  for (const f of G.room.fx) {
    if (f.text) { text(c, f.text, Math.round(f.x - textW(f.text) / 2), Math.round(f.y), f.col); continue; }
    const a = f.life / f.max; c.globalAlpha = Math.min(1, a * 1.5); R(c, f.col, Math.round(f.x), Math.round(f.y), f.size, f.size);
  }
  c.globalAlpha = 1;
}

/* ---------------- projectiles ---------------- */
const REFLECTABLE = new Set(['arrow', 'stone', 'orb', 'brick', 'gold', 'spit', 'fire', 'coin']);
function addProj(o) {
  o.hw = o.hw || 3; o.hh = o.hh || o.hw; o.life = o.life || 3; o.dmg = o.dmg === undefined ? 1 : o.dmg; o.t = 0;
  G.room.projs.push(o); return o;
}
function shootAng(x, y, ang, spd, kind, dmg, extra) {
  return addProj(Object.assign({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, kind, hostile: true, dmg: dmg === undefined ? 1 : dmg }, extra || {}));
}
function shootAt(x, y, tx, ty, spd, kind, dmg, spread, extra) {
  const a = Math.atan2(ty - y, tx - x) + (spread || 0);
  return shootAng(x, y, a, spd, kind, dmg, extra);
}
function projBlocked(x, y) {
  const t = tileAtPx(x, y); return SOLID.has(t) && t !== T.WATER;
}
function updateProjs(dt) {
  const rm = G.room, p = G.p;
  for (let i = rm.projs.length - 1; i >= 0; i--) {
    const o = rm.projs[i]; if (!o) continue; o.t += dt; o.life -= dt;
    if (o.homing && o.hostile) { const a = Math.atan2(p.y - o.y, p.x - o.x), sp = Math.hypot(o.vx, o.vy), ca = Math.atan2(o.vy, o.vx); let da = a - ca; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283; const na = ca + clamp(da, -o.homing * dt, o.homing * dt); o.vx = Math.cos(na) * sp; o.vy = Math.sin(na) * sp; }
    if (o.grav) o.vy += o.grav * dt;
    o.x += o.vx * dt; o.y += o.vy * dt;
    let dead = o.life <= 0 || o.x < -12 || o.x > 268 || o.y < -12 || o.y > 204;
    if (!dead && !o.pass && projBlocked(o.x, o.y)) { dead = true; fxBurst(o.x, o.y, '#c8c8c8', 3, 40, .25, 1); }
    if (!dead) {
      if (o.hostile) {
        if (overlap(o, hb(p)) && p.fall <= 0) {
          const f = DIRV[p.dir], dot = o.vx * f[0] + o.vy * f[1];
          if (p.shield && !o.big && dot < 0 && o.noReflect !== true) { // shield of faith
            o.hostile = false; o.vx *= -1.2; o.vy *= -1.2; o.refl = true; o.dmg = Math.max(2, o.dmg); o.life = 2; Aud.sfx('clink'); fxBurst(o.x, o.y, '#a8f0ff', 4, 50, .3, 1); continue;
          }
          if (p.inv <= 0) { hurtPlayer(o.dmg, o.x, o.y, o); if (!o.pierce) dead = true; }
        }
      } else {
        for (const e of rm.enemies) if (e.hp > 0 && !e.ghost && overlap(o, hb(e))) { if (o.sprayId && e.lastSpray === o.sprayId) continue; e.lastSpray = o.sprayId; damageEnemy(e, o.dmg, o.x, o.y, o.kind === 'arrow' ? 'arrow' : 'proj'); if (o.kind === 'word') e.stun = Math.max(e.stun, 2); if (!o.pierce) { dead = true; break; } }
        if (!dead && rm.boss && !rm.boss.dead) {
          for (const part of rm.boss.parts()) if (overlap(o, part)) { rm.boss.hit(part, o.dmg, o.refl ? 'reflect' : o.kind, o); if (!o.pierce) dead = true; break; }
        }
      }
    }
    if (dead) rm.projs.splice(i, 1);
  }
}
function drawProj(c, o) {
  const x = Math.round(o.x), y = Math.round(o.y), h = Math.abs(o.vx) >= Math.abs(o.vy), fl = Math.floor(o.t * 12) % 2;
  switch (o.kind) {
    case 'arrow': if (h) { R(c, '#c8a060', x - 5, y, 9, 1); R(c, '#fcfcfc', o.vx > 0 ? x + 3 : x - 5, y - 1, 2, 3); R(c, '#c83838', o.vx > 0 ? x - 5 : x + 3, y - 1, 2, 3); } else { R(c, '#c8a060', x, y - 5, 1, 9); R(c, '#fcfcfc', x - 1, o.vy > 0 ? y + 3 : y - 5, 3, 2); R(c, '#c83838', x - 1, o.vy > 0 ? y - 5 : y + 3, 3, 2); } break;
    case 'brick': R(c, '#803018', x - 3, y - 3, 7, 6); R(c, '#e89870', x - 3, y - 3, 7, 1); R(c, '#401808', x, y - 3, 1, 6); break;
    case 'stone': disc(c, '#606068', x, y, 3); R(c, '#c0c0c8', x - 1, y - 2, 2, 1); break;
    case 'pebble': disc(c, '#9a9a9a', x, y, 2); R(c, '#fff', x - 1, y - 1, 1, 1); break;
    case 'fire': disc(c, '#f83800', x, y, 4); disc(c, '#f8a038', x, y, 3); R(c, '#f8f038', x - 1, y - 1 + fl, 2, 2); break;
    case 'orb': disc(c, '#601898', x, y, 4); disc(c, '#b858f8', x, y, 3); R(c, '#fcfcfc', x - 1, y - 1, 2, 2); if (fl) R(c, '#f8a0f8', x - 5, y, 1, 1); break;
    case 'gold': case 'coin': disc(c, '#a07808', x, y, 3); disc(c, '#f8c838', x, y, 2); R(c, '#fff0a0', x - 1, y - 1, 1, 1); break;
    case 'venom': disc(c, '#287828', x, y, 3); disc(c, '#58e038', x, y, 2); R(c, '#f8f8a8', x, y - 1, 1, 1); break;
    case 'spit': disc(c, '#486818', x, y, 3); disc(c, '#a0e838', x, y, 2); break;
    case 'water': disc(c, '#2060c0', x, y, 4); disc(c, '#58a8f8', x, y, 3); R(c, '#fcfcfc', x - 1, y - 2, 2, 1); break;
    case 'beam': if (h) { R(c, '#a8f0ff', x - 6, y - 1, 12, 3); R(c, '#fcfcfc', x - 6, y, 12, 1); } else { R(c, '#a8f0ff', x - 1, y - 6, 3, 12); R(c, '#fcfcfc', x, y - 6, 1, 12); } break;
    case 'spear': if (h) { R(c, '#a07040', x - 10, y, 18, 2); R(c, '#e0e0f0', o.vx > 0 ? x + 8 : x - 12, y - 1, 4, 4); } else { R(c, '#a07040', x, y - 10, 2, 18); R(c, '#e0e0f0', x - 1, o.vy > 0 ? y + 8 : y - 12, 4, 4); } break;
    case 'scythe': { const a = o.t * 14; c.fillStyle = '#c8d0e0'; for (let i = 0; i < 6; i++) { c.fillRect(Math.round(x + Math.cos(a + i * .35) * 6), Math.round(y + Math.sin(a + i * .35) * 6), 2, 2); } R(c, '#fcfcfc', x, y, 1, 1); break; }
    case 'soul': disc(c, '#a8f8ff', x, y, 3); R(c, '#fcfcfc', x - 1, y - 1, 2, 2); R(c, '#58b8e8', x - 1, y + 3, 2, 3); break;
    case 'star': disc(c, '#f8d838', x, y, 3); R(c, '#fcfcfc', x - 1, y - 1, 2, 2); R(c, '#f8a038', x - 1, y - 6, 2, 3); break;
    case 'blood': { const a = Math.max(0, o.life / .3); c.globalAlpha = .5 + .5 * a; disc(c, '#a01028', x, y, 3); disc(c, '#e83048', x, y, 2); R(c, '#f8d878', x, y - 1, 1, 1); c.globalAlpha = 1; break; }
    case 'word': R(c, '#fff8d0', x - 4, y - 4, 9, 9); R(c, '#fcfcfc', x - 3, y - 3, 7, 7); R(c, '#c8a838', x - 2, y - 2, 5, 1); R(c, '#c8a838', x - 2, y, 5, 1); R(c, '#c8a838', x - 2, y + 2, 3, 1); if (fl) R(c, '#f8d838', x - 6, y, 1, 1); break;
    case 'bolt': R(c, '#f8f038', x - 1, y - 4, 3, 8); R(c, '#fcfcfc', x, y - 4, 1, 8); break;
    case 'bar': R(c, '#a8a8b8', x - 5, y - 2, 10, 5); R(c, '#e0e0f0', x - 5, y - 2, 10, 1); R(c, '#606078', x - 5, y + 2, 10, 1); break;
    case 'mud': disc(c, '#704818', x, y, 3); R(c, '#a07840', x - 1, y - 1, 2, 1); break;
    case 'letter': R(c, '#f8f8f8', x - 3, y - 3, 7, 7); R(c, '#201010', x - 1, y - 2, 3, 1); R(c, '#201010', x, y - 2, 1, 5); break;
    default: disc(c, '#fff', x, y, 2);
  }
}

/* ---------------- falling hazards (telegraphed) ---------------- */
function addHazard(x, y, delay, r, dmg, kind, extra) { G.room.hazards.push(Object.assign({ x, y, t: 0, delay, r: r || 12, dmg: dmg === undefined ? 2 : dmg, kind: kind || 'rock' }, extra || {})); }
function updateHazards(dt) {
  const rm = G.room, p = G.p;
  for (let i = rm.hazards.length - 1; i >= 0; i--) {
    const h = rm.hazards[i]; h.t += dt;
    if (h.t >= h.delay && !h.done) {
      h.done = true;
      fxBurst(h.x, h.y, h.kind === 'frog' ? ['#58c838', '#a0f080'] : h.kind === 'star' ? ['#f8d838', '#fff'] : ['#a09080', '#d0c0b0'], 10, 70, .5, 2);
      Aud.sfx('boom'); G.shake = Math.max(G.shake, .12);
      if (dist(p.x, p.y + 3, h.x, h.y) < h.r + 4 && p.inv <= 0 && p.fall <= 0) hurtPlayer(h.dmg, h.x, h.y, {});
      if (h.kind === 'frog') spawnEnemy('frog', h.x, h.y);
      if (h.kind === 'gold') addProj({ x: h.x, y: h.y, vx: 0, vy: 0, kind: 'gold', hostile: true, dmg: 1, life: .05 });
    }
    if (h.t >= h.delay + .15) rm.hazards.splice(i, 1);
  }
}
function drawHazards(c) {
  for (const h of G.room.hazards) {
    if (h.done) continue;
    const f = h.t / h.delay, r = Math.round(h.r * (.4 + .6 * f));
    c.globalAlpha = .35 + .3 * f; c.fillStyle = '#000'; c.fillRect(Math.round(h.x - r), Math.round(h.y - r / 2), r * 2, r);
    c.globalAlpha = 1;
    // falling object
    const fy = Math.round(h.y - (1 - f) * (h.fall || 90));
    if (h.kind === 'frog') { disc(c, '#58c838', Math.round(h.x), fy, 5); R(c, '#f8f838', Math.round(h.x) - 3, fy - 3, 2, 2); R(c, '#f8f838', Math.round(h.x) + 2, fy - 3, 2, 2); }
    else if (h.kind === 'star') { disc(c, '#f8d838', Math.round(h.x), fy, 4); R(c, '#fcfcfc', Math.round(h.x) - 1, fy - 1, 2, 2); R(c, '#f8a038', Math.round(h.x) - 1, fy - 9, 2, 5); }
    else if (h.kind === 'brick') { R(c, '#c05838', Math.round(h.x) - 6, fy - 4, 12, 8); R(c, '#e89870', Math.round(h.x) - 6, fy - 4, 12, 1); R(c, '#802818', Math.round(h.x), fy - 4, 1, 8); }
    else if (h.kind === 'gold') { disc(c, '#f8c838', Math.round(h.x), fy, 4); R(c, '#fff0a0', Math.round(h.x) - 1, fy - 2, 2, 1); }
    else { disc(c, '#807060', Math.round(h.x), fy, 6); disc(c, '#a89888', Math.round(h.x) - 1, fy - 1, 4); }
  }
}

/* ---------------- player ---------------- */
function newPlayer() {
  return {
    isPlayer: true, x: 128, y: 96, hw: 5, hh: 4, oy: 4, dir: 0, anim: 0, hp: 6, max: 6, faith: 10, maxFaith: 10, sword: 0,
    items: {}, shield: false, armor: false, crown: false, sel: null, inv: 0, cool: 0, atk: 0, hitSet: null, confuse: 0, fall: 0, kbt: 0, kbx: 0, kby: 0,
    dove: null, regen: 0, lastSafe: { x: 128, y: 96 }, bump: 0, moving: false
  };
}
function ownedActive() { return ACTIVE_ITEMS.filter(i => G.p.items[i]); }
function cycleItem() {
  const own = ownedActive(); if (!own.length) return;
  const p = G.p, i = own.indexOf(p.sel); p.sel = own[(i + 1) % own.length]; Aud.sfx('select');
}
function hurtPlayer(dmg, sx, sy, src) {
  const p = G.p; if (p.inv > 0 || G.godmode || p.fall > 0 || G.mode !== 'play') return;
  if (p.armor) dmg = Math.max(1, Math.ceil(dmg / 2));
  p.hp -= dmg; p.inv = 1.0; Aud.sfx('hurt'); G.shake = .2;
  const a = Math.atan2(p.y - sy, p.x - sx); p.kbx = Math.cos(a) * 130; p.kby = Math.sin(a) * 130; p.kbt = .14;
  if (src && src.confuse) { p.confuse = 3; fxText(p.x, p.y - 14, '???', '#d898ff'); }
  fxBurst(p.x, p.y, '#f83838', 6, 60, .4, 2);
  if (p.hp <= 0) { p.hp = 0; G.playerDied(); }
}
function healPlayer(n) { const p = G.p; p.hp = Math.min(p.max, p.hp + n); }

function swordStats() { return [{ reach: 11, dmg: 1 }, { reach: 15, dmg: 2 }, { reach: 17, dmg: 3 }][G.p.sword]; }
function swordBox() {
  const p = G.p, s = swordStats(), f = DIRV[p.dir], r = s.reach;
  const cx = p.x + f[0] * (7 + r / 2), cy = p.y + 3 + f[1] * (7 + r / 2);
  return f[0] ? { x: cx, y: cy, hw: r / 2, hh: 7 } : { x: cx, y: cy, hw: 7, hh: r / 2 };
}
let sprayCount = 0;
function trySword() {
  const p = G.p; if (p.cool > 0 || p.atk > 0 || p.fall > 0) return;
  if (p.lamb) { // the Blood of the Lamb: a short spray of crimson-gold light in front of the hero
    p.atk = .2; p.cool = .35; p.hitSet = null; Aud.sfx('magic');
    const f = DIRV[p.dir], base = Math.atan2(f[1], f[0]), id = ++sprayCount;
    for (let i = 0; i < 5; i++) { const a = base + (i - 2) * .16; addProj({ x: p.x + f[0] * 8, y: p.y + 3 + f[1] * 8, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, kind: 'blood', hostile: false, dmg: 3, life: .3, hw: 4, pierce: 1, pass: 1, sprayId: id }); }
    return;
  }
  p.atk = .2; p.cool = .3; p.hitSet = new Set(); Aud.sfx('sword');
  if (p.sword >= 2) {
    const f = DIRV[p.dir];
    addProj({ x: p.x + f[0] * 10, y: p.y + 3 + f[1] * 10, vx: f[0] * 170, vy: f[1] * 170, kind: 'beam', hostile: false, dmg: 3, life: .55, hw: f[0] ? 6 : 2, hh: f[0] ? 2 : 6, pierce: 1 });
  }
}
function updateSwordHit() {
  const p = G.p, rm = G.room, box = swordBox(), s = swordStats();
  for (const e of rm.enemies) if (e.hp > 0 && !e.ghost && !p.hitSet.has(e) && overlap(box, hb(e))) { p.hitSet.add(e); damageEnemy(e, s.dmg, p.x, p.y, 'sword'); }
  if (rm.boss && !rm.boss.dead) for (const part of rm.boss.parts()) if (!p.hitSet.has(part.id || part) && overlap(box, part)) { p.hitSet.add(part.id || part); rm.boss.hit(part, s.dmg, 'sword'); }
  for (const o of rm.projs) if (o.hostile && REFLECTABLE.has(o.kind) && overlap(box, o) && (G.p.sword >= 1 || o.kind !== 'fire')) {
    o.hostile = false; o.vx *= -1.3; o.vy *= -1.3; o.refl = true; o.dmg = Math.max(2, o.dmg); o.life = 2; Aud.sfx('clink'); fxBurst(o.x, o.y, '#fff', 4, 50, .3, 1);
  }
  // tiles: burn bushes with the flaming sword
  if (p.sword >= 1) {
    const x0 = Math.floor((box.x - box.hw) / TS), x1 = Math.floor((box.x + box.hw - .01) / TS), y0 = Math.floor((box.y - box.hh) / TS), y1 = Math.floor((box.y + box.hh - .01) / TS);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (tx < 0 || ty < 0 || tx > 15 || ty > 11) continue;
      if (rm.tiles[ty * 16 + tx] === T.BUSH) { rm.tiles[ty * 16 + tx] = T.FLOOR; fxBurst(tx * 16 + 8, ty * 16 + 8, ['#f83800', '#f8a038', '#f8f038', '#303030'], 14, 70, .6, 2); Aud.sfx('kill'); if (Math.random() < .5) dropAt(tx * 16 + 8, ty * 16 + 8, true); }
    }
  }
  // Serpent's and Leviathan's rooms: each corner statue gives up one heart when slashed (once per visit)
  if (rm.kind === 'dun' && (rm.d === 0 || rm.d === 1) && rm.cell && rm.cell.boss) {
    if (!rm.statueHearts) rm.statueHearts = {};
    for (const [tx, ty] of [[1, 1], [14, 1], [1, 10], [14, 10]]) {
      const k = tx + ',' + ty;
      if (rm.statueHearts[k] || rm.tiles[ty * 16 + tx] !== T.STATUE) continue;
      if (!overlap(box, { x: tx * 16 + 8, y: ty * 16 + 8, hw: 8, hh: 8 })) continue;
      rm.statueHearts[k] = true;
      const hx = tx * 16 + 8 + (tx < 8 ? 16 : -16), hy = ty * 16 + 8 + (ty < 6 ? 16 : -16);
      rm.pickups.push({ x: hx, y: hy, type: 'heart', t: 0 });
      fxBurst(tx * 16 + 8, ty * 16 + 8, ['#fff', '#f8d838', '#a8a8a8'], 10, 60, .5, 2); Aud.sfx('clink');
    }
  }
}

function useItem() {
  const p = G.p, id = p.sel; if (!id || !p.items[id] || p.atk > .12 || p.fall > 0) return;
  const cost = ITEMS[id].cost || 0;
  if (p.faith < cost) { Aud.sfx('clink'); fxText(p.x, p.y - 14, 'NO FAITH', '#58a8f8'); return; }
  const f = DIRV[p.dir], rm = G.room;
  switch (id) {
    case 'testimony': p.faith -= cost; Aud.sfx('magic'); addProj({ x: p.x + f[0] * 8, y: p.y + 3 + f[1] * 8, vx: f[0] * 190, vy: f[1] * 190, kind: 'word', hostile: false, dmg: 1, life: 1.1, hw: 4 }); p.atk = .15; break;
    case 'dove': if (p.dove) return; p.dove = { x: p.x, y: p.y, dir: p.dir, t: 0, back: false }; Aud.sfx('dove'); break;
    case 'bow': p.faith -= cost; Aud.sfx('arrow'); addProj({ x: p.x + f[0] * 8, y: p.y + 3 + f[1] * 8, vx: f[0] * 210, vy: f[1] * 210, kind: 'arrow', hostile: false, dmg: 2, life: 1.5, hw: f[0] ? 5 : 2, hh: f[0] ? 2 : 5 }); p.atk = .15; break;
    case 'sling': p.faith -= cost; Aud.sfx('sling'); addProj({ x: p.x + f[0] * 8, y: p.y + 3 + f[1] * 8, vx: f[0] * 180, vy: f[1] * 180, kind: 'stone', hostile: false, dmg: 3, life: 1.2, hw: 3 }); p.atk = .15; break;
    case 'rod': p.faith -= cost; Aud.sfx('rod'); G.shake = .15; p.atk = .25; rodStrike(); break;
    case 'shofar': p.faith -= cost; Aud.sfx('shofar'); G.shake = .3; rm.rings.push({ x: p.x, y: p.y, r: 4, max: 64, t: 0 }); p.atk = .3; shofarBlast(); break;
  }
}
function rodStrike() {
  const p = G.p, rm = G.room, f = DIRV[p.dir];
  // strip 3 wide, 6 long starting in front of the player
  const sx = Math.floor(p.x / TS), sy = Math.floor((p.y + 3) / TS);
  let parted = 0;
  for (let l = 1; l <= 6; l++) for (let w = -1; w <= 1; w++) {
    const tx = sx + f[0] * l + (f[0] ? 0 : w), ty = sy + f[1] * l + (f[1] ? 0 : w);
    if (tx < 0 || ty < 0 || tx > 15 || ty > 11) continue;
    if (rm.tiles[ty * 16 + tx] === T.WATER) { rm.tiles[ty * 16 + tx] = T.LAND; rm.parted.push({ tx, ty, t: 9 }); parted++; fxBurst(tx * 16 + 8, ty * 16 + 8, ['#58a8f8', '#fcfcfc'], 6, 50, .5, 2); }
  }
  const box = { x: p.x + f[0] * 48, y: p.y + 3 + f[1] * 48, hw: f[0] ? 48 : 22, hh: f[0] ? 22 : 48 };
  rm.rings.push({ x: p.x + f[0] * 10, y: p.y + f[1] * 10 + 3, r: 4, max: 30, t: 0, col: '#c88040' });
  for (const e of rm.enemies) if (e.hp > 0 && overlap(box, hb(e))) { damageEnemy(e, 1, p.x, p.y, 'rod'); e.stun = Math.max(e.stun, 1.2); }
  if (rm.boss && !rm.boss.dead) for (const part of rm.boss.parts()) if (overlap(box, part)) rm.boss.hit(part, 1, 'rod');
  if (parted) fxText(p.x, p.y - 16, 'THE WATERS PART', '#a8d8ff');
}
function shofarBlast() {
  const p = G.p, rm = G.room;
  for (const e of rm.enemies) if (e.hp > 0 && dist(e.x, e.y, p.x, p.y) < 70) { damageEnemy(e, 2, p.x, p.y, 'shofar'); e.stun = Math.max(e.stun, 2); }
  for (const o of rm.projs) if (o.hostile && dist(o.x, o.y, p.x, p.y) < 70) o.life = 0;
  if (rm.boss && !rm.boss.dead && rm.boss.onShofar) rm.boss.onShofar(p);
  let broke = 0;
  for (let ty = 0; ty < 12; ty++) for (let tx = 0; tx < 16; tx++) if (rm.tiles[ty * 16 + tx] === T.CRACK && dist(tx * 16 + 8, ty * 16 + 8, p.x, p.y) < 56) {
    rm.tiles[ty * 16 + tx] = T.PATH; broke++; fxBurst(tx * 16 + 8, ty * 16 + 8, ['#a89878', '#706048', '#d0c0a0'], 12, 80, .8, 2);
  }
  if (broke && rm.kind === 'over') { G.broken[rm.idx] = true; Aud.sfx('boom'); G.shake = .4; G.save(); }
}

function updateDove(dt) {
  const p = G.p, d = p.dove, rm = G.room; if (!d) return;
  d.t += dt;
  if (!d.back) {
    const f = DIRV[d.dir]; d.x += f[0] * 120 * dt; d.y += f[1] * 120 * dt;
    if (d.t > .45 || projBlocked(d.x, d.y)) d.back = true;
  } else {
    const a = Math.atan2(p.y - d.y, p.x - d.x); d.x += Math.cos(a) * 150 * dt; d.y += Math.sin(a) * 150 * dt;
    if (dist(d.x, d.y, p.x, p.y) < 7) { if (d.carry) { d.carry.x = p.x; d.carry.y = p.y; d.carry.carried = false; } p.dove = null; return; }
  }
  const box = { x: d.x, y: d.y, hw: 6, hh: 6 };
  for (const e of rm.enemies) if (e.hp > 0 && !e.ghost && overlap(box, hb(e))) { if (!d.hit) d.hit = new Set(); if (!d.hit.has(e)) { d.hit.add(e); damageEnemy(e, 1, d.x, d.y, 'dove'); e.stun = Math.max(e.stun, 1.6); } }
  if (rm.boss && !rm.boss.dead) for (const part of rm.boss.parts()) if (overlap(box, part)) { if (!d.hit) d.hit = new Set(); const k = part.id || 'b'; if (!d.hit.has(k)) { d.hit.add(k); rm.boss.hit(part, 1, 'dove'); } d.back = true; }
  // the dove grabs the first item it touches (even out over water) and carries it back to the hero
  if (!d.carry) for (const k of rm.pickups) if (!k.carried && dist(k.x, k.y, d.x, d.y) < 10) { d.carry = k; k.carried = true; d.back = true; Aud.sfx('pick'); break; }
  if (d.carry) { d.carry.x = d.x; d.carry.y = d.y + 6; }
  for (const o of rm.projs) if (o.hostile && dist(o.x, o.y, d.x, d.y) < 7 && REFLECTABLE.has(o.kind)) o.life = 0;
}

function updatePlayer(dt) {
  const p = G.p, rm = G.room;
  p.inv = Math.max(0, p.inv - dt); p.cool = Math.max(0, p.cool - dt); p.confuse = Math.max(0, p.confuse - dt); p.bump = Math.max(0, p.bump - dt);
  if (p.atk > 0) { p.atk -= dt; if (p.hitSet) updateSwordHit(); }
  // faith regen
  if (p.faith < p.maxFaith) { p.regen += dt; if (p.regen >= (p.crown ? 1.4 : 2.8)) { p.regen = 0; p.faith++; } } else p.regen = 0;
  if (p.fall > 0) {
    p.fall -= dt;
    if (p.fall <= 0) { p.x = p.lastSafe.x; p.y = p.lastSafe.y; p.inv = 0; hurtPlayer(1, p.x, p.y + 20, {}); p.inv = 1.2; }
    return;
  }
  let mx = Input.dx, my = Input.dy; if (p.confuse > 0) { mx = -mx; my = -my; }
  const busy = G.mode !== 'play';
  p.moving = false;
  // facing follows the newest direction pressed: going diagonal turns the hero (and sword) toward the
  // direction just added, e.g. holding up then adding right faces right
  if (!busy && (mx !== p.lmx || my !== p.lmy)) {
    if (mx && my) p.want = mx !== p.lmx && my === p.lmy ? (mx > 0 ? 3 : 2) : my !== p.lmy && mx === p.lmx ? (my > 0 ? 0 : 1) : (mx > 0 ? 3 : 2);
    else if (mx) p.want = mx > 0 ? 3 : 2; else if (my) p.want = my > 0 ? 0 : 1;
    p.lmx = mx; p.lmy = my;
  }
  if (p.kbt > 0) { p.kbt -= dt; moveEnt(p, p.kbx * dt, p.kby * dt); }
  else if (!busy && (mx || my)) {
    const sp = 68 * (p.horse ? 1.33 : 1) * (p.atk > 0 ? .45 : 1) * (tileAtPx(p.x, p.y + 4) === T.WATER ? .6 : 1), n = mx && my ? .7071 : 1;
    moveEnt(p, mx * sp * n * dt, my * sp * n * dt);
    if (p.atk <= 0 && p.want !== undefined) p.dir = p.want;
    p.moving = true; p.anim += dt;
  }
  if (rm.wind && !busy) { moveEnt(p, rm.wind[0] * dt, rm.wind[1] * dt); }
  if (!busy) {
    if (Input.consume('a')) { if (!tryInteract()) trySword(); }
    if (Input.consume('b')) useItem();
    if (Input.consume('sel')) cycleItem();
  }
  // feet tile
  const tx = Math.floor(p.x / TS), ty = Math.floor((p.y + 4) / TS), tt = (tx < 0 || ty < 0 || tx > 15 || ty > 11) ? T.FLOOR : tileOf(tx, ty);
  if (tt === T.PIT) { p.fall = .7; Aud.sfx('fall'); return; }
  if (tt === T.FIRE && rm.fireOn(tx, ty)) hurtPlayer(2, p.x, p.y + 12, {});
  if (tt === T.SPRING) { p.regen += dt * 3; if (p.hp < p.max || p.faith < p.maxFaith) { G.springT = (G.springT || 0) + dt; if (G.springT > .4) { G.springT = 0; healPlayer(1); p.faith = Math.min(p.maxFaith, p.faith + 1); Aud.sfx('heart'); fxBurst(p.x, p.y, '#a8e8ff', 4, 40, .5, 1); } } }
  if (tt === T.GOLD && !p.goldT) { /* greed is only a lure; coins mimic */ }
  // safe spot tracking
  if (!SOLID.has(tt) && tt !== T.PIT && tt !== T.FIRE && tt !== T.WATER) {
    let safe = true;
    for (const [ox, oy] of [[-9, 0], [9, 0], [0, -9], [0, 9]]) { const q = tileAtPx(p.x + ox, p.y + 4 + oy); if (q === T.PIT || q === T.FIRE) safe = false; }
    if (safe) { p.lastSafe.x = p.x; p.lastSafe.y = p.y; }
  }
  // push-bumps: locked doors, seals, signs, cracks
  if (!busy && (mx || my)) {
    const f = DIRV[p.dir], q = tileAtPx(p.x + f[0] * (p.hw + 3), p.y + 4 + f[1] * (p.hh + 3));
    if ((q === T.DLOCK || q === T.DBOSS || q === T.SEAL || q === T.CRACK || q === T.SIGN || q === T.DSHUT) && p.bump <= 0) { p.bump = .6; G.onBump(Math.floor((p.x + f[0] * (p.hw + 3)) / TS), Math.floor((p.y + 4 + f[1] * (p.hh + 3)) / TS), q); }
  }
  if (tt === T.EXIT) G.onExit();
  if (tt === T.ENTRANCE) G.onEntrance(tx, ty);
  // chest
  const ch = rm.chest;
  if (ch && !ch.open && !busy && dist(p.x, p.y + 4, ch.x, ch.y) < 15) G.openChest(ch);
  // screen edge
  if (!busy) {
    if (p.x < 2 && rm.exits[2]) G.slide(2); else if (p.x > 254 && rm.exits[3]) G.slide(3);
    else if (p.y < 4 && rm.exits[1]) G.slide(1); else if (p.y > 188 && rm.exits[0]) G.slide(0);
  }
}
function tryInteract() { // pressing A facing a sign, or someone to talk to
  const p = G.p, f = DIRV[p.dir], x = p.x + f[0] * 11, y = p.y + 4 + f[1] * 11, rm = G.room;
  if (rm.npcs) {
    const n = rm.npcs.find(n => dist(x, y, n.x, n.y + 4) < 14);
    if (n) { say([npcLine(n)]); Aud.sfx('select'); return true; }
    if (rm.throne && p.dir === 1 && p.y < 72 && Math.abs(p.x - rm.throne.x) < 34) { say(p.crown ? HEAVEN_TEXT.throne.concat(HEAVEN_TEXT.crown) : HEAVEN_TEXT.throne); return true; }
  }
  if (tileAtPx(x, y) === T.SIGN) { G.onBump(Math.floor(x / TS), Math.floor(y / TS), T.SIGN); return true; }
  return false;
}

/* ---------------- the throne room: who is there, and what they say ---------------- */
const NPC_NAMES = { angel: 'AN ANGEL', elder: 'AN ELDER', lion: 'A LIVING CREATURE', ox: 'A LIVING CREATURE', man: 'A LIVING CREATURE', eagle: 'A LIVING CREATURE', lamb: 'THE LAMB' };
function npcLine(n) {
  const list = n.lines || (n.kind === 'angel' ? HEAVEN_LINES.angel : n.kind === 'elder' ? HEAVEN_LINES.elder : HEAVEN_LINES.living);
  const line = list[n.i % list.length]; n.i++;
  return '{' + NPC_NAMES[n.kind] + ':} ' + line;
}
function drawNpc(c, n) {
  const x = Math.round(n.x), y = Math.round(n.y + Math.sin(n.t * 2) * (n.kind === 'angel' ? 1.5 : .5)), w = Math.floor(n.t * 3) % 2;
  c.globalAlpha = .3; R(c, '#000', Math.round(n.x) - 6, Math.round(n.y) + 7, 12, 2); c.globalAlpha = 1;
  const wings = (col, eyes) => { // a pair of wings, opening and closing
    R(c, col, x - 11, y - 7 + w, 5, 10); R(c, col, x - 9, y - 9 + w, 3, 3); R(c, col, x + 7, y - 7 + w, 5, 10); R(c, col, x + 7, y - 9 + w, 3, 3);
    if (eyes) for (const [ex, ey] of [[-10, -4], [-8, 0], [8, -4], [10, 0]]) { R(c, '#fcfcfc', x + ex, y + ey + w, 2, 2); R(c, '#000', x + ex, y + ey + w, 1, 1); } // full of eyes (Revelation 4:8)
  };
  if (n.kind === 'angel') {
    wings('#e0ecff');
    R(c, '#a8b8d8', x - 5, y - 4, 11, 13); R(c, '#fcfcfc', x - 4, y - 4, 9, 12); R(c, '#f8d838', x - 4, y + 1, 9, 1);
    disc(c, '#f8c898', x, y - 7, 3); R(c, '#f8e070', x - 3, y - 10, 7, 2); R(c, '#000', x - 2, y - 7, 1, 1); R(c, '#000', x + 1, y - 7, 1, 1);
    R(c, '#f8d838', x - 4, y - 14, 9, 1); R(c, '#fff8c0', x - 3, y - 15, 7, 1); // halo
  } else if (n.kind === 'elder') {
    R(c, '#806020', x - 8, y - 9, 17, 18); R(c, '#c8a040', x - 7, y - 8, 15, 16); // his seat
    R(c, '#c8c8d8', x - 5, y - 3, 11, 12); R(c, '#fcfcfc', x - 4, y - 3, 9, 11);
    disc(c, '#e8b888', x, y - 6, 3); R(c, '#e8e8e8', x - 2, y - 4, 5, 3); // white beard
    R(c, '#f8d838', x - 3, y - 11, 7, 2); R(c, '#f8d838', x - 3, y - 12, 1, 1); R(c, '#f8d838', x, y - 12, 1, 1); R(c, '#f8d838', x + 3, y - 12, 1, 1); // crown of gold
  } else if (n.kind === 'lamb') {
    disc(c, '#fff8c0', x, y, 10); c.globalAlpha = .5; disc(c, '#fffce8', x, y, 12); c.globalAlpha = 1;
    disc(c, '#d8d8d8', x, y + 1, 6); disc(c, '#fcfcfc', x - 1, y, 5); disc(c, '#fcfcfc', x + 3, y - 1, 4);
    R(c, '#fcfcfc', x + 4, y - 6, 4, 4); R(c, '#000', x + 6, y - 5, 1, 1); R(c, '#c02030', x - 2, y + 1, 2, 2); // as it had been slain (Revelation 5:6)
    R(c, '#a0a0a0', x - 4, y + 5, 2, 3); R(c, '#a0a0a0', x + 3, y + 5, 2, 3);
  } else { // the four living creatures (Revelation 4:7)
    wings('#f0e8d0', true);
    const body = { lion: '#e8a838', ox: '#a87850', man: '#e8b888', eagle: '#806040' }[n.kind];
    R(c, '#605040', x - 5, y - 3, 11, 12); R(c, body, x - 4, y - 3, 9, 11);
    if (n.kind === 'lion') { disc(c, '#a86018', x, y - 6, 5); disc(c, body, x, y - 6, 3); }
    else if (n.kind === 'ox') { disc(c, body, x, y - 6, 4); R(c, '#fcfcfc', x - 6, y - 10, 3, 2); R(c, '#fcfcfc', x + 4, y - 10, 3, 2); }
    else if (n.kind === 'man') { disc(c, body, x, y - 6, 3); R(c, '#806040', x - 3, y - 9, 7, 2); }
    else { disc(c, body, x, y - 6, 4); R(c, '#f8d838', x - 1, y - 4, 3, 2); }
    R(c, '#000', x - 2, y - 7, 1, 1); R(c, '#000', x + 1, y - 7, 1, 1);
  }
}
// the throne itself is only light: "and he that sat was to look upon like a jasper and a sardine stone" (Revelation 4:3)
function drawThrone(c, t) {
  const x = t.x, y = t.y;
  for (let a = 0; a <= 40; a++) { // a rainbow round about the throne, in sight like unto an emerald
    const ang = Math.PI + a / 40 * Math.PI;
    ['#a8f0c8', '#38c870', '#58e890'].forEach((col, i) => R(c, col, Math.round(x + Math.cos(ang) * (28 + i)), Math.round(y + 2 + Math.sin(ang) * (22 + i)), 2, 2));
  }
  R(c, '#806020', x - 15, y - 16, 30, 28); R(c, '#e8c048', x - 13, y - 14, 26, 24); R(c, '#f8e070', x - 13, y - 14, 26, 2);
  R(c, '#c02030', x - 2, y - 11, 4, 4); R(c, '#38c870', x - 10, y - 8, 3, 3); R(c, '#38c870', x + 7, y - 8, 3, 3); // jasper, sardine and emerald
  R(c, '#806020', x - 17, y + 6, 34, 8); R(c, '#e8c048', x - 16, y + 6, 32, 6);
  const k = .55 + .25 * Math.sin(G.t * 2.4);
  c.globalAlpha = k * .6; disc(c, '#fff8c0', x, y, 16); c.globalAlpha = k; disc(c, '#fffce8', x, y, 10); c.globalAlpha = 1; disc(c, '#fcfcfc', x, y, 6);
  for (let i = 0; i < 6; i++) { const a = G.t * .8 + i * 1.047; R(c, '#fff8c0', Math.round(x + Math.cos(a) * 20), Math.round(y + Math.sin(a) * 14), 2, 2); }
}
// Jacob's ladder: a stairway of light, with angels going up and down it (Genesis 28:12)
function drawLadder(c, L) {
  const x = Math.round(L.x), y = Math.round(L.y);
  c.globalAlpha = .35 + .1 * Math.sin(G.t * 3); R(c, '#fff8c0', x - 11, 0, 22, y + 10); c.globalAlpha = 1;
  R(c, '#c8a040', x - 8, 0, 2, y + 10); R(c, '#c8a040', x + 6, 0, 2, y + 10);
  for (let ry = y + 6 - Math.floor((G.t * 10) % 8); ry > 0; ry -= 8) R(c, '#f8e070', x - 6, ry, 12, 1);
  for (let i = 0; i < 2; i++) { const ay = Math.round(i ? (G.t * 30) % (y + 10) : y + 10 - (G.t * 24) % (y + 10)); R(c, '#fcfcfc', x - 2 + i * 3, ay, 2, 3); R(c, '#f8d838', x - 2 + i * 3, ay - 2, 2, 1); }
}

function drawPlayer(c) {
  const p = G.p; if (p.fall > 0) { const s = p.fall / .7; c.save(); c.translate(Math.round(p.x), Math.round(p.y + 4)); c.scale(s, s); c.drawImage(playerSprite(p.dir, 0), -8, -12); c.restore(); return; }
  const fr = p.moving ? (Math.floor(p.anim * 8) % 2) : 0;
  let img = playerSprite(p.dir, fr, p.armor ? { o: '#181018', a: '#e8f0ff', b: '#a05820', c: '#f8b878' } : null);
  if (p.inv > 0 && Math.floor(p.inv * 20) % 2 === 0 && p.kbt <= 0) return drawSwordFx(c);
  if (p.dir === 1) drawSwordFx(c);
  if (p.horse) { drawHorse(c, p); c.drawImage(img, Math.round(p.x - 8), Math.round(p.y - 14)); } else
  c.drawImage(img, Math.round(p.x - 8), Math.round(p.y - 8));
  if (p.shield) { const f = DIRV[p.dir]; if (p.dir === 0 || p.dir === 2 || p.dir === 3) { const sx = p.x + (p.dir === 2 ? -9 : p.dir === 3 ? 4 : -3), sy = p.y + 1; R(c, '#58a8f8', Math.round(sx), Math.round(sy), 5, 6); R(c, '#fcfcfc', Math.round(sx), Math.round(sy), 5, 1); R(c, '#f8d838', Math.round(sx) + 2, Math.round(sy) + 1, 1, 4); } }
  if (p.dir !== 1) drawSwordFx(c);
  if (p.confuse > 0) { for (let i = 0; i < 3; i++) { const a = G.t * 6 + i * 2.1; R(c, '#d898ff', Math.round(p.x + Math.cos(a) * 7), Math.round(p.y - 12 + Math.sin(a) * 2), 2, 2); } }
  if (p.dove) { const d = p.dove; c.drawImage(icon('dove'), Math.round(d.x - 8), Math.round(d.y - 8 + Math.sin(d.t * 30) * 1.5)); }
}
function drawHorse(c, p) { // white horse (Revelation 19:14), drawn under the rider
  const x = Math.round(p.x), y = Math.round(p.y), side = p.dir === 2 ? -1 : 1, step = p.moving ? Math.floor(p.anim * 10) % 2 : 0, o = '#606878', w = '#fcfcfc', s = '#d8dce8';
  if (p.dir === 2 || p.dir === 3) {
    R(c, o, x - 10, y - 2, 20, 9); R(c, w, x - 9, y - 1, 18, 7); R(c, s, x - 9, y + 4, 18, 2);
    R(c, o, x + side * 9 - 2, y - 7, 5, 8); R(c, w, x + side * 9 - 1, y - 6, 3, 7); R(c, w, x + side * 11 - (side < 0 ? 3 : 0), y - 6, 4, 3); R(c, '#000', x + side * 12, y - 5, 1, 1);
    R(c, '#f8d838', x - side * 10 - (side > 0 ? 2 : 0), y - 1, 3, 5); // tail
    for (const lx of [-7, -4, 4, 7]) R(c, s, x + lx, y + 6, 2, 4 + ((lx > 0) === !!step ? 1 : 0));
  } else {
    R(c, o, x - 6, y - 4, 12, 13); R(c, w, x - 5, y - 3, 10, 11); R(c, s, x - 5, y + 6, 10, 2);
    if (p.dir === 0) { R(c, w, x - 2, y + 6, 4, 5); R(c, '#000', x - 2, y + 7, 1, 1); R(c, '#000', x + 1, y + 7, 1, 1); } else R(c, '#f8d838', x - 1, y + 7, 2, 4);
    for (const lx of [-5, 3]) R(c, s, x + lx, y + 8, 2, 3 + (step ? 1 : 0));
  }
}
function drawSwordFx(c) {
  const p = G.p; if (p.atk <= 0 || p.lamb) return;
  const s = swordStats(), t = 1 - p.atk / .2, ext = 3 + Math.sin(Math.min(1, t) * Math.PI) * s.reach, f = DIRV[p.dir];
  const col = p.sword === 0 ? ['#a05820', '#c88040'] : p.sword === 1 ? ['#ff8030', '#ffe060'] : ['#a8f0ff', '#fcfcfc'];
  const bx = p.x + f[0] * 6, by = p.y + 3 + f[1] * 6, e = Math.round(ext);
  if (f[0]) { const x0 = f[0] > 0 ? bx : bx - e; R(c, col[0], Math.round(x0), Math.round(by) - 1, e, 3); R(c, col[1], Math.round(x0), Math.round(by), e, 1); R(c, '#c8a838', Math.round(f[0] > 0 ? bx : bx - 1), Math.round(by) - 3, 1, 7); }
  else { const y0 = f[1] > 0 ? by : by - e; R(c, col[0], Math.round(bx) - 1, Math.round(y0), 3, e); R(c, col[1], Math.round(bx), Math.round(y0), 1, e); R(c, '#c8a838', Math.round(bx) - 3, Math.round(f[1] > 0 ? by : by - 1), 7, 1); }
  if (p.sword >= 1 && Math.random() < .6) R(c, col[1], Math.round(bx + f[0] * ext + rnd(-2, 2)), Math.round(by + f[1] * ext + rnd(-2, 2)), 1, 1);
}

/* ---------------- enemies ---------------- */
function spawnEnemy(id, x, y, opts) {
  const def = ENEMY[id]; opts = opts || {};
  const r = def.r || 6, mini = !!opts.mini;
  const e = {
    id, def, x, y, hw: mini ? 11 : r, hh: mini ? 11 : r, oy: 1, hp: def.hp * (mini ? 4 : 1), max: def.hp * (mini ? 4 : 1), t: rnd(0, 3), fly: !!def.fly,
    stun: 0, flash: 0, kbt: 0, kbx: 0, kby: 0, think: 0, dx: 0, dy: 0, st: 0, st2: 0, mini, awake: def.beh !== 'ambush' && def.beh !== 'mimic', shootT: rnd(.8, def.shoot ? def.shoot.rate : 2), spawn: .35, ghost: false, summoned: !!opts.summoned
  };
  if (def.beh === 'teleporter') { e.st = 0; e.st2 = rnd(0, 1); }
  G.room.enemies.push(e); return e;
}
function damageEnemy(e, dmg, sx, sy, src) {
  if (e.hp <= 0 || e.ghost) return;
  if (!e.awake && e.def.beh === 'mimic') { e.awake = true; e.st = 0; }
  if (e.def.beh === 'ambush') e.awake = true;
  e.hp -= dmg; e.flash = .16; Aud.sfx('hit');
  if (!e.mini || src !== 'dove') { const a = Math.atan2(e.y - sy, e.x - sx), k = e.mini ? 60 : 130; e.kbx = Math.cos(a) * k; e.kby = Math.sin(a) * k; e.kbt = .12; }
  if (src === 'sword' && G.p.sword >= 1) e.burn = 1.0;
  fxBurst(e.x, e.y, '#fff', 3, 50, .25, 1);
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  const rm = G.room; Aud.sfx('kill');
  fxBurst(e.x, e.y, [e.def.pal.a, e.def.pal.b, '#fff'], e.mini ? 24 : 12, 80, .6, 2);
  if (e.def.split) { for (let i = 0; i < 2; i++) { const s = spawnEnemy(e.def.split, e.x + (i ? 6 : -6), e.y); s.spawn = .1; s.summoned = true; s.kbx = (i ? 1 : -1) * 90; s.kbt = .15; } }
  dropAt(e.x, e.y, e.mini);
  const i = rm.enemies.indexOf(e); if (i >= 0) rm.enemies.splice(i, 1);
}
function dropAt(x, y, good) {
  const r = Math.random(), rm = G.room, hurt = G.p.hp < G.p.max;
  if (good || r < (hurt ? .26 : .12)) rm.pickups.push({ x, y, type: 'heart', t: 0, ttl: good ? 99 : 9 });
  else if (r < .45) rm.pickups.push({ x, y, type: 'faith', t: 0, ttl: 8 });
}
function collectPickup(k) {
  const p = G.p;
  switch (k.type) {
    case 'heart': healPlayer(2); Aud.sfx('heart'); fxText(k.x, k.y - 8, '+1', '#f88'); break;
    case 'faith': p.faith = Math.min(p.maxFaith, p.faith + 3); Aud.sfx('pick'); fxText(k.x, k.y - 8, '+3', '#8cf'); break;
    case 'key': G.ds[G.loc.d].keys++; if (k.roomKey) G.ds[G.loc.d].taken[k.roomKey] = true; Aud.sfx('key'); fxText(k.x, k.y - 8, 'KEY', '#ff8'); break;
    case 'container': G.onContainer(k); break;
    case 'light': if (G.room.boss && G.room.boss.onLight) G.room.boss.onLight(); Aud.sfx('magic'); break;
  }
}
function updatePickups(dt) {
  const rm = G.room, p = G.p;
  for (let i = rm.pickups.length - 1; i >= 0; i--) {
    const k = rm.pickups[i]; k.t += dt;
    if (k.ttl !== undefined && k.t > k.ttl && !k.carried) { rm.pickups.splice(i, 1); continue; }
    if (dist(k.x, k.y, p.x, p.y + 3) < 11 && p.fall <= 0) { collectPickup(k); rm.pickups.splice(i, 1); }
  }
}
function drawPickups(c) {
  for (const k of G.room.pickups) {
    const bob = Math.round(Math.sin(k.t * 6) * 1.5), x = Math.round(k.x), y = Math.round(k.y) + bob;
    if (k.ttl !== undefined && k.ttl - k.t < 2 && Math.floor(k.t * 10) % 2) continue;
    c.globalAlpha = .4; R(c, '#000', x - 3, Math.round(k.y) + 5, 7, 2); c.globalAlpha = 1;
    if (k.type === 'heart') c.drawImage(heartImg(2), x - 4, y - 4);
    else if (k.type === 'faith') c.drawImage(icon('faith'), x - 8, y - 8);
    else if (k.type === 'key') c.drawImage(icon('key'), x - 8, y - 8);
    else if (k.type === 'container') { const s = 2; c.save(); c.translate(x, y); c.scale(s, s); c.drawImage(heartImg(2), -4, -4); c.restore(); if (Math.floor(k.t * 6) % 2) R(c, '#fff', x + 6, y - 8, 2, 2); }
    else if (k.type === 'light') { disc(c, 'rgba(255,255,200,.4)', x, y, 8); disc(c, '#fff8c0', x, y, 4); disc(c, '#fff', x, y, 2); }
  }
}

function updateEnemy(e, dt) {
  const p = G.p, def = e.def, rm = G.room;
  e.t += dt; if (e.flash > 0) e.flash -= dt; if (e.spawn > 0) { e.spawn -= dt; return; }
  if (e.burn > 0) e.burn -= dt;
  if (e.kbt > 0) { e.kbt -= dt; moveEnt(e, e.kbx * dt, e.kby * dt); return; }
  if (e.stun > 0) { e.stun -= dt; return; }
  const px = p.x, py = p.y + 3, dx = px - e.x, dy = py - e.y, d = Math.hypot(dx, dy) || 1;
  let sp = def.spd, vx = 0, vy = 0;
  const wander = (toward) => {
    e.think -= dt;
    if (e.think <= 0) {
      e.think = rnd(.5, 1.4);
      if (Math.random() < toward && d < 110) { if (Math.abs(dx) > Math.abs(dy)) { e.dx = sgn(dx); e.dy = 0; } else { e.dx = 0; e.dy = sgn(dy); } }
      else { const dd = pick(DIRV); e.dx = dd[0]; e.dy = dd[1]; if (Math.random() < .2) { e.dx = 0; e.dy = 0; } }
    }
    vx = e.dx * sp; vy = e.dy * sp;
  };
  const toward = (m) => { vx = dx / d * sp * (m || 1); vy = dy / d * sp * (m || 1); };
  switch (def.beh) {
    case 'wander': wander(.35); break;
    case 'chase': if (d < 150) toward(); else wander(.1); break;
    case 'ambush': if (!e.awake) { if (d < 46) { e.awake = true; fxBurst(e.x, e.y, '#f83838', 4, 40, .3, 1); } } else toward(); break;
    case 'erratic':
      e.think -= dt; if (e.think <= 0) { e.think = rnd(.25, .6); const a = Math.random() < .4 ? Math.atan2(dy, dx) : Math.random() * 6.283; e.dx = Math.cos(a); e.dy = Math.sin(a); }
      vx = e.dx * sp; vy = e.dy * sp; break;
    case 'swoop':
      if (e.st === 0) { e.think -= dt; wander(0); vx *= .5; vy *= .5; if (e.think < 0 || e.t % 2.2 < dt) { } if (e.t - e.st2 > 1.6 && d < 130) { e.st = 1; e.st2 = e.t; e.dx = dx / d; e.dy = dy / d; } }
      else if (e.st === 1) { vx = e.dx * sp * 2.2; vy = e.dy * sp * 2.2; if (e.t - e.st2 > .7) { e.st = 0; e.st2 = e.t; } }
      break;
    case 'float': toward(.9); break;
    case 'phase': e.noclip = true; toward(.9); break;
    case 'shooter': {
      if (d < 56) { vx = -dx / d * sp; vy = -dy / d * sp; } else if (d > 105) toward(.8); else wander(0);
      break;
    }
    case 'charge':
      if (e.st === 0) { wander(.3); vx *= .6; vy *= .6; if (d < 140 && (Math.abs(dx) < 8 || Math.abs(dy) < 8) && e.t - e.st2 > 1.2) { e.st = 1; e.st2 = e.t; if (Math.abs(dx) < 8) { e.dx = 0; e.dy = sgn(dy); } else { e.dx = sgn(dx); e.dy = 0; } } }
      else if (e.st === 1) { if (e.t - e.st2 > .45) { e.st = 2; e.st2 = e.t; } }
      else if (e.st === 2) { vx = e.dx * sp * 3.2; vy = e.dy * sp * 3.2; if (e.t - e.st2 > .75) { e.st = 3; e.st2 = e.t; } }
      else { if (e.t - e.st2 > .6) { e.st = 0; e.st2 = e.t; } }
      break;
    case 'hop': case 'hopshoot':
      if (e.st === 0) { if (e.t - e.st2 > 1.1) { e.st = 1; e.st2 = e.t; e.dx = dx / d; e.dy = dy / d; } }
      else { vx = e.dx * sp; vy = e.dy * sp; e.hop = Math.sin((e.t - e.st2) / .4 * Math.PI) * 6; if (e.t - e.st2 > .4) { e.st = 0; e.st2 = e.t; e.hop = 0; } }
      break;
    case 'teleporter': {
      const ph = e.t - e.st2;
      if (e.st === 0) { e.ghost = false; if (ph > 2.4) { e.st = 1; e.st2 = e.t; } }
      else if (e.st === 1) { e.ghost = true; if (ph > .4) { // reappear elsewhere
        for (let tries = 0; tries < 20; tries++) { const nx = rnd(32, 224), ny = rnd(32, 160); if (dist(nx, ny, px, py) > 56 && !boxHitsSolid(e, nx, ny + 1)) { e.x = nx; e.y = ny; break; } }
        e.st = 0; e.st2 = e.t; e.ghost = false; e.shootT = .6; fxBurst(e.x, e.y, def.pal.a, 6, 40, .3, 1);
      } }
      break;
    }
    case 'mimic':
      if (!e.awake) { if (d < 30) { e.awake = true; fxBurst(e.x, e.y, '#fff', 6, 50, .3, 1); Aud.sfx('clink'); } } else toward(1.2);
      break;
  }
  if (e.awake !== false && (vx || vy)) { const bl = moveEnt(e, vx * dt, vy * dt); if (bl) { e.think = 0; if (def.beh === 'charge' && e.st === 2) { e.st = 3; e.st2 = e.t; G.shake = Math.max(G.shake, .1); } } }
  // shooting
  if (def.shoot && e.awake && !e.ghost) {
    e.shootT -= dt;
    if (e.shootT <= 0 && d < 150 && (def.beh !== 'hopshoot' || e.st === 0)) {
      e.shootT = def.shoot.rate * rnd(.8, 1.2);
      const n = def.shoot.n || 1;
      for (let i = 0; i < n; i++) shootAt(e.x, e.y, px, py, def.shoot.spd, def.shoot.kind, 1, n > 1 ? (i - (n - 1) / 2) * (def.shoot.spread || .3) : rnd(-.08, .08));
      Aud.sfx('spit');
    }
  }
  // contact
  if (e.awake && !e.ghost && p.inv <= 0 && overlap(hb(e), hb(p)) && p.fall <= 0) hurtPlayer(def.dmg, e.x, e.y, def);
}
function drawEnemy(c, e) {
  const def = e.def, x = Math.round(e.x), y = Math.round(e.y);
  if (e.ghost && def.beh === 'teleporter') { if (e.st === 1) { c.globalAlpha = Math.max(0, .5 - (e.t - e.st2) * 3); } }
  let fr = Math.floor(e.t * 4) % 2;
  let img = sprite(def.shape, def.pal, e.awake === false ? 0 : fr);
  const bob = def.fly ? Math.round(Math.sin(e.t * 6) * 1.5) - 2 : -(e.hop || 0);
  if (def.fly || e.hop) { c.globalAlpha = (c.globalAlpha || 1) * .35; R(c, '#000', x - 4, y + 6, 8, 2); c.globalAlpha = e.ghost ? c.globalAlpha : 1; }
  if (e.flash > 0) img = flashed(img);
  else if (e.stun > 0) img = tinted(img, 'rgba(120,180,255,.55)');
  else if (def.beh === 'charge' && e.st === 1 && Math.floor(e.t * 20) % 2) img = flashed(img);
  else if (e.burn > 0 && Math.floor(e.t * 20) % 2) img = tinted(img, 'rgba(255,120,0,.5)');
  if (e.spawn > 0) c.globalAlpha = .5;
  if (e.mini) { c.save(); c.translate(x, y + bob); c.scale(2, 2); c.drawImage(img, -8, -8); c.restore(); }
  else c.drawImage(img, x - 8, y - 8 + bob);
  c.globalAlpha = 1;
  if (e.mini) { // mini boss health pip
    const w = 22, f = e.hp / e.max; R(c, '#000', x - w / 2 - 1, y - 18, w + 2, 4); R(c, '#601018', x - w / 2, y - 17, w, 2); R(c, '#f83838', x - w / 2, y - 17, Math.ceil(w * f), 2);
  }
}
