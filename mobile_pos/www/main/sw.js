self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open("elnoor-pos-cache-v1").then((cache) =>
      cache.addAll([
        "/main",
        "/main/manifest.json",
        "/assets/mobile_pos/icons/web-app-manifest-192x192.png",
        "/assets/mobile_pos/icons/web-app-manifest-512x512.png"
      ])
    )
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});