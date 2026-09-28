var CACHE_NAME = 'greaz-dashboard-shell-v1';
var CORE_ASSETS = ['./greaz-dashboard.html', './manifest-dashboard.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){ return cache.addAll(CORE_ASSETS); })
      .catch(function(){})
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event){
  var req = event.request;
  if(req.method !== 'GET') return;
  if(!req.url.startsWith(self.location.origin)) return; // ne jamais cacher Firebase/EmailJS
  if(req.mode === 'navigate'){
    event.respondWith(
      fetch(req).then(function(res){
        var clone = res.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(req, clone); });
        return res;
      }).catch(function(){
        return caches.match(req).then(function(cached){ return cached || caches.match('./greaz-dashboard.html'); });
      })
    );
    return;
  }
  event.respondWith(
    caches.match(req).then(function(cached){
      var network = fetch(req).then(function(res){
        if(res && res.status === 200){
          var clone = res.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(req, clone); });
        }
        return res;
      }).catch(function(){ return cached; });
      return cached || network;
    })
  );
});
