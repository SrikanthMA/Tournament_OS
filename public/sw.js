const CACHE_NAME = "tournament-os-v3";
const STATIC_CACHE_PREFIX = "tournament-os-";

self.addEventListener("install", () => {
  // Activate the new service worker immediately after deployment.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames
          .filter(
            (cacheName) =>
              cacheName.startsWith(STATIC_CACHE_PREFIX) &&
              cacheName !== CACHE_NAME,
          )
          .map((cacheName) => caches.delete(cacheName)),
      );

      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Never interfere with non-GET requests.
  if (request.method !== "GET") {
    return;
  }

  // Never cache or intercept backend/API/realtime traffic.
  if (
    url.hostname === "tournament-os.onrender.com" ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/socket.io/")
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // Do not cache any other cross-origin request.
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(request));
    return;
  }

  // Always prefer the newest application shell on page navigation.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request, { cache: "no-store" });

          if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, networkResponse.clone());
          }

          return networkResponse;
        } catch {
          return (
            (await caches.match(request)) ||
            (await caches.match("/")) ||
            new Response("TournamentOS is currently offline.", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
          );
        }
      })(),
    );
    return;
  }

  // Static assets: use cached content immediately and refresh it in background.
  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(request);

      const networkPromise = fetch(request)
        .then(async (networkResponse) => {
          if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, networkResponse.clone());
          }

          return networkResponse;
        })
        .catch(() => undefined);

      if (cachedResponse) {
        event.waitUntil(networkPromise);
        return cachedResponse;
      }

      return (
        (await networkPromise) ||
        new Response("Resource unavailable while offline.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        })
      );
    })(),
  );
});
