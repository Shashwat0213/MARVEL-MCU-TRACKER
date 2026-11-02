/* ═══════════════════════════════════════════════════════════
   MCU TRACKER — SERVICE WORKER (Proper PWA Caching)
   ═══════════════════════════════════════════════════════════ */

const CACHE_NAME = 'mcu-tracker-v7';
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./mcu_tracker_icon_192x192.png",
  "./mcu_tracker_icon_512x512.png",
  "./mcu_tracker_icon_192x192_maskable.png",
  "./mcu_tracker_icon_512x512_maskable.png",
  "./apple-touch-icon.png",
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

// Live API calls — always go straight to the network (never cached)
const NETWORK_ONLY_HOSTS = [
  "firestore.googleapis.com",
  "identitytoolkit.googleapis.com",
  "securetoken.googleapis.com",
  "firebaseinstallations.googleapis.com",
  "www.googleapis.com",
  "apis.google.com",
  "marvel-mcu-tracker.onrender.com",
  "api.web3forms.com"
];

function isNetworkOnly(url) {
  return (
    NETWORK_ONLY_HOSTS.includes(url.hostname) ||
    url.hostname.endsWith(".firebaseapp.com") ||
    url.hostname.endsWith(".firebaseio.com")
  );
}

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // Cache each file on its own: one missing file must not stop the rest
      // (cache.addAll fails as a whole if a single request fails).
      return Promise.all(
        STATIC_ASSETS.map(function (asset) {
          return cache.add(asset).catch(function (err) {
            console.warn("⚠️ Could not cache " + asset + ":", err);
          });
        })
      );
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
  if (isNetworkOnly(url)) return;

  // HTML navigation requests: network first, cached page when offline
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

  // Our own CSS / JS / manifest: network first, so a new deploy is picked up
  // immediately; the cached copy is used only when offline.
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(request, responseClone);
            }).catch(function () {});
          }
          return response;
        })
        .catch(function () {
          return caches.match(request);
        })
    );
    return;
  }

  // Third-party files (Firebase SDK modules, Google Fonts, images): cache first
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
