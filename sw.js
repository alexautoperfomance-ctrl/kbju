const V='1.13.1',C='kbju-'+V,F=['./','index.html','app.js','parser.js','nutri.js','db.js','micro.js','micros.js','menu.js','cook.js','dictate.js','chains.js','manifest.json','icon-192.png','icon-512.png','apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(F.map(u=>new Request(u,{cache:'reload'})))));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
// network-first без HTTP-кэша (cache:'no-store' — iOS не отдаст устаревший index.html); офлайн — из кэша
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||!r.url.startsWith(self.location.origin))return;
 const nav=r.mode==='navigate';e.respondWith(fetch(nav?r.url:new Request(r,{cache:'no-store'}),nav?{cache:'no-store',credentials:'same-origin'}:undefined)
 .then(res=>{if(res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(r,cp))}return res})
 .catch(()=>caches.match(r,{ignoreSearch:true}).then(x=>x||caches.match('index.html'))))});
