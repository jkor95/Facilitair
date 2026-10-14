const CACHE = 'meldpunt-vwo-v5.8.25';
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

/**
 * Web Push werkt ook wanneer er geen tabblad open is, mits een backend een
 * geldige PushSubscription heeft geregistreerd en een pushbericht verstuurt.
 * Laat de backend uitsluitend neutrale teksten sturen; geen ticketgegevens
 * of persoonsgegevens in push-payloads.
 */
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = {}; }
  const type = payload && payload.type === 'assignment' ? 'assignment' :
    payload && payload.type === 'urgent' ? 'urgent' : 'new';
  const title = type === 'urgent' ? 'SPOED · Meldpunt VWO' :
    type === 'assignment' ? 'Melding aan jou toegewezen' : 'Nieuwe melding · Meldpunt VWO';
  const body = type === 'urgent' ? 'Er is een nieuwe spoedmelding. Open Meldpunt VWO.' :
    type === 'assignment' ? 'Er is een melding aan jou toegewezen.' :
    'Er is een nieuwe facilitaire melding.';
  const id = typeof payload.id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(payload.id) ? payload.id : 'general';
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: './assets/icon-192.png',
    badge: './assets/icon-192.png',
    tag: 'meldpunt-vwo-' + id,
    data: { url: './' }
  }));
});
