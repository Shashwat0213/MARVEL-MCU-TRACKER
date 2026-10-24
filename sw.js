/* ═══════════════════════════════════════════════════════════
   MCU TRACKER — SERVICE WORKER (PWA Install Fix)
   ═══════════════════════════════════════════════════════════ */

const CACHE_NAME = 'mcu-tracker-v4';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ⚡ Ye handler Chrome Android mein PWA install option unlock karta hai ⚡
self.addEventListener('fetch', (event) => {
  // Sirf GET requests handle karo
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});