/* ═══════════════════════════════════════════════════════════
   MCU TRACKER — SERVICE WORKER (Smart Cache)
   ═══════════════════════════════════════════════════════════ */

const CACHE_NAME = 'mcu-tracker-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/css/themes.css',
  '/css/animations.css',
  '/js/firebase.js',
  '/js/theme.js',
  '/js/auth.js',
  '/js/movies.js',
  '/js/tracker.js',
  '/js/admin.js',
  'icon-192.png',
  'icon-512.png'
];

// 1. Install Event (Files ko cache mein save karo)
self.addEventListener('install', event => {
  self.skipWaiting(); // Naya service worker turant active ho jaye
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Opened cache');
      return cache.addAll(urlsToCache);
    })
  );
});

// 2. Activate Event (Purane cache ko delete karo)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // Naya SW turant control le le
});

// 3. Fetch Event (Smart Strategy: Pehle internet, phir cache)
self.addEventListener('fetch', event => {
  // Sirf GET requests handle karo
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Agar internet chal raha hai, toh nayi file cache mein save karo
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Agar internet nahi hai, toh cache se file do
        return caches.match(event.request);
      })
  );
});