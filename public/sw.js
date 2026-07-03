// Eastwood Auction — Service Worker
// Cache-first for static assets, network-first for dynamic content

const CACHE_VERSION = "eastwood-v2";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// Assets to pre-cache on install (app shell)
const PRECACHE_ASSETS = [
  "/",
  "/favicon.ico",
  "/favicon-16x16.png",
  "/favicon-32x32.png",
  "/favicon-48x48.png",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/manifest.json",
  "/robots.txt",
];

// File extensions that should use cache-first strategy
const CACHE_FIRST_EXTS = /\.(?:js|css|png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|eot|mp4|webm|json)$/i;

// Install — pre-cache app shell
self.addEventListener("install", (event) => {
  console.log("[SW] Installing — caching app shell");
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn("[SW] Pre-cache partial failure:", err.message);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating — cleaning old caches");
  const CURRENT_CACHES = [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key.startsWith("eastwood-") && !CURRENT_CACHES.includes(key))
            .map((key) => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch — cache-first for static, network-first for dynamic
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== "GET") return;

  // Skip non-HTTP(S) and browser extensions
  if (!url.protocol.startsWith("http")) return;

  // Skip Supabase API calls — always go network
  if (url.hostname.includes("supabase.co")) {
    event.respondWith(fetch(request));
    return;
  }

  // Skip analytics / tracking
  if (url.hostname.includes("vercel-analytics") || url.hostname.includes("googletagmanager")) {
    event.respondWith(fetch(request));
    return;
  }

  // Skip Google Translate API
  if (url.hostname.includes("translate.google") || url.hostname.includes("translate.googleapis")) {
    event.respondWith(fetch(request));
    return;
  }

  // Skip external image hosts — we proxy them through /api/proxy-image
  if (["images.unsplash.com", "plus.unsplash.com", "images.metmuseum.org", "i.ebayimg.com"].some(
    (h) => url.hostname === h || url.hostname.endsWith("." + h)
  )) {
    // Don't cache direct external requests; they should go through the proxy
    event.respondWith(fetch(request));
    return;
  }

  // Proxy images — cache-first for offline support
  if (url.pathname.startsWith("/api/proxy-image")) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // Static assets → cache-first
  if (CACHE_FIRST_EXTS.test(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // HTML pages / Next.js routes → network-first (ensure fresh content)
  event.respondWith(networkFirst(request));
});

// Cache-first strategy: serve from cache, fall back to network
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Offline — return a fallback for images if available
    if (request.destination === "image") {
      return new Response("", { status: 503, statusText: "Offline" });
    }
    throw err;
  }
}

// Network-first strategy: try network, fall back to cache
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;

    // If it's a navigation request, serve the app shell
    if (request.mode === "navigate") {
      const shell = await caches.match("/");
      if (shell) return shell;
    }

    throw err;
  }
}

// Listen for skip-waiting message from client (trigger immediate update)
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});
