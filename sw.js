const CACHE = 'meldpunt-vwo-v5.8.3';
const ASSETS = [
  './','./index.html','./manifest.webmanifest','./assets/styles.css','./assets/config.js','./assets/app.js',
  './assets/icon-192.png','./assets/icon-512.png','./assets/logo-meldpunt-vwo.png'
];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && (k.startsWith('dalton-meldpunt-') || k.startsWith('meldpunt-vwo-'))).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).then(resp => {
    const clone = resp.clone();
    caches.open(CACHE).then(c => c.put(event.request, clone));
    return resp;
  }).catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html'))));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({type:'window', includeUncontrolled:true}).then(list => {
    if (list.length) return list[0].focus();
    return clients.openWindow('./');
  }));
});
