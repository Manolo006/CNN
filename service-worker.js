const CACHE_NAME = 'carte-pokemon-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/pokestyle.css',
  '/scan.js',
  '/images/icon-192x192.png',
  '/images/icon-512x512.png',
  // Aggiungi altre risorse che desideri siano disponibili offline
];

// Installa il service worker e memorizza nella cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache memorizzata durante l\'installazione del Service Worker');
        return cache.addAll(urlsToCache);
      })
  );
});

// Intercetta le richieste e risponde con la cache o la rete
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se troviamo la risorsa nella cache, la restituiamo
        if (response) {
          return response;
        }
        // Altrimenti, facciamo una richiesta di rete
        return fetch(event.request);
      })
  );
});
