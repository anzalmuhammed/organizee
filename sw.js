const CACHE_NAME = "organizee-v3";
const ASSETS = [
  "/organizee/",
  "/organizee/index.html",
  "/organizee/js/script.js",
  "/organizee/css/style.css",
  "/organizee/manifest.json",
  "/organizee/assets/images/logo.png",
  "/organizee/assets/images/moon.png",
  "/organizee/assets/images/sun.png",
  "/organizee/assets/images/more.svg",
  "/organizee/assets/images/delete.svg",
  "/organizee/assets/images/plus.svg",
  "/organizee/assets/images/revert.svg",
  "/organizee/assets/images/alarm.svg",
  "/organizee/assets/audios/alarm.mp3"
];

// Install Event
self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Activate Event
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
});

// Fetch Event
self.addEventListener("fetch", (e) => {
  // Skip cross-origin requests (like Google Fonts or Analytics) if you have any
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(e.request).then((networkResponse) => {
        // Optional: Cache new files on the fly
        if (networkResponse.status === 200) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, cacheCopy));
        }
        return networkResponse;
      }).catch(() => {
        // If both fail, you could return a custom offline page here
      });
    })
  );
});