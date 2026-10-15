const CACHE = 'meldpunt-vwo-v5.9.3';
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
// Een duurzame gebeurtenis-id voorkomt opnieuw tonen na worker- of appherstart.
function claimPushEvent(id){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open('meldpunt-vwo-push',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('events',{keyPath:'id'});
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{
      const db=request.result,tx=db.transaction('events','readwrite'),store=tx.objectStore('events');let fresh=false;
      const found=store.get(id);
      found.onsuccess=()=>{if(!found.result){fresh=true;store.put({id,at:Date.now()})}};
      const cursor=store.openCursor();cursor.onsuccess=()=>{const item=cursor.result;if(!item)return;if(item.value.at<Date.now()-30*86400000)item.delete();item.continue()};
      tx.oncomplete=()=>{db.close();resolve(fresh)};
      tx.onerror=()=>{db.close();reject(tx.error)};
      tx.onabort=()=>{db.close();reject(tx.error)};
    };
  });
}
self.addEventListener('push',event=>event.waitUntil((async()=>{
  let data;try{data=event.data?.json()}catch{return}
  if(!data||!/^[0-9a-f-]{36}$/i.test(String(data.eventId||''))||typeof data.body!=='string')return;
  if(!await claimPushEvent(data.eventId))return;
  const ticketId=Number(data.ticketId);
  await self.registration.showNotification(String(data.title||'Meldpunt VWO').slice(0,150),{
    body:data.body.slice(0,500),icon:'./assets/icon-192.png',badge:'./assets/icon-192.png',
    tag:`dm-push-${data.eventId}`,renotify:false,
    data:{ticketId:Number.isSafeInteger(ticketId)&&ticketId>0?ticketId:null},
  });
})()));
self.addEventListener('pushsubscriptionchange',event=>event.waitUntil((async()=>{
  // Het custom sessietoken blijft in de pagina, nooit in de worker opslaan.
  const windows=await clients.matchAll({type:'window',includeUncontrolled:true});
  windows.forEach(client=>client.postMessage({type:'DM_PUSH_RENEW_REQUIRED'}));
})()));
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({type:'window', includeUncontrolled:true}).then(list => {
    const ticketId=Number(event.notification.data?.ticketId),url=new URL('./',self.registration.scope);
    if(Number.isSafeInteger(ticketId)&&ticketId>0)url.searchParams.set('ticket',String(ticketId));
    const client=list.find(client=>new URL(client.url).origin===url.origin);
    if(client)return (url.search?client.navigate(url.href):Promise.resolve(client)).then(next=>(next||client).focus());
    return clients.openWindow(url.href);
  }));
});
