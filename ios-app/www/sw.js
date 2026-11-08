/* Offline cache for the PWA build.
 *
 * The whole app is a handful of static files, so a cache-first strategy with a
 * versioned cache name gives full offline use — which matters for a tool used
 * standing at a street corner, possibly without signal.
 *
 * Bump CACHE_VERSION whenever www/ changes, or the old files keep being served.
 */
const CACHE_VERSION = "gapsense-v26";
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/app.css",
  "./js/engine.js",
  "./js/history.js",
  "./js/features.js",
  "./js/students.js",
  "./js/signal.js",
  "./js/comparison.js",
  "./js/app.js",
  "./js/store.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

/*
 * Install all or nothing (tracker 20.17). If any file fails to download (a
 * poor connection), the install fails and the phone keeps the previous,
 * complete copy; the next visit tries again. Tolerating misses used to put
 * in charge a copy with files missing, and delete the complete one.
 */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: "reload" }))))
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
 * opened the demo once kept seeing that old version after every update. Now,
 * whenever the phone is online it gets the current files and refreshes the
 * cache; offline, at a street corner without signal, the cached copy works.
 *
 * Tracker 20.17: on a weak signal the network is given 3 seconds; after that
 * the saved copy is used (and the network's answer, if it comes, still
 * refreshes the cache). Only a page request falls back to the home page; a
 * missing script or style fails plainly instead of getting a page in its
 * place.
 */
const NETWORK_WAIT_MS = 3000;

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isPage = request.mode === "navigate";
  const network = fetch(request, { cache: "no-cache" }).then((response) => {
    if (response && response.ok) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy)));
    }
    return response;
  });
  // Keep the service worker alive until the network has answered, so a
  // late answer still refreshes the cache.
  event.waitUntil(network.catch(() => null));

  const fromCache = () => caches.match(request, { ignoreSearch: true })
    .then((cached) => cached || (isPage ? caches.match("./index.html") : null));

  event.respondWith(new Promise((resolve) => {
    let settled = false;
    const finish = (response) => {
      if (settled || !response) return false;
      settled = true;
      resolve(response);
      return true;
    };
    const timer = setTimeout(() => {
      fromCache().then((cached) => { finish(cached); });
    }, NETWORK_WAIT_MS);
    network
      .then((response) => { clearTimeout(timer); finish(response); })
      .catch(() => {
        clearTimeout(timer);
        fromCache().then((cached) => { if (!finish(cached)) finish(Response.error()); });
      });
  }));
});
