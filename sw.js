const CACHE='veylmoor-v47';
const CORE=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','icon-maskable-512.png','apple-touch-icon.png','privacy.html','terms.html',
  'fonts/alegreya-latin-400-normal.woff2','fonts/alegreya-latin-500-normal.woff2','fonts/alegreya-latin-700-normal.woff2','fonts/alegreya-sans-latin-700-normal.woff2','fonts/alegreya-sans-latin-800-normal.woff2','fonts/im-fell-english-sc-latin-400-normal.woff2','fonts/marcellus-latin-400-normal.woff2'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;
  const net=fetch(e.request).then(r=>{if(r&&r.status!==206&&(r.ok||r.type==='opaque')){const cp=r.clone();return caches.open(CACHE).then(c=>c.put(e.request,cp)).then(()=>r,()=>r)}return r});
  e.waitUntil(net.catch(()=>{}));
  e.respondWith(caches.match(e.request).then(hit=>hit?(net.catch(()=>{}),hit):net))});
