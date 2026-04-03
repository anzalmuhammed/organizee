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

// Install: Cache all files
self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Activate: Cleanup old caches
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

// Fetch: Offline support
self.addEventListener("fetch", (e) => {
  if (!e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    })
  );
});

// Handle Notification Clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/organizee/')
  );
});