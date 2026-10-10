'use strict';
/* ===== Dominion Restored :: gfx (font, sprites, tiles, icons) ===== */

/* ---- 5x7 pixel font (column-major, bit0 = top) ---- */
const FONT = {
  ' ': [0, 0, 0, 0, 0], '!': [0, 0, 0x5F, 0, 0], '"': [0, 7, 0, 7, 0], "'": [0, 4, 3, 0, 0], '(': [0, 0x1C, 0x22, 0x41, 0], ')': [0, 0x41, 0x22, 0x1C, 0],
  '*': [0x2A, 0x1C, 0x7F, 0x1C, 0x2A], '+': [8, 8, 0x3E, 8, 8], ',': [0, 0x80, 0x70, 0x30, 0], '-': [8, 8, 8, 8, 8], '.': [0, 0, 0x60, 0x60, 0],
  '/': [0x20, 0x10, 8, 4, 2], '0': [0x3E, 0x51, 0x49, 0x45, 0x3E], '1': [0, 0x42, 0x7F, 0x40, 0], '2': [0x72, 0x49, 0x49, 0x49, 0x46],
  '3': [0x21, 0x41, 0x49, 0x4D, 0x33], '4': [0x18, 0x14, 0x12, 0x7F, 0x10], '5': [0x27, 0x45, 0x45, 0x45, 0x39], '6': [0x3C, 0x4A, 0x49, 0x49, 0x31],
  '7': [0x41, 0x21, 0x11, 9, 7], '8': [0x36, 0x49, 0x49, 0x49, 0x36], '9': [0x46, 0x49, 0x49, 0x29, 0x1E], ':': [0, 0, 0x14, 0, 0], ';': [0, 0x40, 0x34, 0, 0],
  '<': [8, 0x14, 0x22, 0x41, 0], '=': [0x14, 0x14, 0x14, 0x14, 0x14], '>': [0, 0x41, 0x22, 0x14, 8], '?': [2, 1, 0x51, 9, 6], '%': [0x23, 0x13, 8, 0x64, 0x62],
  '&': [0x36, 0x49, 0x56, 0x20, 0x50], '_': [0x40, 0x40, 0x40, 0x40, 0x40], '#': [0x14, 0x7F, 0x14, 0x7F, 0x14],
  A: [0x7C, 0x12, 0x11, 0x12, 0x7C], B: [0x7F, 0x49, 0x49, 0x49, 0x36], C: [0x3E, 0x41, 0x41, 0x41, 0x22], D: [0x7F, 0x41, 0x41, 0x41, 0x3E],
  E: [0x7F, 0x49, 0x49, 0x49, 0x41], F: [0x7F, 9, 9, 9, 1], G: [0x3E, 0x41, 0x41, 0x51, 0x73], H: [0x7F, 8, 8, 8, 0x7F], I: [0, 0x41, 0x7F, 0x41, 0],
  J: [0x20, 0x40, 0x41, 0x3F, 1], K: [0x7F, 8, 0x14, 0x22, 0x41], L: [0x7F, 0x40, 0x40, 0x40, 0x40], M: [0x7F, 2, 0x1C, 2, 0x7F], N: [0x7F, 4, 8, 0x10, 0x7F],
  O: [0x3E, 0x41, 0x41, 0x41, 0x3E], P: [0x7F, 9, 9, 9, 6], Q: [0x3E, 0x41, 0x51, 0x21, 0x5E], R: [0x7F, 9, 0x19, 0x29, 0x46], S: [0x26, 0x49, 0x49, 0x49, 0x32],
  T: [3, 1, 0x7F, 1, 3], U: [0x3F, 0x40, 0x40, 0x40, 0x3F], V: [0x1F, 0x20, 0x40, 0x20, 0x1F], W: [0x3F, 0x40, 0x38, 0x40, 0x3F], X: [0x63, 0x14, 8, 0x14, 0x63],
  Y: [3, 4, 0x78, 4, 3], Z: [0x61, 0x51, 0x49, 0x45, 0x43]
};
const _glyphs = {};
function glyph(ch, col, sh) {
  const key = ch + col + (sh || '');
  let g = _glyphs[key]; if (g) return g;
  g = document.createElement('canvas'); g.width = 7; g.height = 9;
  const c = g.getContext('2d'), d = FONT[ch] || FONT['?'];
  for (let pass = sh ? 0 : 1; pass < 2; pass++) {
    c.fillStyle = pass === 0 ? sh : col; const o = pass === 0 ? 1 : 0;
    for (let x = 0; x < 5; x++) for (let y = 0; y < 7; y++) if (d[x] >> y & 1) c.fillRect(x + o, y + o, 1, 1);
  }
  return _glyphs[key] = g;
}
function text(c, s, x, y, col, sh) {
  s = String(s).toUpperCase(); col = col || '#fcfcfc'; if (sh === undefined) sh = '#000';
  for (let i = 0; i < s.length; i++) c.drawImage(glyph(s[i], col, sh), x + i * 6, y);
}
const textW = s => String(s).length * 6;
function textC(c, s, cx, y, col, sh) { text(c, s, Math.round(cx - textW(s) / 2), y, col, sh); }
function textBig(c, s, cx, y, col, sh, sc) {
  s = String(s).toUpperCase(); sc = sc || 2; const w = s.length * 6 * sc;
  c.save(); c.translate(Math.round(cx - w / 2), y); c.scale(sc, sc); text(c, s, 0, 0, col, sh); c.restore();
}
function wrapText(s, max) {
  const out = []; let line = '';
  for (const w of String(s).toUpperCase().split(' ')) {
    if (!line) line = w; else if ((line + ' ' + w).length <= max) line += ' ' + w; else { out.push(line); line = w; }
  }
  if (line) out.push(line); return out;
}

/* ---- small canvas helpers ---- */
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function disc(c, col, cx, cy, r) {
  c.fillStyle = col;
  for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r + r * .5 - y * y)); c.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1); }
}
function R(c, col, x, y, w, h) { c.fillStyle = col; c.fillRect(x, y, w === undefined ? 1 : w, h === undefined ? 1 : h); }

/* ---- sprite shapes: half rows (8 chars) mirrored to 16x16 ---- */
const SHAPES = {
  blob: ['........', '........', '........', '....1111', '..112222', '.1222222', '.1224222', '12255222', '12266222', '12222222', '12222222', '12233322', '.1233332', '.1123333', '..111111', '........'],
  snake: ['........', '....1111', '...12222', '..122222', '.1225522', '.1226622', '.1222222', '..122222', '...12224', '...12224', '..122224', '..122334', '.1223334', '.1233334', '..113333', '...11111'],
  bat: ['........', '........', '1.....1.', '11...121', '1211.122', '12221252', '12222122', '12232222', '.1223222', '.1.12322', '...11222', '....1221', '.....111', '........', '........', '........'],
  beast: ['........', '..11....', '.1221...', '.1221111', '.1222221', '12222222', '12255222', '12266222', '12222222', '12224444', '12224446', '.1224444', '.1222233', '..122333', '...11111', '........'],
  human: ['........', '....1111', '...13333', '..133333', '..134444', '..144644', '..144444', '...14444', '..132222', '.1322222', '.1322222', '.1433333', '..122222', '...1221.', '...1221.', '..11221.'],
  ghost: ['........', '....1111', '...12222', '..122222', '.1222222', '.1255222', '.1266222', '.1222222', '.1222222', '.1222222', '.1222222', '.1223222', '.122.122', '.12..12.', '.1....1.', '........'],
  flame: ['........', '.......1', '......12', '......12', '.....122', '....1222', '....1222', '...12224', '..125244', '..122444', '..124444', '..124444', '..122444', '...12244', '....1122', '.....111'],
  thorn: ['........', '...1..1.', '..121121', '.1222222', '12222222', '12244222', '12244222', '12222222', '12232322', '12222222', '12223222', '12222222', '.1222322', '..122222', '...11122', '........'],
  bug: ['........', '........', '..1.....', '...1.111', '..1.1222', '..112252', '.1.12222', '1.133333', '13333333', '13333433', '13333333', '1.133333', '..113333', '..1.1133', '....1.11', '........'],
  skull: ['........', '....1111', '...12222', '..122222', '.1222222', '.1255222', '.1266222', '.1222222', '..122212', '..122222', '...12121', '...11111', '....1221', '...12222', '..122223', '..111111'],
  coin: ['........', '........', '........', '........', '....1111', '..112222', '.1224422', '.1244222', '12422222', '12422222', '12222222', '12222222', '.1222222', '..112222', '....1111', '........'],
  stone: ['........', '........', '........', '........', '....1111', '..113322', '.1233222', '.1222222', '12222222', '12222322', '12222222', '12232222', '.1222222', '..112222', '....1111', '........'],
  imp: ['........', '.1....1.', '.11..11.', '..1221..', '..122222', '.1225522', '.1226622', '.1222222', '..122222', '..122222', '.1122322', '1.122222', '..132222', '..12..12', '..13..13', '..11..11']
};
const PLAYER_DOWN = ['........', '....1111', '...13333', '..133333', '..134444', '..144644', '..144444', '...14444', '..132222', '.1322222', '.1422222', '..133333', '..122222', '...1441.', '...1441.', '..13331.'];
const PLAYER_UP = ['........', '....1111', '...13333', '..133333', '..133333', '..133333', '..133333', '...13333', '..132222', '.1322222', '.1422222', '..133333', '..122222', '...1441.', '...1441.', '..13331.'];
const PLAYER_SIDE = [
  ['................', '................', '.....1111111....', '....133333331...', '...13333333331..', '...13333344441..', '...13333446441..', '...13333444441..', '....133344441...', '.....11144411...', '....13222221....', '...1322222221...', '...1322222221...', '...1333333331...', '...1222222221...', '....122..221....', '....144..441....', '....133..331....'],
  ['................', '................', '.....1111111....', '....133333331...', '...13333333331..', '...13333344441..', '...13333446441..', '...13333444441..', '....133344441...', '.....11144411...', '....13222221....', '...1322222221...', '...1322222221...', '...1333333331...', '...1222222221...', '.....1222221....', '.....1444441....', '.....1333331....']
].map(a => a.slice(2)); // 16 rows

const _spr = {};
function palMap(p) { return { 1: p.o || '#181018', 2: p.a, 3: p.b, 4: p.c, 5: '#fcfcfc', 6: '#101018', 7: p.d || '#f8f8f8' }; }
function bakeRows(rows, p, sym, frame, legs) {
  const cv = mk(16, 16), c = cv.getContext('2d'), m = palMap(p);
  const grid = [];
  for (let y = 0; y < 16; y++) {
    const row = rows[y]; grid.push([]);
    for (let x = 0; x < 16; x++) {
      const ch = sym ? (x < 8 ? row[x] : row[15 - x]) : row[x];
      grid[y].push(ch);
    }
  }
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    let ch = grid[y][x], yy = y;
    if (frame === 1 && legs && y >= 16 - legs) { // alternate leg lift by shifting halves
      const src = x < 8 ? (y + 1 < 16 ? grid[y + 1][x] : '.') : grid[y - 1][x];
      ch = src; if (!ch) ch = '.';
    }
    if (ch !== '.' && m[ch]) { c.fillStyle = m[ch]; c.fillRect(x, yy, 1, 1); }
  }
  return cv;
}
function sprite(shape, pal, frame, legs) {
  const key = shape + '|' + pal.a + pal.b + pal.c + (pal.o || '') + (pal.d || '') + '|' + frame;
  if (_spr[key]) return _spr[key];
  const rows = SHAPES[shape];
  return _spr[key] = bakeRows(rows, pal, true, frame, legs === undefined ? (shape === 'human' || shape === 'beast' ? 3 : 0) : legs);
}
const PLAYER_PAL = { o: '#181018', a: '#4a7cf0', b: '#a05820', c: '#f8b878' };
/* the hero's looks, picked on the title screen: tunic (a), hair (b), skin (c), and short or long hair */
const HERO_LOOKS = [
  { pal: PLAYER_PAL, long: false },
  { pal: { o: '#181018', a: '#d04848', b: '#3a2418', c: '#c88858' }, long: true },
  { pal: { o: '#181018', a: '#3a9a48', b: '#e8c048', c: '#f8c8a0' }, long: true },
  { pal: { o: '#181018', a: '#8858c8', b: '#201418', c: '#8a5a38' }, long: false },
];
const HeroLook = {
  key: 'dominion-restored-look',
  get() { try { const v = +localStorage.getItem(this.key); return v >= 0 && v < HERO_LOOKS.length ? v : 0; } catch (e) { return 0; } },
  set(v) { try { localStorage.setItem(this.key, String(v)); } catch (e) { } },
};
// long hair frames the face, falls over the shoulders and down the back
const withRows = (rows, rep) => rows.map((r, i) => rep[i] || r);
const PLAYER_DOWN_LONG = withRows(PLAYER_DOWN, { 4: '.1334444', 5: '.1344644', 6: '.1344444', 7: '.1334444', 8: '.1332222', 9: '.1332222' });
const PLAYER_UP_LONG = withRows(PLAYER_UP, { 4: '.1333333', 5: '.1333333', 6: '.1333333', 7: '.1333333', 8: '.1333333', 9: '.1323333', 10: '.1422333' });
const PLAYER_SIDE_LONG = PLAYER_SIDE.map(f => withRows(f, { 6: '...1333344441...', 7: '...1333114411...', 8: '...133322221....', 9: '...1332222221...' }));
function playerSprite(dir, frame, pal, look) {
  if (look === undefined) look = (typeof G !== 'undefined' && G.p && G.p.look) || 0;
  const L = HERO_LOOKS[look] || HERO_LOOKS[0];
  pal = Object.assign({}, L.pal, pal || {}); // e.g. the Armor of Light only changes the tunic
  const key = 'P' + dir + frame + pal.a + pal.b + pal.c + (L.long ? 'L' : '');
  if (_spr[key]) return _spr[key];
  let cv;
  if (dir === 0) cv = bakeRows(L.long ? PLAYER_DOWN_LONG : PLAYER_DOWN, pal, true, frame, 3);
  else if (dir === 1) cv = bakeRows(L.long ? PLAYER_UP_LONG : PLAYER_UP, pal, true, frame, 3);
  else {
    cv = bakeRows((L.long ? PLAYER_SIDE_LONG : PLAYER_SIDE)[frame].concat([]), pal, false, 0, 0);
    if (dir === 2) { const f = mk(16, 16), c = f.getContext('2d'); c.translate(16, 0); c.scale(-1, 1); c.drawImage(cv, 0, 0); cv = f; }
  }
  return _spr[key] = cv;
}
/* white silhouette for damage flash */
function flashed(cv) {
  if (cv._fl) return cv._fl;
  const f = mk(cv.width, cv.height), c = f.getContext('2d'); c.drawImage(cv, 0, 0);
  c.globalCompositeOperation = 'source-atop'; c.fillStyle = '#fff'; c.fillRect(0, 0, f.width, f.height);
  return cv._fl = f;
}
function tinted(cv, col) {
  const k = '_t' + col; if (cv[k]) return cv[k];
  const f = mk(cv.width, cv.height), c = f.getContext('2d'); c.drawImage(cv, 0, 0);
  c.globalCompositeOperation = 'source-atop'; c.fillStyle = col; c.fillRect(0, 0, f.width, f.height);
  return cv[k] = f;
}

/* ---- tiles ---- */
const T = {
  FLOOR: 0, WALL: 1, TREE: 2, ROCK: 3, WATER: 4, PIT: 5, BLOCK: 6, BUSH: 7, CRACK: 8, SEAL: 9, SIGN: 10, ENTRANCE: 11, DSHUT: 12, DLOCK: 13,
  DBOSS: 14, DECO: 15, PATH: 16, STATUE: 17, FIRE: 18, EXIT: 19, TORCH: 20, SPRING: 21, LAND: 22, GOLD: 23, STONE: 24, ICE: 25
};
const SOLID = new Set([T.WALL, T.TREE, T.ROCK, T.WATER, T.BLOCK, T.BUSH, T.CRACK, T.SEAL, T.SIGN, T.DSHUT, T.DLOCK, T.DBOSS, T.STATUE, T.TORCH, T.STONE]);
const FLYOK = new Set([T.WATER, T.PIT, T.FIRE]);

const _tiles = {};
function tileImg(th, type, f) {
  const key = th.id + '|' + type + '|' + f;
  return _tiles[key] || (_tiles[key] = bakeTile(th, type, f));
}
function bakeTile(th, type, f) {
  const cv = mk(16, 16), c = cv.getContext('2d'), r = mulberry32((th.seed || 1) * 977 + type * 31 + f * 7);
  const P = (col, x, y, w, h) => R(c, col, x, y, w, h);
  const floor = () => {
    P(th.g1, 0, 0, 16, 16);
    if (th.fl === 'tile') { P(th.g2, 0, 0, 16, 1); P(th.g2, 0, 0, 1, 16); P(th.g3 || th.g2, 8, 8, 1, 1); for (let i = 0; i < 3; i++) P(th.g2, (r() * 14 + 1) | 0, (r() * 14 + 1) | 0, 1, 1); }
    else for (let i = 0; i < 8; i++) P(th.g2, (r() * 15) | 0, (r() * 15) | 0, 1, 1);
  };
  const brick = (a, b, hi) => {
    P(a, 0, 0, 16, 16);
    for (let y = 0; y < 16; y += 4) {
      P(b, 0, y + 3, 16, 1); const off = (y / 4 % 2) * 4;
      for (let x = off; x < 16; x += 8) P(b, x, y, 1, 4);
      P(hi, 0, y, 16, 1);
    }
  };
  switch (type) {
    case T.FLOOR: floor(); break;
    case T.PATH: floor(); P(th.p1 || th.g2, 0, 0, 16, 16); for (let i = 0; i < 6; i++) P(th.g1, (r() * 15) | 0, (r() * 15) | 0, 2, 1); break;
    case T.LAND: P('#c8b078', 0, 0, 16, 16); for (let i = 0; i < 10; i++) P('#a89058', (r() * 15) | 0, (r() * 15) | 0, 2, 1); break;
    case T.DECO: floor(); {
      const k = th.deco || 'flower';
      for (let i = 0; i < 2; i++) {
        const x = 3 + ((r() * 9) | 0), y = 3 + ((r() * 9) | 0);
        if (k === 'flower') { P(th.dc || '#f8e038', x, y, 1, 1); P(th.dc || '#f8e038', x - 1, y, 1, 1); P(th.dc || '#f8e038', x + 1, y, 1, 1); P(th.dc || '#f8e038', x, y - 1, 1, 1); P(th.dc || '#f8e038', x, y + 1, 1, 1); P('#fcfcfc', x, y, 1, 1); }
        else if (k === 'bones') { P('#e8e0c8', x, y, 4, 1); P('#e8e0c8', x - 1, y - 1, 1, 3); P('#e8e0c8', x + 4, y - 1, 1, 3); }
        else if (k === 'pebble') { P(th.dc || th.w2, x, y, 2, 1); P(th.w3 || th.w1, x, y - 1, 1, 1); }
        else if (k === 'grass') { P(th.dc || th.g2, x, y, 1, 3); P(th.dc || th.g2, x + 2, y + 1, 1, 2); }
      }
    } break;
    case T.WALL: brick(th.w1, th.w2, th.w3); break;
    case T.TORCH: brick(th.w1, th.w2, th.w3); P('#604020', 7, 7, 2, 5); P('#f8a038', 6, 3, 4, 5); P('#f8f038', 7, f ? 3 : 4, 2, 3); P('#fcfcfc', 7, 6, 1, 1); break;
    case T.TREE: floor(); {
      const s = th.tree;
      if (s === 'palm') {
        P(th.tr, 7, 7, 2, 9); P('#8a5a2a', 7, 9, 2, 1); P('#8a5a2a', 7, 12, 2, 1);
        for (let i = 0; i < 6; i++) { P(th.t1, 8 - i, 3 + (i >> 1), 1, 2); P(th.t1, 8 + i, 3 + (i >> 1), 1, 2); }
        P(th.t2, 6, 4, 4, 3); P(th.t1, 7, 2, 2, 2); P('#a05820', 6, 7, 1, 1); P('#a05820', 9, 7, 1, 1);
      } else if (s === 'cactus') {
        P(th.t1, 6, 2, 4, 13); P(th.t2, 6, 2, 1, 13); P(th.t1, 2, 6, 4, 2); P(th.t1, 2, 3, 2, 5); P(th.t1, 10, 8, 4, 2); P(th.t1, 12, 5, 2, 5); P(th.tr, 4, 14, 8, 1); P('#fcfcfc', 8, 4, 1, 1); P('#fcfcfc', 7, 9, 1, 1);
      } else if (s === 'dead') {
        P(th.tr, 7, 5, 2, 11); P(th.tr, 4, 4, 4, 1); P(th.tr, 3, 2, 1, 3); P(th.tr, 9, 7, 4, 1); P(th.tr, 12, 4, 1, 4); P('#2a1808', 7, 5, 1, 11); P(th.tr, 5, 9, 2, 1);
      } else {
        P(th.tr, 7, 10, 3, 6); P('#201008', 7, 10, 1, 6);
        disc(c, th.t2, 8, 7, 7); disc(c, th.t1, 7, 6, 5); P(th.t3 || th.t1, 5, 3, 2, 2); P(th.t2, 9, 10, 4, 2);
        if (s === 'fruit') { P('#f83838', 5, 6, 2, 2); P('#f83838', 10, 4, 2, 2); P('#f83838', 9, 9, 2, 2); }
      }
    } break;
    case T.ROCK: floor(); {
      if (th.rock === 'brick') { P(th.w1, 1, 2, 14, 13); brick(th.w1, th.w2, th.w3); P(th.g1, 0, 0, 16, 1); P('#000', 0, 15, 16, 1); P(th.w2, 0, 14, 16, 2); }
      else if (th.rock === 'ruin') { P(th.w2, 2, 3, 12, 12); P(th.w1, 3, 4, 10, 10); P(th.w3, 3, 4, 10, 1); P(th.w2, 7, 6, 1, 8); P(th.w2, 5, 9, 6, 1); }
      else { disc(c, th.w2, 8, 9, 7); disc(c, th.w1, 8, 8, 6); P(th.w3, 4, 4, 4, 2); P(th.w3, 3, 6, 2, 2); P(th.w2, 9, 11, 4, 2); }
    } break;
    case T.WATER: P(th.wa1, 0, 0, 16, 16); for (let i = 0; i < 3; i++) { const y = 2 + i * 5, o = (f ? 4 : 0) + i * 3; P(th.wa2, (o) % 12, y, 4, 1); P(th.wa2, (o + 8) % 14, y + 2, 3, 1); } break;
    case T.SPRING: floor(); disc(c, '#fcfcfc', 8, 8, 7); disc(c, '#58c8f8', 8, 8, 6); P('#a8e8ff', f ? 4 : 9, f ? 5 : 9, 2, 1); P('#fcfcfc', f ? 9 : 5, f ? 10 : 6, 1, 1); P('#2090d0', 8, 11, 3, 1); break;
    case T.PIT: P('#000', 0, 0, 16, 16); P('#14141c', 0, 0, 16, 2); P('#14141c', 0, 0, 2, 16); P('#0a0a10', 2, 2, 12, 12); break;
    case T.BLOCK: floor(); P(th.w2, 1, 1, 14, 15); P(th.w1, 1, 1, 14, 11); P(th.w3, 1, 1, 14, 1); P(th.w3, 1, 1, 1, 11); P(th.w2, 8, 4, 1, 6); P(th.w2, 4, 7, 8, 1); break;
    case T.STONE: floor(); disc(c, th.w2, 8, 9, 6); disc(c, th.w1, 8, 8, 5); P(th.w3, 5, 5, 3, 1); P(th.w2, 9, 10, 3, 1); break;
    case T.BUSH: floor(); {
      const b1 = th.bush || '#2f8a2f', b2 = th.bush2 || '#206020';
      disc(c, b2, 8, 9, 7); disc(c, b1, 8, 8, 6); P(b2, 4, 9, 2, 1); P(b2, 10, 7, 2, 1); P('#8a4a1a', 5, 5, 1, 1); P('#8a4a1a', 11, 10, 1, 1); P('#8a4a1a', 8, 11, 1, 1);
      if (th.berry) { P('#f83838', 6, 6, 2, 2); P('#f83838', 10, 9, 2, 2); }
    } break;
    case T.CRACK: brick(th.w1, th.w2, th.w3); P('#000', 6, 0, 1, 4); P('#000', 7, 4, 2, 1); P('#000', 8, 5, 1, 4); P('#000', 5, 9, 3, 1); P('#000', 4, 10, 1, 4); P('#000', 9, 11, 3, 1); P(th.g1, 12, 3, 2, 2); break;
    case T.SEAL: floor(); {
      const cols = th.seal || ['#58d8f8', '#fcfcfc', '#a8f0ff'];
      for (let y = 0; y < 16; y += 2) { const o = Math.round(Math.sin(y * .7 + f * 2) * 2); P(cols[(y / 2 + f) % cols.length], 3 + o, y, 10, 2); }
      P(cols[1], 7, 0, 2, 16);
    } break;
    case T.SIGN: floor(); P('#604020', 7, 8, 2, 8); P('#a87838', 2, 2, 12, 8); P('#604020', 2, 2, 12, 1); P('#604020', 2, 9, 12, 1); P('#604020', 2, 2, 1, 8); P('#604020', 13, 2, 1, 8); P('#402010', 4, 4, 8, 1); P('#402010', 4, 6, 6, 1); break;
    case T.ENTRANCE: floor(); {
      const m = th.w1, d = th.w2;
      P(d, 0, 0, 16, 16); P(m, 1, 1, 14, 15); P(th.w3, 1, 1, 14, 1);
      P('#000', 3, 4, 10, 12); P('#000', 4, 3, 8, 1); P(th.acc || '#f8d838', 2, 3, 1, 13); P(th.acc || '#f8d838', 13, 3, 1, 13); P(th.acc || '#f8d838', 4, 2, 8, 1);
      P('#181820', 5, 12, 6, 4); P('#282830', 6, 13, 4, 3);
    } break;
    case T.DSHUT: P('#000', 0, 0, 16, 16); P('#403848', 0, 0, 16, 16); for (let x = 1; x < 16; x += 4) { P('#807890', x, 0, 2, 16); P('#c0b8d0', x, 0, 1, 16); } P('#201828', 0, 7, 16, 2); break;
    case T.DLOCK: P('#302838', 0, 0, 16, 16); P(th.w2, 1, 1, 14, 14); P(th.w1, 2, 2, 12, 12); P('#f8c838', 6, 5, 4, 4); P('#000', 7, 6, 2, 2); P('#f8c838', 7, 9, 2, 4); P('#a07808', 6, 5, 4, 1); break;
    case T.DBOSS: P('#301018', 0, 0, 16, 16); P('#781828', 1, 1, 14, 14); P('#a82838', 2, 2, 12, 12); P('#f8e8d0', 4, 4, 8, 6); P('#000', 5, 6, 2, 2); P('#000', 9, 6, 2, 2); P('#f8e8d0', 5, 10, 6, 2); P('#000', 6, 10, 1, 2); P('#000', 9, 10, 1, 2); break;
    case T.STATUE: floor(); P(th.w2, 3, 13, 10, 3); P(th.w1, 4, 11, 8, 3); P(th.w1, 5, 3, 6, 9); P(th.w3, 5, 3, 2, 9); P(th.w1, 4, 5, 8, 2); P(th.w2, 6, 2, 4, 2); P('#000', 6, 5, 1, 1); P('#000', 9, 5, 1, 1); break;
    case T.FIRE: floor(); P('#301008', 3, 11, 10, 4); P('#701800', 4, 12, 8, 2);
      if (f === 0) { P('#f83800', 4, 6, 8, 8); P('#f8a038', 5, 3, 6, 10); P('#f8f038', 6, 2, 4, 8); P('#fcfcfc', 7, 6, 2, 4); }
      else { P('#f83800', 6, 10, 4, 2); P('#f8a038', 7, 9, 2, 2); P('#f8f038', 7, 10, 1, 1); } break;
    case T.EXIT: P('#000', 0, 0, 16, 16); P('#e8f0ff', 2, 0, 12, 8); P('#fcfcfc', 4, 0, 8, 5); P('#403848', 0, 12, 16, 4); P('#807890', 0, 9, 16, 3); break;
    case T.GOLD: floor(); disc(c, '#a07808', 8, 10, 6); disc(c, '#f8c838', 8, 9, 5); P('#fff0a0', 5, 6, 3, 1); P('#f8c838', 3, 12, 3, 2); P('#fff0a0', 10, 10, 2, 1); break;
    case T.ICE: floor(); break;
    default: floor();
  }
  return cv;
}

/* ---- HUD / item icons (drawn procedurally at 16x16) ---- */
function iconRects(id) {
  const g = '#f8d838', G = '#a07808', w = '#fcfcfc', s = '#c0c8d8', S = '#707890', br = '#a05820', b = '#58a8f8', r = '#f83838';
  switch (id) {
    case 'staff': return [[7, 1, 2, 14, br], [7, 1, 1, 14, '#c88040'], [5, 1, 6, 2, br], [5, 1, 2, 1, '#c88040']];
    case 'flame': return [[7, 0, 2, 10, '#ff8030'], [7, 0, 1, 9, '#ffe060'], [8, 2, 1, 7, '#f83800'], [4, 10, 8, 2, G], [4, 10, 8, 1, g], [7, 12, 2, 3, br], [6, 15, 4, 1, G]];
    case 'spirit': return [[7, 0, 2, 11, w], [7, 0, 1, 10, '#a8f0ff'], [8, 2, 1, 8, b], [3, 11, 10, 2, g], [3, 11, 10, 1, '#fff0a0'], [7, 13, 2, 2, br], [5, 0, 1, 3, '#a8f0ff'], [10, 1, 1, 3, '#a8f0ff']];
    case 'dove': return [[3, 7, 8, 4, w], [2, 5, 3, 3, w], [1, 4, 2, 1, w], [10, 6, 3, 3, w], [12, 7, 2, 1, '#f8a038'], [11, 7, 1, 1, '#000'], [5, 4, 4, 3, s], [4, 3, 3, 2, w], [3, 11, 5, 2, s], [0, 9, 3, 1, s]];
    case 'bow': return [[10, 1, 2, 2, br], [8, 3, 2, 2, br], [7, 5, 2, 6, br], [8, 11, 2, 2, br], [10, 13, 2, 2, br], [12, 2, 1, 12, w], [2, 7, 10, 2, '#c0a060'], [1, 6, 2, 4, s], [2, 5, 1, 1, s], [2, 10, 1, 1, s]];
    case 'rod': return [[7, 2, 2, 13, '#8a5a2a'], [7, 2, 1, 13, '#c88040'], [4, 1, 3, 3, '#8a5a2a'], [3, 1, 2, 2, '#c88040'], [9, 1, 3, 3, '#8a5a2a'], [11, 1, 2, 2, '#c88040'], [6, 5, 4, 1, G]];
    case 'shofar': return [[1, 9, 3, 3, br], [3, 7, 3, 3, br], [5, 5, 3, 3, '#c88040'], [7, 3, 3, 3, '#c88040'], [9, 2, 5, 4, '#e8b060'], [10, 2, 3, 1, w], [12, 6, 1, 1, br], [1, 9, 2, 1, w]];
    case 'sling': return [[2, 2, 2, 8, br], [2, 10, 4, 3, br], [4, 12, 8, 2, '#c0a060'], [10, 8, 4, 4, S], [10, 8, 2, 2, s], [11, 1, 3, 1, '#c0a060'], [13, 2, 1, 6, '#c0a060']];
    case 'shield': return [[2, 1, 12, 9, b], [3, 10, 10, 2, b], [5, 12, 6, 2, b], [7, 14, 2, 1, b], [2, 1, 12, 1, w], [2, 1, 1, 9, w], [7, 3, 2, 9, g], [4, 6, 8, 2, g]];
    case 'armor': return [[3, 1, 10, 3, S], [1, 3, 14, 3, s], [3, 5, 10, 9, s], [3, 5, 10, 1, w], [7, 6, 2, 7, g], [5, 8, 6, 2, g], [3, 13, 10, 2, S]];
    case 'key': return [[3, 3, 5, 5, g], [4, 4, 3, 3, '#000'], [7, 5, 8, 2, g], [12, 7, 2, 3, g], [9, 7, 2, 2, g]];
    case 'bosskey': return [[2, 2, 6, 6, r], [4, 4, 2, 2, '#000'], [7, 4, 8, 3, r], [11, 6, 2, 4, r], [14, 6, 2, 4, '#a82838'], [3, 3, 4, 1, '#f8a0a0']];
    case 'faith': return [[7, 1, 2, 2, '#a8f0ff'], [5, 3, 6, 2, b], [3, 5, 10, 4, b], [5, 9, 6, 2, '#2060c0'], [7, 11, 2, 2, '#2060c0'], [6, 4, 2, 2, w]];
    case 'seal': return [[7, 0, 2, 16, g], [0, 7, 16, 2, g], [4, 4, 8, 8, g], [5, 5, 6, 6, w], [6, 6, 4, 4, G]];
    case 'testimony': return [[2, 3, 12, 10, '#f0e8d0'], [2, 3, 12, 1, w], [7, 3, 2, 10, '#c8b890'], [3, 5, 3, 1, '#606078'], [3, 7, 3, 1, '#606078'], [10, 5, 3, 1, '#606078'], [10, 7, 3, 1, '#606078'], [1, 12, 14, 2, '#a07040'], [7, 0, 2, 3, g]];
    case 'blood': return [[4, 1, 8, 2, g], [3, 3, 10, 4, g], [4, 3, 8, 3, '#c01830'], [5, 3, 3, 1, '#f86070'], [5, 7, 6, 1, G], [7, 8, 2, 4, g], [4, 12, 8, 2, g], [4, 13, 8, 1, G]];
    case 'crown': return [[2, 6, 12, 7, g], [2, 3, 2, 4, g], [7, 2, 2, 5, g], [12, 3, 2, 4, g], [2, 11, 12, 2, G], [4, 8, 2, 2, r], [10, 8, 2, 2, b], [7, 8, 2, 2, w]];
  }
  return [];
}
const _icons = {};
function icon(id) {
  if (_icons[id]) return _icons[id];
  const cv = mk(16, 16), c = cv.getContext('2d');
  for (const [x, y, w, h, col] of iconRects(id)) R(c, col, x, y, w, h);
  return _icons[id] = cv;
}
const HEART = ['.11..11.', '12311221', '12222221', '12222221', '.122221.', '..1221..', '...11...', '........'];
const _hearts = {};
function heartImg(kind) { // 2 full 1 half 0 empty
  if (_hearts[kind]) return _hearts[kind];
  const cv = mk(8, 8), c = cv.getContext('2d');
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const ch = HEART[y][x]; if (ch === '.') continue;
    let col;
    const left = x < 4;
    if (kind === 2 || (kind === 1 && left)) col = ch === '1' ? '#601018' : ch === '3' ? '#fcc0c0' : '#f83838';
    else col = ch === '1' ? '#601018' : '#2a1018';
    c.fillStyle = col; c.fillRect(x, y, 1, 1);
  }
  return _hearts[kind] = cv;
}
