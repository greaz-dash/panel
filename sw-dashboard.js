var CACHE_NAME = 'greaz-dashboard-shell-v1';
var CORE_ASSETS = ['./gx7k2-panel.html', './manifest-dashboard.json', './icon-192.png', './icon-512.png'];

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

// ═══ Notifications push — reçues même quand le panneau est complètement
// fermé. Le serveur (fonction Supabase "send-push") envoie un message
// chiffré ; c'est ce code qui l'affiche comme une vraie notification. ═══
self.addEventListener('push', function(event){
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e){}
  var title = data.title || '🔧 Greaz Gestion';
  var body = data.body || 'Nouvelle activité sur Greaz.';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      tag: 'greaz-push-' + Date.now(),
      data: { tab: data.tab || '' }
    })
  );
});

self.addEventListener('notificationclick', function(event){
  event.notification.close();
  var targetUrl = './gx7k2-panel.html';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList){
      for (var i = 0; i < clientList.length; i++){
        var c = clientList[i];
        if (c.url.indexOf('gx7k2-panel.html') !== -1 && 'focus' in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
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
        return caches.match(req).then(function(cached){ return cached || caches.match('./gx7k2-panel.html'); });
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
