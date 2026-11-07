/* Hors-ligne : on garde l'appli en cache, et on la met à jour en arrière-plan. */
/* À chaque mise à jour : augmenter ce numéro, les ?v= ici et dans index.html, VERSION dans app.js et version.json. */
const CACHE = 'apero-v29';
const FILES = ['./', 'index.html', 'app.js?v=29', 'data.js?v=29', 'data-epice.js?v=29', 'data-enigmes.js?v=29', 'online.js?v=29', 'online-social.js?v=29', 'online-vote.js?v=29', 'online-cards.js?v=29', 'online-board.js?v=29', 'online-live.js?v=29', 'vendor/peerjs-1.5.4.min.js', 'vendor/qrcode-1.4.4.js', 'manifest.webmanifest', 'icon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).pathname.endsWith('/version.json')) return;   // toujours la version en ligne
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
