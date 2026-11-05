const CACHE_NAME = "atlas-pwa-v4";
const PRECACHE_URLS = [
  "/manifest.webmanifest",
  "/favicon.ico?v=4",
  "/icons/sphere-192.png?v=4",
  "/icons/sphere-512.png?v=4",
  "/icons/sphere-maskable-512.png?v=4",
  "/sphere-apple-touch-icon.png?v=4",
  "/assets/atlas-body-3d.png?v=4",
  "/assets/atlas-body-depth.png?v=4",
  "/assets/celestial-globe-map.jpg?v=4",
  "/audio/greeting-morning.mp3",
  "/audio/greeting-afternoon.mp3",
  "/audio/greeting-evening.mp3",
  "/audio/greeting-night.mp3",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.all(
          PRECACHE_URLS.map((u) =>
            fetch(u, { cache: "reload" })
              .then((res) => (res.ok ? cache.put(u, res) : undefined))
              .catch(() => undefined)
          )
        )
      )
      .catch(() => undefined)
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;

  // Always network-first bypassing stale HTTP cache for HTML navigations & Next data
  if (req.mode === "navigate" || url.pathname.startsWith("/_next/")) {
    event.respondWith(
      fetch(req, { cache: "no-cache" })
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const clone = res.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(req, clone))
              .catch(() => undefined);
          }
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === "basic") {
          const clone = res.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(req, clone))
            .catch(() => undefined);
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
