/* Offline cache for Dominion Restored */
const CACHE = 'dominion-restored-v3';
const FILES = ['./', 'index.html', 'style.css', 'icon.svg', 'manifest.webmanifest', 'js/core.js', 'js/gfx.js', 'js/data.js', 'js/world.js', 'js/combat.js', 'js/bosses.js', 'js/render3d.js', 'js/game.js', 'js/minigames.js', 'js/vendor/three.min.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
});
