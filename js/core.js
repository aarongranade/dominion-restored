'use strict';
/* ===== Dominion Restored :: core (utils, input, save, audio) ===== */
const W = 256, H = 224, TS = 16, COLS = 16, ROWS = 12, HUDH = 32;

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const rnd = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rnd(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sgn = (v) => v > 0 ? 1 : v < 0 ? -1 : 0;
/* boxes are centre based: {x,y,hw,hh} */
const overlap = (a, b) => Math.abs(a.x - b.x) < a.hw + b.hw && Math.abs(a.y - b.y) < a.hh + b.hh;
const DIRV = [[0, 1], [0, -1], [-1, 0], [1, 0]]; // 0 down,1 up,2 left,3 right

/* ---------------- Input ---------------- */
const Input = {
  dx: 0, dy: 0, press: {}, held: {}, keys: {}, any: false,
  consume(n) { const v = this.press[n]; this.press[n] = false; return !!v; },
  clear() { this.press = {}; },
  _set(n, v) { if (v && !this.held[n]) this.press[n] = true; this.held[n] = v; this.any = true; },
  init() {
    const map = {
      ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd', ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r',
      KeyZ: 'a', KeyJ: 'a', Space: 'a', KeyX: 'b', KeyK: 'b', KeyC: 'sel', KeyQ: 'sel', Tab: 'sel',
      Enter: 'start', KeyP: 'start', Escape: 'start', KeyM: 'mute'
    };
    addEventListener('keydown', e => {
      const n = map[e.code]; if (!n) return; e.preventDefault();
      if (e.repeat) return; this.keys[n] = true; this._set(n, true); Aud.init();
    });
    addEventListener('keyup', e => {
      const n = map[e.code]; if (!n) return; e.preventDefault(); this.keys[n] = false; this.held[n] = false;
    });
    addEventListener('blur', () => { this.keys = {}; this.held = {}; this.dx = this.dy = 0; });
    // touch buttons
    const bind = (id, n) => {
      const el = document.getElementById(id); if (!el) return;
      const down = e => { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (_) { } el.classList.add('on'); this._set(n, true); Aud.init(); Aud.resume(); };
      const up = e => { e.preventDefault(); el.classList.remove('on'); this.held[n] = false; };
      el.addEventListener('pointerdown', down); el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
      el.addEventListener('contextmenu', e => e.preventDefault());
    };
    bind('btnA', 'a'); bind('btnB', 'b'); bind('btnSel', 'sel'); bind('btnStart', 'start');
    // virtual stick
    const pad = document.getElementById('dpad'), knob = document.getElementById('knob');
    if (pad) {
      let pid = null;
      const upd = e => {
        const r = pad.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        let vx = (e.clientX - cx) / (r.width / 2), vy = (e.clientY - cy) / (r.height / 2);
        const m = Math.hypot(vx, vy);
        if (m > 1) { vx /= m; vy /= m; }
        knob.style.transform = `translate(${vx * r.width * .28}px,${vy * r.height * .28}px)`;
        if (m < .22) { this.tdx = 0; this.tdy = 0; return; }
        const nx = vx / m, ny = vy / m;
        this.tdx = Math.abs(nx) > .4 ? sgn(nx) : 0; this.tdy = Math.abs(ny) > .4 ? sgn(ny) : 0;
      };
      pad.addEventListener('pointerdown', e => { e.preventDefault(); pid = e.pointerId; try { pad.setPointerCapture(pid); } catch (_) { } upd(e); this.any = true; Aud.init(); Aud.resume(); });
      pad.addEventListener('pointermove', e => { if (e.pointerId === pid) { e.preventDefault(); upd(e); } });
      const end = e => { if (e.pointerId !== pid) return; pid = null; this.tdx = this.tdy = 0; knob.style.transform = ''; };
      pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end); pad.addEventListener('lostpointercapture', end);
    }
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('dblclick', e => e.preventDefault());
    document.addEventListener('contextmenu', e => e.preventDefault());
  },
  tdx: 0, tdy: 0,
  poll() {
    const k = this.keys;
    let x = (k.r ? 1 : 0) - (k.l ? 1 : 0), y = (k.d ? 1 : 0) - (k.u ? 1 : 0);
    if (!x) x = this.tdx; if (!y) y = this.tdy;
    this.dx = x; this.dy = y;
    // menu style presses from stick edges
    const dirs = { u: y < 0, d: y > 0, l: x < 0, r: x > 0 };
    const names = { u: 'mup', d: 'mdown', l: 'mleft', r: 'mright' };
    for (const d in dirs) { const pn = names[d]; if (dirs[d] && !this.held[pn]) this.press[pn] = true; this.held[pn] = dirs[d]; }
  }
};

/* ---------------- Save ---------------- */
const Save = {
  key: 'dominion-restored-v1',
  has() { const s = this.load(); return !!(s && s.p && s.ds); }, // only a whole save counts
  load() { try { return JSON.parse(localStorage.getItem(this.key)); } catch (e) { return null; } },
  write(d) { try { localStorage.setItem(this.key, JSON.stringify(d)); } catch (e) { } },
  wipe() { try { localStorage.removeItem(this.key); } catch (e) { } }
};

/* ---------------- Audio (WebAudio chiptune) ---------------- */
const SCALES = {
  pent: [0, 2, 4, 7, 9], maj: [0, 2, 4, 5, 7, 9, 11], dor: [0, 2, 3, 5, 7, 9, 10], phr: [0, 1, 3, 5, 7, 8, 10],
  hij: [0, 1, 4, 5, 7, 8, 10], hmin: [0, 2, 3, 5, 7, 8, 11], mix: [0, 2, 4, 5, 7, 9, 10], min: [0, 2, 3, 5, 7, 8, 10],
  loc: [0, 1, 3, 5, 6, 8, 10], dbl: [0, 1, 4, 5, 7, 8, 11], lyd: [0, 2, 4, 6, 7, 9, 11]
};
/* name: [scale, root midi, tempo, progression(degrees), seed, flavour] */
const SONGS = {
  title: ['pent', 57, 84, [0, 3, 4, 0], 11, 'epic'],
  o1: ['pent', 62, 96, [0, 3, 4, 0], 21, 'calm'], o2: ['dor', 59, 100, [0, 3, 4, 2], 22, 'calm'],
  o3: ['phr', 57, 108, [0, 1, 0, 4], 23, 'march'], o4: ['hij', 60, 112, [0, 1, 0, 4], 24, 'march'],
  o5: ['hmin', 55, 118, [0, 3, 4, 0], 25, 'march'], o6: ['mix', 60, 124, [0, 4, 3, 4], 26, 'bright'],
  o7: ['dbl', 57, 112, [0, 1, 4, 1], 27, 'march'], o8: ['min', 52, 76, [0, 5, 3, 4], 28, 'sparse'],
  o9: ['dor', 62, 92, [0, 3, 0, 4], 29, 'calm'], o10: ['loc', 52, 120, [0, 1, 4, 1], 30, 'dark'],
  d1: ['pent', 57, 104, [0, 4, 3, 4], 41, 'dungeon'], d2: ['dor', 55, 108, [0, 2, 3, 4], 42, 'dungeon'],
  d3: ['phr', 53, 114, [0, 1, 0, 3], 43, 'dungeon'], d4: ['hij', 57, 116, [0, 1, 4, 1], 44, 'dungeon'],
  d5: ['hmin', 52, 120, [0, 5, 3, 4], 45, 'dungeon'], d6: ['mix', 55, 126, [0, 3, 4, 3], 46, 'dungeon'],
  d7: ['dbl', 54, 118, [0, 1, 0, 4], 47, 'dungeon'], d8: ['min', 50, 84, [0, 6, 5, 6], 48, 'sparse'],
  d9: ['loc', 48, 78, [0, 1, 5, 4], 49, 'sparse'], d10: ['hmin', 50, 132, [0, 1, 4, 1], 50, 'dark'],
  boss: ['phr', 50, 150, [0, 1, 0, 4], 61, 'boss'], final: ['hmin', 45, 160, [0, 5, 1, 4], 62, 'boss'],
  ending: ['maj', 60, 88, [0, 4, 5, 3], 71, 'epic']
};

const Aud = {
  ctx: null, out: null, muted: false, song: null, name: '', pat: null, step: 0, nextT: 0, timer: null,
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { this.ctx = new AC(); } catch (e) { return; }
    this.out = this.ctx.createGain(); this.out.gain.value = this.muted ? 0 : 0.32;
    const comp = this.ctx.createDynamicsCompressor(); this.out.connect(comp); comp.connect(this.ctx.destination);
    const n = this.ctx.sampleRate, b = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = b;
    if (this.name) { const nm = this.name; this.name = ''; this.music(nm); }
  },
  resume() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume(); },
  setMuted(m) { this.muted = m; if (this.out) this.out.gain.value = m ? 0 : 0.32; },
  tone(f0, f1, dur, type, vol, when) {
    const c = this.ctx; if (!c) return; const t = c.currentTime + (when || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.out); o.start(t); o.stop(t + dur + 0.03);
  },
  noise(dur, vol, when, freq) {
    const c = this.ctx; if (!c) return; const t = c.currentTime + (when || 0);
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const g = c.createGain(), f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 2500; f.Q.value = 0.7;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.out); s.start(t, Math.random()); s.stop(t + dur + 0.03);
  },
  sfx(n) {
    if (!this.ctx || this.muted) return;
    const T = (a, b, d, ty, v, w) => this.tone(a, b, d, ty, v, w), N = (d, v, w, f) => this.noise(d, v, w, f);
    switch (n) {
      case 'sword': N(.09, .18, 0, 3500); T(700, 220, .09, 'square', .07); break;
      case 'hit': T(240, 90, .1, 'square', .14); N(.06, .12, 0, 1800); break;
      case 'clink': T(1800, 1400, .06, 'square', .08); T(2400, 2000, .05, 'triangle', .06, .02); break;
      case 'hurt': T(300, 100, .25, 'sawtooth', .16); N(.12, .12, 0, 900); break;
      case 'kill': T(420, 60, .22, 'square', .14); N(.2, .18, 0, 1200); break;
      case 'pick': T(880, 1320, .08, 'square', .1); T(1320, 1760, .1, 'square', .1, .07); break;
      case 'heart': [660, 880, 1100].forEach((f, i) => T(f, f, .09, 'triangle', .16, i * .07)); break;
      case 'key': [988, 1319].forEach((f, i) => T(f, f, .12, 'square', .1, i * .09)); break;
      case 'door': N(.3, .2, 0, 400); T(110, 70, .3, 'square', .1); break;
      case 'shut': N(.25, .22, 0, 300); T(90, 50, .25, 'square', .12); break;
      case 'dove': T(1000, 1500, .12, 'sine', .14); T(1500, 1100, .12, 'sine', .1, .1); break;
      case 'arrow': N(.07, .1, 0, 5000); T(900, 400, .1, 'triangle', .1); break;
      case 'sling': T(300, 800, .1, 'triangle', .12); N(.05, .08, 0, 2500); break;
      case 'shofar': T(150, 150, .5, 'sawtooth', .18); T(225, 225, .5, 'sawtooth', .1); T(300, 280, .45, 'square', .06, .05); break;
      case 'rod': T(220, 60, .35, 'sawtooth', .15); N(.3, .2, 0, 600); break;
      case 'spit': T(500, 200, .12, 'sawtooth', .08); break;
      case 'boom': N(.45, .3, 0, 250); T(80, 35, .45, 'square', .18); break;
      case 'magic': T(600, 1400, .25, 'sine', .1); T(900, 1700, .25, 'triangle', .06, .05); break;
      case 'select': T(660, 660, .05, 'square', .09); break;
      case 'confirm': T(660, 990, .09, 'square', .1); break;
      case 'text': T(520 + Math.random() * 80, 520, .025, 'square', .035); break;
      case 'fall': T(500, 60, .5, 'triangle', .14); break;
      case 'seal': [523, 659, 784, 1047].forEach((f, i) => T(f, f, .2, 'triangle', .14, i * .1)); break;
      case 'bossroar': T(120, 50, .8, 'sawtooth', .2); N(.8, .2, 0, 500); break;
      case 'fanfare': [[523, 0], [523, .14], [523, .28], [659, .42], [523, .6], [698, .74], [784, .9]].forEach(([f, w]) => T(f, f, .16, 'square', .11, w)); T(1047, 1047, .5, 'square', .12, 1.05); break;
      case 'win': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => T(f, f, .22, 'square', .11, i * .16)); break;
      case 'over': [392, 330, 262, 196].forEach((f, i) => T(f, f, .35, 'triangle', .18, i * .3)); break;
      case 'warp': T(200, 1600, .6, 'sine', .14); break;
    }
  },
  /* --- procedural songs --- */
  build(def) {
    const [scName, root, tempo, prog, seed, flav] = def, sc = SCALES[scName], n = sc.length, r = mulberry32(seed);
    const deg = d => { const o = Math.floor(d / n); return root + sc[((d % n) + n) % n] + 12 * o; };
    const rhy = {
      calm: [[0, 4, 8, 12], [0, 3, 6, 8, 12], [0, 2, 4, 8, 10, 12], [0, 4, 6, 8, 14]],
      epic: [[0, 6, 8], [0, 4, 8, 12], [0, 3, 6, 8, 10, 12], [0, 8, 12, 14]],
      march: [[0, 2, 4, 6, 8, 10, 12, 14], [0, 3, 4, 8, 11, 12], [0, 2, 4, 8, 10, 12, 14], [0, 4, 6, 8, 12, 14]],
      bright: [[0, 2, 4, 6, 8, 10, 12, 14], [0, 3, 6, 8, 11, 14], [0, 2, 4, 8, 10, 12], [0, 4, 8, 10, 12, 14]],
      dungeon: [[0, 4, 6, 8, 12], [0, 3, 6, 10, 12], [0, 2, 6, 8, 11, 14], [0, 6, 8, 12]],
      sparse: [[0, 8], [0, 6, 12], [0, 4, 12], [0, 10]],
      dark: [[0, 2, 4, 6, 8, 10, 12, 14], [0, 3, 6, 8, 11, 12], [0, 2, 3, 6, 8, 10, 14], [0, 4, 7, 8, 12]],
      boss: [[0, 2, 3, 4, 6, 8, 10, 11, 12, 14], [0, 1, 2, 4, 6, 7, 8, 10, 12, 14], [0, 2, 4, 6, 8, 9, 10, 12, 14, 15]]
    }[flav];
    const bars = [];
    let last = 7;
    for (let b = 0; b < 8; b++) {
      const chord = prog[b % prog.length], mel = new Array(16).fill(null);
      const rh = rhy[(b < 4 ? b : (r() < .5 ? b - 4 : b)) % rhy.length];
      rh.forEach((st, i) => {
        const next = rh[i + 1] === undefined ? 16 : rh[i + 1];
        const tones = [chord, chord + 2, chord + 4, chord + 7];
        let d;
        if (r() < .55) d = tones.reduce((a, t) => Math.abs(t + 7 - last) < Math.abs(a + 7 - last) ? t : a, tones[(r() * 4) | 0]);
        else d = last + (r() < .5 ? -1 : 1) * (r() < .7 ? 1 : 2);
        d = clamp(d, chord - 3, chord + 9);
        last = d;
        mel[st] = [deg(d + 7), Math.max(1, Math.min(4, next - st))];
      });
      const bass = [];
      for (let s = 0; s < 16; s += 2) {
        let bd = chord; if (flav === 'boss' || flav === 'dark' || flav === 'march') { bd = (s % 8 === 4) ? chord + 4 : chord; }
        else if (s % 8 === 4) bd = chord + 4;
        if (flav === 'sparse' && s % 8 !== 0) continue;
        bass[s] = deg(bd - 7);
      }
      bars.push({ mel, bass, chord: [deg(chord), deg(chord + 2), deg(chord + 4)] });
    }
    return { bars, tempo, flav };
  },
  music(name) {
    if (name === this.name) return; this.name = name;
    if (!this.ctx) return;
    clearInterval(this.timer);
    if (!name || !SONGS[name]) { this.pat = null; return; }
    this.pat = this.build(SONGS[name]); this.step = 0; this.nextT = this.ctx.currentTime + 0.08;
    this.timer = setInterval(() => this.tick(), 40);
  },
  hz(m) { return 440 * Math.pow(2, (m - 69) / 12); },
  tick() {
    const c = this.ctx, p = this.pat; if (!c || !p) return;
    if (c.state !== 'running') { this.nextT = c.currentTime + 0.05; return; }
    const stepDur = 60 / p.tempo / 4;
    while (this.nextT < c.currentTime + 0.18) {
      const s = this.step % 16, bar = p.bars[Math.floor(this.step / 16) % p.bars.length], w = this.nextT - c.currentTime;
      if (!this.muted) {
        const m = bar.mel[s];
        const lead = p.flav === 'boss' || p.flav === 'dark' ? 'sawtooth' : 'square';
        if (m) this.tone(this.hz(m[0]), this.hz(m[0]), Math.max(.05, m[1] * stepDur * .92), lead, p.flav === 'sparse' ? .07 : .075, w);
        const bs = bar.bass[s];
        if (bs) this.tone(this.hz(bs), this.hz(bs), stepDur * 1.8, 'triangle', .2, w);
        if (p.flav !== 'sparse' && p.flav !== 'calm' && s % 2 === 0) { const a = bar.chord[(s >> 1) % 3]; this.tone(this.hz(a), this.hz(a), stepDur * .8, 'square', .018, w); }
        if (p.flav === 'boss' || p.flav === 'march' || p.flav === 'dark' || p.flav === 'dungeon') {
          if (s % 4 === 2) this.noise(.03, .035, w, 7000);
          if (s % 8 === 4) this.noise(.08, .06, w, 1800);
          if (s % 8 === 0 && p.flav !== 'dungeon') this.tone(140, 45, .12, 'sine', .22, w);
        }
        if (p.flav === 'epic' && s === 0) this.tone(100, 40, .3, 'sine', .2, w);
      }
      this.nextT += stepDur; this.step++;
    }
  }
};
