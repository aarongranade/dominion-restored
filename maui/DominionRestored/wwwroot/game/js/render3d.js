'use strict';
/* ===== Dominion Restored :: optional 3D view =====
   The game itself is unchanged: rooms, rules and the 2D draw code all stay the same.
   This file only shows the play area in 3D with Three.js:
   - each room becomes a block diorama (walls, trees and rocks stand up; water and pits sink),
   - characters, enemies and pickups are captured from their 2D sprites onto cards that face the camera,
   - projectiles and sparks float just above the floor, and dark rooms are lit by real lights.
   The HUD, dialogs and menus are still drawn on the 2D canvas, which sits on top. */

const R3D = {
  on: false, ready: false, loading: false, failed: false,
  PREF: 'dominion-restored-view',
  pref() { try { return localStorage.getItem(this.PREF); } catch (e) { return null; } },
  init() {
    const q = new URLSearchParams(location.search), p = this.pref();
    const want = q.has('2d') ? false : q.has('3d') ? true : p ? p === '3d' : true; // 3D is the default on this branch
    if (want) this.setOn(true, true);
  },
  setOn(v, quiet) {
    this.on = v; document.body.classList.toggle('view3d', v && this.ready);
    if (!quiet) try { localStorage.setItem(this.PREF, v ? '3d' : '2d'); } catch (e) { }
    if (v && !this.ready) this.load();
    if (this.cv) this.cv.style.display = v && this.ready ? '' : 'none';
  },
  toggle() { this.setOn(!this.on); },
  label() { return 'VIEW: ' + (this.on ? '3D' : '2D'); },
  load() {
    if (this.loading || this.failed) return;
    if (window.THREE) { this.setup(); return; }
    this.loading = true;
    const s = document.createElement('script'); s.src = 'js/vendor/three.min.js';
    s.onload = () => { this.loading = false; this.setup(); };
    s.onerror = () => { this.loading = false; this.failed = true; this.on = false; };
    document.head.appendChild(s);
  },
  active() { return this.on && this.ready && !!G.room && G.mode !== 'title' && G.mode !== 'ending'; },

  /* ---------- setup ---------- */
  setup() {
    try { this._setup(); this.ready = true; this.setOn(this.on, true); }
    catch (e) { console.warn('3D view unavailable', e); this.failed = true; this.on = false; }
  },
  _setup() {
    const TH = THREE;
    this.cv = document.createElement('canvas'); this.cv.id = 'gl';
    document.getElementById('stage').appendChild(this.cv);
    const gl = new TH.WebGLRenderer({ canvas: this.cv, antialias: false, alpha: false, powerPreference: 'high-performance' });
    gl.setPixelRatio(1); gl.setSize(512, 384, false); gl.setClearColor(0x000000, 1); gl.sortObjects = true;
    // crisp pixel shadows, re-rendered only when the scenery changes
    gl.shadowMap.enabled = true; gl.shadowMap.type = TH.BasicShadowMap; gl.shadowMap.autoUpdate = false;
    this.gl = gl;
    const scene = this.scene = new TH.Scene();
    // camera: a steep three-quarter view framing the whole 256x192 room
    this.pitch = 64 * Math.PI / 180;
    this.cam = new TH.PerspectiveCamera(28, 256 / 192, 10, 3000);
    this.fitCamera();
    this.amb = new TH.AmbientLight(0xffffff, .6); scene.add(this.amb);
    // the sun stands behind and to the left, so shadows fall forward and to the right
    const sun = this.sun = new TH.DirectionalLight(0xffffff, .55); sun.position.set(-170, 210, -140); scene.add(sun);
    sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -.002;
    Object.assign(sun.shadow.camera, { left: -170, right: 170, top: 170, bottom: -170, near: 1, far: 1000 }); sun.shadow.camera.updateProjectionMatrix();
    this.props = {};
    this.lamps = [];
    for (let i = 0; i < 6; i++) { const l = new TH.PointLight(0xffe8b0, 0, 80, 1); l.visible = false; scene.add(l); this.lamps.push(l); }
    const nearest = t => { t.magFilter = TH.NearestFilter; t.minFilter = TH.NearestFilter; t.generateMipmaps = false; return t; };
    this.nearest = nearest;
    this.rooms = new Map();
    this.world = new TH.Group(); scene.add(this.world);
    // flat layers: floor decals (shadows, warnings, shockwaves, ground bosses) and the air layer (shots, sparks)
    const flat = (y, order) => {
      const c = mk(256, 192), tex = nearest(new TH.CanvasTexture(c));
      const m = new TH.Mesh(new TH.PlaneGeometry(256, 192), new TH.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.y = y; m.renderOrder = order; this.world.add(m);
      return { c, x: c.getContext('2d'), tex, m };
    };
    this.floor = flat(.4, 2); this.air = flat(9, 5);
    // sprite cards share one atlas that is repainted every frame
    this.atlas = mk(512, 512); this.ax = this.atlas.getContext('2d'); this.atex = nearest(new TH.CanvasTexture(this.atlas));
    this.blayer = mk(256, 192); this.bx = this.blayer.getContext('2d'); this.btex = nearest(new TH.CanvasTexture(this.blayer));
    this.cards = [];
    this.bossCard = this.makeCard(this.btex);
    // exit light: a real column of light
    const beam = this.beam = new TH.Group();
    const bm = (w, op) => new TH.Mesh(new TH.BoxGeometry(w, 260, w), new TH.MeshBasicMaterial({ color: 0xfff8c0, transparent: true, opacity: op, blending: TH.AdditiveBlending, depthWrite: false }));
    this.beamOuter = bm(18, .35); this.beamInner = bm(7, .8); beam.add(this.beamOuter, this.beamInner); beam.renderOrder = 6;
    this.beamOuter.renderOrder = this.beamInner.renderOrder = 6; this.beamOuter.position.y = this.beamInner.position.y = 130;
    this.world.add(beam);
    addEventListener('resize', () => this.place());
    this.place();
  },
  fitCamera() {
    // find the closest camera distance (and aim point) that keeps the whole room, walls included, on screen
    const TH = THREE, cam = this.cam, s = Math.sin(this.pitch), c = Math.cos(this.pitch), v = new TH.Vector3();
    const pts = []; for (const x of [-128, 128]) for (const z of [-96, 96]) for (const y of [0, 14]) pts.push([x, y, z]);
    const fits = (D, tz) => {
      cam.position.set(0, D * s, tz + D * c); cam.lookAt(0, 0, tz); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
      let y0 = 9, y1 = -9, xm = 0;
      for (const p of pts) { v.set(p[0], p[1], p[2]).project(cam); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); xm = Math.max(xm, Math.abs(v.x)); }
      return { ok: xm <= 1.0 && y0 >= -1 && y1 <= 1, mid: (y0 + y1) / 2 };
    };
    let best = null;
    for (let tz = -40; tz <= 40; tz += 1) { // the closest fit that is also centred top to bottom
      let lo = 100, hi = 2000;
      for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (fits(m, tz).ok) hi = m; else lo = m; }
      const mid = Math.abs(fits(hi, tz).mid);
      if (!best || mid < best.mid) best = { D: hi, tz, mid };
    }
    this.camD = best.D; this.camTz = best.tz; this.setCam(0, 0);
  },
  setCam(sx, sy) {
    const s = Math.sin(this.pitch), c = Math.cos(this.pitch), cam = this.cam;
    cam.position.set(sx, this.camD * s, this.camTz + sy + this.camD * c); cam.lookAt(sx, 0, this.camTz + sy); cam.updateMatrixWorld();
  },
  place() {
    // lay the 3D canvas exactly over the play area of the 2D screen canvas (which stays on top for the HUD)
    if (!this.cv) return;
    const sr = cv.getBoundingClientRect(), pr = document.getElementById('stage').getBoundingClientRect();
    const k = sr.height / H, st = this.cv.style;
    const key = [sr.left - pr.left, sr.top - pr.top, sr.width, sr.height].map(Math.round).join();
    if (key === this.placed) return; this.placed = key;
    st.left = (sr.left - pr.left) + 'px'; st.top = (sr.top - pr.top + HUDH * k) + 'px'; st.width = sr.width + 'px'; st.height = (192 * k) + 'px';
  },

  /* ---------- rooms ---------- */
  height(t) {
    switch (t) {
      case T.WALL: case T.CRACK: case T.SEAL: case T.DSHUT: case T.DLOCK: case T.DBOSS: case T.TORCH: return 14;
      case T.BLOCK: return 10;
      case T.WATER: return -3; case T.PIT: return -14;
      default: return 0;
    }
  },
  roomEntry(room) {
    let e = this.rooms.get(room);
    if (!e) {
      const TH = THREE, c = mk(256, 192), tex = this.nearest(new TH.CanvasTexture(c));
      e = { c, x: c.getContext('2d'), tex, sig: '', group: new TH.Group(), used: 0 };
      e.ground = new TH.Mesh(new TH.BufferGeometry(), new TH.MeshLambertMaterial({ map: tex, depthWrite: false }));
      e.raised = new TH.Mesh(new TH.BufferGeometry(), new TH.MeshLambertMaterial({ map: tex }));
      e.water = new TH.Mesh(new TH.BufferGeometry(), new TH.MeshPhongMaterial({ map: tex, depthWrite: false, specular: 0x283850, shininess: 24 }));
      e.props = new TH.Mesh(new TH.BufferGeometry(), new TH.MeshLambertMaterial({ vertexColors: true }));
      e.ground.renderOrder = 0; e.water.renderOrder = 0; e.raised.renderOrder = 1; e.props.renderOrder = 1;
      e.ground.receiveShadow = e.water.receiveShadow = true;
      for (const m of [e.raised, e.props]) m.castShadow = m.receiveShadow = true;
      e.group.add(e.ground, e.water, e.raised, e.props); this.world.add(e.group);
      this.rooms.set(room, e);
      if (this.rooms.size > 4) { // forget rooms we left behind
        for (const [r, o] of this.rooms) if (r !== room && r !== G.room && (!G.trans || (r !== G.trans.from && r !== G.trans.to))) { this.world.remove(o.group); for (const m of [o.ground, o.water, o.raised, o.props]) m.geometry.dispose(); o.tex.dispose(); this.rooms.delete(r); if (this.rooms.size <= 4) break; }
      }
    }
    const sig = room.tiles.join(',');
    if (sig !== e.sig) { e.sig = sig; this.buildGeo(room, e); this.shadowsDirty = true; }
    drawTiles(e.x, room, 0, 0); e.tex.needsUpdate = true; // animated water, lava and fire
    return e;
  },
  buildGeo(room, e) {
    // a height field: every tile is a column; sides are only built where the neighbour is lower
    const TH = THREE, tl = room.tiles, hOf = (x, y) => x < 0 || y < 0 || x > 15 || y > 11 ? 0 : this.height(tl[y * 16 + x]);
    const G0 = { p: [], n: [], u: [] }, G1 = { p: [], n: [], u: [] }, GW = { p: [], n: [], u: [] }, props = [];
    const quad = (g, a, b, c2, d, n, uv) => { // a b c d counter-clockwise seen from outside
      for (const v of [a, b, c2, a, c2, d]) g.p.push(v[0], v[1], v[2]);
      for (let i = 0; i < 6; i++) g.n.push(n[0], n[1], n[2]);
      for (const k of [0, 1, 2, 0, 2, 3]) g.u.push(uv[k][0], uv[k][1]);
    };
    for (let ty = 0; ty < 12; ty++) for (let tx = 0; tx < 16; tx++) {
      const t = tl[ty * 16 + tx], h = hOf(tx, ty), x0 = tx * 16 - 128, x1 = x0 + 16, z0 = ty * 16 - 96, z1 = z0 + 16, g = h > 0 ? G1 : t === T.WATER ? GW : G0;
      const pr = this.prop(room.theme, t);
      if (pr) props.push([pr, x0, z0]);
      const u0 = tx / 16, u1 = (tx + 1) / 16, v0 = 1 - ty / 12, v1 = 1 - (ty + 1) / 12;
      quad(g, [x0, h, z1], [x1, h, z1], [x1, h, z0], [x0, h, z0], [0, 1, 0], [[u0, v1], [u1, v1], [u1, v0], [u0, v0]]);
      // sides: south (+z), north (-z), west (-x), east (+x)
      for (const [dx, dy] of [[0, 1], [0, -1], [-1, 0], [1, 0]]) {
        const nh = hOf(tx + dx, ty + dy); if (nh >= h) continue;
        const gs = h > 0 ? G1 : G0, f = Math.min(1, (h - nh) / 16), vb = v1 + (v0 - v1) * (1 - f), uv = [[u0, vb], [u1, vb], [u1, v0], [u0, v0]];
        if (dy === 1) quad(gs, [x0, nh, z1], [x1, nh, z1], [x1, h, z1], [x0, h, z1], [0, 0, 1], uv);
        else if (dy === -1) quad(gs, [x1, nh, z0], [x0, nh, z0], [x0, h, z0], [x1, h, z0], [0, 0, -1], uv);
        else if (dx === -1) quad(gs, [x0, nh, z0], [x0, nh, z1], [x0, h, z1], [x0, h, z0], [-1, 0, 0], uv);
        else quad(gs, [x1, nh, z1], [x1, nh, z0], [x1, h, z0], [x1, h, z1], [1, 0, 0], uv);
      }
    }
    let len = 0; for (const [pr] of props) len += pr.p.length;
    const GP = { p: new Float32Array(len), n: new Float32Array(len), c: new Float32Array(len) };
    let o = 0;
    for (const [pr, x0, z0] of props) {
      const P = pr.p; GP.n.set(pr.n, o); GP.c.set(pr.c, o);
      for (let i = 0; i < P.length; i += 3, o += 3) { GP.p[o] = P[i] + x0; GP.p[o + 1] = P[i + 1]; GP.p[o + 2] = P[i + 2] + z0; }
    }
    for (const [m, g] of [[e.ground, G0], [e.raised, G1], [e.water, GW], [e.props, GP]]) {
      const geo = new TH.BufferGeometry();
      geo.setAttribute('position', new TH.Float32BufferAttribute(g.p, 3));
      geo.setAttribute('normal', new TH.Float32BufferAttribute(g.n, 3));
      if (g.u) geo.setAttribute('uv', new TH.Float32BufferAttribute(g.u, 2));
      if (g.c) geo.setAttribute('color', new TH.Float32BufferAttribute(g.c, 3));
      m.geometry.dispose(); m.geometry = geo;
    }
  },
  /* ---------- props: trees, rocks, bushes, statues and signs grow out of their own pixel art ----------
     Every pixel of the tile that is not ground becomes a little column. Round things (leafy trees, boulders,
     bushes) rise highest in the middle, like a dome; the rest (palms, cacti, statues, signs) stand up straight. */
  propShape(th, t) {
    switch (t) {
      case T.TREE: return th.tree === 'palm' || th.tree === 'cactus' || th.tree === 'dead' ? { H: 15, dome: false } : { H: 20, dome: true };
      case T.ROCK: return th.rock === 'brick' || th.rock === 'ruin' ? { H: 11, dome: false } : { H: 11, dome: true };
      case T.STONE: return { H: 8, dome: true };
      case T.BUSH: return { H: 9, dome: true };
      case T.STATUE: return { H: 16, dome: false };
      case T.SIGN: return { H: 8, dome: false };
    }
    return null;
  },
  prop(th, t) {
    const key = th.id + '|' + t;
    if (key in this.props) return this.props[key];
    const sh = this.propShape(th, t); if (!sh) return (this.props[key] = null);
    const img = tileImg(th, t, 0).getContext('2d').getImageData(0, 0, 16, 16).data;
    const hex = h => { if (!h) return -1; h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join(''); return parseInt(h, 16); };
    const ground = new Set([th.g1, th.g2, th.g3].map(hex));
    const col = i => (img[i * 4] << 16) | (img[i * 4 + 1] << 8) | img[i * 4 + 2];
    const mask = new Array(256).fill(false);
    for (let i = 0; i < 256; i++) mask[i] = img[i * 4 + 3] > 0 && !ground.has(col(i));
    // distance from each solid pixel to the nearest ground pixel (outside the tile counts as ground)
    const dist = new Array(256).fill(0); let dmax = 1;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (!mask[y * 16 + x]) continue;
      let d = Math.min(x + 1, y + 1, 16 - x, 16 - y);
      for (let yy = 0; yy < 16; yy++) for (let xx = 0; xx < 16; xx++) if (!mask[yy * 16 + xx]) d = Math.min(d, Math.hypot(xx - x, yy - y));
      dist[y * 16 + x] = d; dmax = Math.max(dmax, d);
    }
    const hgt = new Array(256).fill(0); // heights go in steps of two: chunkier, and fewer faces
    for (let i = 0; i < 256; i++) if (mask[i]) { const k = dist[i] / dmax; hgt[i] = Math.max(2, 2 * Math.round(sh.H * (sh.dome ? .3 + .7 * Math.sqrt(k) : .75 + .25 * k) / 2)); }
    const out = { p: [], n: [], c: [] }, hAt = (x, y) => x < 0 || y < 0 || x > 15 || y > 15 ? 0 : hgt[y * 16 + x];
    const quad = (a, b, c2, d, n, rgb) => {
      for (const v of [a, b, c2, a, c2, d]) out.p.push(v[0], v[1], v[2]);
      for (let i = 0; i < 6; i++) { out.n.push(n[0], n[1], n[2]); out.c.push(rgb[0], rgb[1], rgb[2]); }
    };
    // neighbouring faces with the same colour and heights are merged into one longer quad
    const rgbAt = (x, y) => { const i = (y * 16 + x) * 4; return [img[i] / 255, img[i + 1] / 255, img[i + 2] / 255]; };
    const same = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
    const runs = (n, face, emit) => { // walk a line of n cells; face(k) -> null or {h, nh, rgb}
      for (let k = 0; k < n;) {
        const f = face(k); if (!f) { k++; continue; }
        let e = k + 1; for (let g; e < n && (g = face(e)) && g.h === f.h && g.nh === f.nh && same(g.rgb, f.rgb); e++);
        emit(k, e, f); k = e;
      }
    };
    for (let y = 0; y < 16; y++) {
      runs(16, x => hgt[y * 16 + x] ? { h: hgt[y * 16 + x], nh: 0, rgb: rgbAt(x, y) } : null, (a, b, f) => quad([a, f.h, y + 1], [b, f.h, y + 1], [b, f.h, y], [a, f.h, y], [0, 1, 0], f.rgb));
      runs(16, x => { const h = hgt[y * 16 + x], nh = hAt(x, y + 1); return h && nh < h ? { h, nh, rgb: rgbAt(x, y) } : null; }, (a, b, f) => quad([a, f.nh, y + 1], [b, f.nh, y + 1], [b, f.h, y + 1], [a, f.h, y + 1], [0, 0, 1], f.rgb));
      runs(16, x => { const h = hgt[y * 16 + x], nh = hAt(x, y - 1); return h && nh < h ? { h, nh, rgb: rgbAt(x, y) } : null; }, (a, b, f) => quad([b, f.nh, y], [a, f.nh, y], [a, f.h, y], [b, f.h, y], [0, 0, -1], f.rgb));
    }
    for (let x = 0; x < 16; x++) {
      runs(16, y => { const h = hgt[y * 16 + x], nh = hAt(x - 1, y); return h && nh < h ? { h, nh, rgb: rgbAt(x, y) } : null; }, (a, b, f) => quad([x, f.nh, a], [x, f.nh, b], [x, f.h, b], [x, f.h, a], [-1, 0, 0], f.rgb));
      runs(16, y => { const h = hgt[y * 16 + x], nh = hAt(x + 1, y); return h && nh < h ? { h, nh, rgb: rgbAt(x, y) } : null; }, (a, b, f) => quad([x + 1, f.nh, b], [x + 1, f.nh, a], [x + 1, f.h, a], [x + 1, f.h, b], [1, 0, 0], f.rgb));
    }
    for (const k of ['p', 'n', 'c']) out[k] = new Float32Array(out[k]);
    return (this.props[key] = out);
  },

  /* ---------- sprite cards ---------- */
  makeCard(tex) {
    const TH = THREE, geo = new TH.PlaneGeometry(1, 1); geo.translate(0, .5, 0);
    const m = new TH.Mesh(geo, new TH.MeshBasicMaterial({ map: tex || this.atex, transparent: true, depthWrite: false, alphaTest: .02 }));
    m.rotation.x = -this.pitch; m.renderOrder = 4; m.visible = false; this.world.add(m); return m;
  },
  setUV(m, u0, v0, u1, v1) { const a = m.geometry.attributes.uv; a.array.set([u0, v0, u1, v0, u0, v1, u1, v1]); a.needsUpdate = true; },
  // stand a w x h card so that the point `below` pixels above its bottom edge rests on the floor at (fx, fy)
  placeCard(m, fx, fy, w, h, below, lift) {
    const s = Math.sin(this.pitch), c = Math.cos(this.pitch), up = lift || 0;
    m.scale.set(w, h, 1); m.position.set(fx - 128, -below * c + up, fy - 96 + below * s); m.visible = true;
  },
  // paint something into the atlas with the game's own 2D draw code, then show it on a card
  card(fx, fy, w, h, below, draw, opts) {
    const pk = this.pk; if (pk.x + w > 512) { pk.x = 0; pk.y += pk.row; pk.row = 0; } if (pk.y + h > 512) return;
    const cx = pk.x, cy = pk.y; pk.x += w; pk.row = Math.max(pk.row, h);
    const a = this.ax; a.save(); a.beginPath(); a.rect(cx, cy, w, h); a.clip(); a.translate(Math.round(cx + w / 2 - fx), Math.round(cy + h - below - fy)); draw(a); a.restore();
    let m = this.cards[this.ci]; if (!m) { m = this.makeCard(); this.cards.push(m); } this.ci++;
    this.setUV(m, cx / 512, 1 - cy / 512, (cx + w) / 512, 1 - (cy + h) / 512);
    this.placeCard(m, fx, fy, w, h, below, opts && opts.lift);
    m.material.color.setScalar(this.lit(fx, fy));
    if (opts && opts.shadow) this.shadow(fx, fy, opts.shadow);
    return m;
  },
  shadow(x, y, w) { const c = this.floor.x; c.globalAlpha = .28; c.fillStyle = '#000'; c.beginPath(); c.ellipse(x, y - 1, w / 2, w / 6 + 1, 0, 0, 6.283); c.fill(); c.globalAlpha = 1; },

  /* ---------- darkness ---------- */
  lightsFor(room) {
    const L = [];
    if (!room.dark) return L;
    const p = G.p; L.push([p.x, p.y, room.darkR || 40]);
    for (let i = 0; i < 192; i++) if (room.tiles[i] === T.TORCH) L.push([(i % 16) * 16 + 8, (i / 16 | 0) * 16 + 8, 26]);
    for (const k of room.pickups) if (k.type === 'light') L.push([k.x, k.y, 36]);
    if (room.chest) L.push([room.chest.x, room.chest.y, 24]);
    if (room.boss && !room.boss.dead) L.push([room.boss.x, room.boss.y, 22]);
    for (const o of room.projs) if (o.kind === 'fire' || o.kind === 'orb' || o.kind === 'soul' || o.kind === 'beam') L.push([o.x, o.y, 12]);
    return L;
  },
  lit(x, y) {
    if (!this.L.length) return 1;
    let b = .06; for (const [lx, ly, r] of this.L) { const d = Math.hypot(x - lx, y - ly); b = Math.max(b, d < r ? 1 : 1 - (d - r) / 14); }
    return clamp(b, .06, 1);
  },
  setLights(room) {
    const L = this.L = this.lightsFor(room), dark = L.length > 0;
    this.amb.intensity = dark ? .05 : .6; this.sun.intensity = dark ? 0 : .5;
    const top = L.slice(0, this.lamps.length);
    this.lamps.forEach((l, i) => {
      const s = top[i]; l.visible = !!s; if (!s) return;
      l.position.set(s[0] - 128, 18, s[1] - 96); l.distance = s[2] * 2.4; l.intensity = 2.2;
    });
  },

  /* ---------- per-frame ---------- */
  render() {
    this.place();
    const m = G.mode, TH = THREE;
    let sx = 0, sy = 0; if (G.shake > 0) { sx = rnd(-1, 1) * Math.min(3, G.shake * 8); sy = rnd(-1, 1) * Math.min(3, G.shake * 8); }
    this.setCam(-sx, -sy);
    for (const e of this.rooms.values()) e.group.visible = false;
    this.ci = 0; this.pk = { x: 0, y: 0, row: 0 };
    this.ax.clearRect(0, 0, 512, 512);
    const fl = this.floor.x, ai = this.air.x; fl.clearRect(0, 0, 256, 192); ai.clearRect(0, 0, 256, 192);
    this.bossCard.visible = false; this.beam.visible = false;
    if (m === 'trans' && G.trans) {
      const tr = G.trans, k = Math.min(1, tr.t / tr.dur), d = DIRV[tr.dir];
      const a = this.roomEntry(tr.from), b = this.roomEntry(tr.to);
      a.group.visible = b.group.visible = true;
      a.group.position.set(-d[0] * 256 * k, 0, -d[1] * 192 * k); b.group.position.set(d[0] * 256 * (1 - k), 0, d[1] * 192 * (1 - k));
      this.setLights(tr.to); this.L = [];
      const p = G.p, px = tr.sx + (tr.nx - tr.sx) * k, py = tr.sy + (tr.ny - tr.sy) * k;
      this.card(px, py + 8, 32, 40, 8, c => c.drawImage(playerSprite(p.dir, Math.floor(G.t * 8) % 2), Math.round(px - 8), Math.round(py - 8)), { shadow: 12 });
    } else {
      const room = G.room, e = this.roomEntry(room);
      e.group.visible = true; e.group.position.set(0, 0, 0);
      this.setLights(room);
      this.entities(room);
    }
    for (let i = this.ci; i < this.cards.length; i++) this.cards[i].visible = false;
    for (const e of this.rooms.values()) e.water.position.y = Math.sin(G.t * 2) * .5; // the water gently rises and falls
    const shadowKey = [...this.rooms.values()].filter(e => e.group.visible).map(e => e.sig.length + ':' + e.group.position.x + ',' + e.group.position.z).join('|');
    if (this.shadowsDirty || shadowKey !== this.shadowKey) { this.gl.shadowMap.needsUpdate = true; this.shadowsDirty = false; this.shadowKey = shadowKey; }
    this.atex.needsUpdate = true; this.floor.tex.needsUpdate = true; this.air.tex.needsUpdate = true;
    this.gl.render(this.scene, this.cam);
  },
  entities(room) {
    const p = G.p, fl = this.floor.x, ai = this.air.x;
    // floor: warnings and shockwaves
    drawHazards(fl); drawRings(fl, room);
    // exit light
    if (room.beam) {
      const b = room.beam; this.beam.visible = true; this.beam.position.set(b.x - 128, 0, b.y - 96);
      this.beamOuter.material.opacity = .3 + .12 * Math.sin(G.t * 8);
      this.card(b.x, b.y + 14, 24, 32, 0, c => c.drawImage(icon('seal'), Math.round(b.x - 8), Math.round(b.y + 6 + Math.sin(G.t * 4) * 3)));
    }
    // the throne room: the throne stands on its golden dais; Jacob's ladder rises into the sky
    if (room.throne) { const t = room.throne; this.card(t.x, 46, 96, 48, 2, c => drawThrone(c, t), { lift: 10 }); }
    if (room.ladder && room.ladder.x !== undefined) { const L = room.ladder; this.card(L.x, L.y + 10, 32, Math.min(200, L.y + 12), 0, c => drawLadder(c, L)); }
    if (room.npcs) for (const n of room.npcs) this.card(n.x, n.y + 9, 40, 40, 6, c => drawNpc(c, n), { shadow: 12 });
    if (room.chest) { const k = room.chest; this.card(k.x, k.y + 7, 32, 32, 2, c => drawChest(c, k), { shadow: 18 }); }
    for (const k of room.pickups) this.card(k.x, k.y + 6, 32, 32, 6, c => drawPickups1(c, k), { shadow: 8 });
    for (const en of room.enemies) {
      const mini = en.mini, w = mini ? 64 : 32, h = mini ? 64 : 40, foot = en.y + (mini ? 16 : 8);
      this.card(en.x, foot, w, h, mini ? 12 : 8, c => drawEnemy(c, en), { shadow: en.def.fly ? 0 : mini ? 26 : 12 });
    }
    // the boss: creatures of the ground and the sea lie flat, the rest stand up
    const b = room.boss;
    if (b && !b.dead) {
      const bc = this.bx; bc.clearRect(0, 0, 256, 192); b.draw(bc);
      if (b.id === 'serpent' || b.id === 'leviathan') fl.drawImage(this.blayer, 0, 0);
      else {
        const parts = b.rawParts(); let foot = b.y + 16;
        if (parts.length) { foot = -1; for (const q of parts) foot = Math.max(foot, q.y + q.hh); }
        b._foot = parts.length ? foot : (b._foot || foot);
        const bm = this.bossCard; bm.visible = true;
        // the whole boss layer stands on one card whose foot line is the boss's lowest point
        this.setUV(bm, 0, 1, 1, 0);
        const below = 192 - b._foot; bm.scale.set(256, 192, 1);
        const s = Math.sin(this.pitch), c = Math.cos(this.pitch);
        bm.position.set(0, -below * c, b._foot - 96 + below * s);
        bm.material.color.setScalar(this.lit(b.x, b.y));
        this.shadow(b.x, b._foot, 40);
      }
      this.btex.needsUpdate = true;
    }
    // the hero (the dove gets its own card so it can fly far away)
    const dove = p.dove; p.dove = null;
    this.card(p.x, p.y + 8, 64, 72, 24, c => {
      drawPlayer(c);
      if (G.mode === 'itemget') { c.drawImage(icon(ITEMS[G.chestGet].icon), Math.round(p.x - 8), Math.round(p.y - 28 - Math.sin(G.t * 6))); if (Math.floor(G.t * 8) % 2) R(c, '#fff', Math.round(p.x) + 8, Math.round(p.y) - 30, 2, 2); }
    }, { shadow: p.horse ? 22 : 12 });
    p.dove = dove;
    if (dove) this.card(dove.x, dove.y + 14, 24, 24, 0, c => c.drawImage(icon('dove'), Math.round(dove.x - 8), Math.round(dove.y - 8 + Math.sin(dove.t * 30) * 1.5)), { shadow: 8 });
    // air: shots and sparks
    for (const o of room.projs) drawProj(ai, o);
    drawFx(ai);
  },
};
