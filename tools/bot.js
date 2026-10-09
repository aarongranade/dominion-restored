// In-page bot for playtests: window.__bot.start(opts). Fights enemies/bosses with the sword and items.
window.__bot = {
  on: false, t: 0,
  start() { this.on = true; clearInterval(this.iv); this.iv = setInterval(() => this.step(), 16); },
  stop() { this.on = false; clearInterval(this.iv); Input.keys = {}; },
  step() {
    const G = __dr.G; if (!G || G.mode !== 'play') { Input.keys = {}; if (G && (G.mode === 'dialog' || G.mode === 'itemget')) Input.press.a = true; return; }
    const p = G.p, rm = G.room; this.t++;
    let tx = null, ty = null, near = 1e9;
    for (const e of rm.enemies) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < near) { near = d; tx = e.x; ty = e.y; } }
    if (rm.boss && !rm.boss.dead) { const ps = rm.boss.parts().filter(q => q.vuln !== false); const q = ps[0] || rm.boss; const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < near || tx === null) { near = d; tx = q.x; ty = q.y; } }
    const k = {}; Input.keys = k;
    if (tx === null) { return; }
    const dx = tx - p.x, dy = ty - (p.y + 3);
    if (Math.abs(dx) > 14 || Math.abs(dy) > 14) { if (Math.abs(dx) > Math.abs(dy)) { k[dx > 0 ? 'r' : 'l'] = true; if (Math.abs(dy) > 5) k[dy > 0 ? 'd' : 'u'] = true; } else { k[dy > 0 ? 'd' : 'u'] = true; if (Math.abs(dx) > 5) k[dx > 0 ? 'r' : 'l'] = true; } }
    // face target and hit
    if (near < 26) { Input.press.a = true; }
    if (this.t % 40 === 0 && near < 120 && p.sel) Input.press.b = true;
  }
};
