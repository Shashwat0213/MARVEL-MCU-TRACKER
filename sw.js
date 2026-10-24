const CACHE_NAME = 'mcu-tracker-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/themes.css',
  '/css/animations.css',
  '/js/firebase.js',
  '/js/theme.js',
  '/js/auth.js',
  '/js/movies.js',
  '/js/tracker.js',
  '/js/admin.js'
];

// Install Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch from cache if offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});