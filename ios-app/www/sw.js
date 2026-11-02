/* Offline cache for the PWA build.
 *
 * The whole app is a handful of static files, so a cache-first strategy with a
 * versioned cache name gives full offline use — which matters for a tool used
 * standing at a street corner, possibly without signal.
 *
 * Bump CACHE_VERSION whenever www/ changes, or the old files keep being served.
 */
const CACHE_VERSION = "gapsense-v20";
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/app.css",
  "./js/engine.js",
  "./js/history.js",
  "./js/features.js",
  "./js/signal.js",
  "./js/comparison.js",
  "./js/app.js",
  "./js/vendor/qrcode.js",
  "./js/store.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      // addAll is atomic: one bad URL fails the whole install, so tolerate
      // individual misses instead of shipping a broken worker.
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

/*
 * Network first, cache as the offline fallback. The earlier cache-first
 * strategy served whatever was cached on the first visit, so a tester who had
 * opened the demo once kept seeing that old version (with the removed
 * "Measure my crossing" step) after every update. Now, whenever the phone is
 * online it gets the current files and refreshes the cache; offline, at a
 * street corner without signal, the cached copy still works.
 */
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request, { cache: "no-cache" })
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy)));
        }
        return response;
      })
      .catch(() =>
        caches.match(request, { ignoreSearch: true }).then((cached) => cached || caches.match("./index.html"))
      )
  );
});
