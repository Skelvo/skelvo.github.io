/* Hors-ligne : on garde l'appli en cache, et on la met à jour en arrière-plan. */
/* À chaque mise à jour de l'appli : augmenter ce numéro (et les ?v= dans index.html). */
const CACHE = 'apero-v2';
const FILES = ['./', 'index.html', 'app.js?v=2', 'data.js?v=2', 'manifest.webmanifest', 'icon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.open(CACHE).then(async c => {
      const hit = await c.match(e.request, { ignoreSearch: e.request.mode === 'navigate' });
      const net = fetch(e.request).then(r => {
        if (r.ok && (r.type === 'basic' || r.type === 'cors')) c.put(e.request, r.clone());
        return r;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
