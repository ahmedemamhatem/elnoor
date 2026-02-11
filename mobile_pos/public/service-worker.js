const CACHE_NAME = "mini-pos-cache-v3";
const URLS_TO_CACHE = [
  "/app/mini-pos",
  "/assets/mobile_pos/icon-192.png",
  "/assets/mobile_pos/icon-512.png",
  "/assets/mobile_pos/manifest.json"
  // Add other static assets like CSS/JS if needed.
];

// Install event
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
});

// Activate event
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

// Fetch event
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response =>
      response || fetch(event.request)
    )
  );
});