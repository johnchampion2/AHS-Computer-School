const C="ahs-v1";
const ASSETS=["./","index.html","css/style.css","js/app.js","js/config.js","manifest.json","assets/images/school-logo.png","assets/images/computer.png","assets/icons/icon-192.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",e=>{
  const r=e.request;if(r.method!=="GET")return;
  const u=new URL(r.url);
  if(u.hostname.endsWith("script.google.com")||u.hostname.endsWith("googleusercontent.com"))return; // never cache the API
  e.respondWith(fetch(r).then(res=>{
    if(res.ok&&(u.origin===location.origin||u.hostname==="cdnjs.cloudflare.com")){const cp=res.clone();caches.open(C).then(c=>c.put(r,cp));}
    return res;
  }).catch(()=>caches.match(r).then(m=>m||caches.match("index.html"))));
});
