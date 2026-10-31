/* ═══════════════════════════════════════════════════════════
   MCU TRACKER — SERVICE WORKER (Proper PWA Caching)
   ═══════════════════════════════════════════════════════════ */

const CACHE_NAME = 'mcu-tracker-v5';
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./css/style.css",
  "./css/themes.css",
  "./css/animations.css",
  "./js/firebase.js",
  "./js/theme.js",
  "./js/auth.js",
  "./js/movies.js",
  "./js/tracker.js",
  "./js/admin.js"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(STATIC_ASSETS).catch(function (err) {
        console.warn("⚠️ Some assets failed to cache:", err);
      });
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (name) {
          if (name !== CACHE_NAME) return caches.delete(name);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (!url.protocol.startsWith("http")) return;

  // Skip Firebase & Render API calls (Network only)
  if (
    url.hostname.includes("firebase") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("gstatic.com") ||
    url.hostname.includes("firestore") ||
    url.hostname.includes("marvel-mcu-tracker.onrender.com")
  ) {
    return;
  }

  // HTML navigation requests
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, responseClone);
          }).catch(function () {});
          return response;
        })
        .catch(function () {
          return caches.match(request).then(function (cached) {
            return cached || caches.match("./index.html");
          });
        })
    );
    return;
  }

  // CSS / JS / Fonts
  event.respondWith(
    caches.match(request).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (response) {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, responseClone);
          }).catch(function () {});
        }
        return response;
      }).catch(function () {
        return caches.match(request);
      });
    })
  );
});