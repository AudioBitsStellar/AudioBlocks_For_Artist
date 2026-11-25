/* AudioBlocks service worker – issues #175, #582
 *
 * Strategies:
 *   - Static assets (JS, CSS, images, fonts) on same-origin or allow-listed CDNs: cache-first
 *   - Same-origin page navigations (HTML pages): network-first, fall back to cache (and "/" shell)
 *   - API requests (`/api/*`), cross-origin requests (outside static CDN allow-list),
 *     requests carrying an `Authorization` header, and non-GET requests: NEVER intercepted or cached
 *
 * Cache invalidation on new deployments is handled by bumping CACHE_VERSION.
 * Old caches are purged in the `activate` handler so users receive the new shell.
 * Logging out posts `{ type: "CLEAR_RUNTIME_CACHE" }` to purge runtime cached pages.
 */

const CACHE_VERSION = "audioblocks-v2";
const SHELL_CACHE = `shell-${CACHE_VERSION}`;
const ASSET_CACHE = `assets-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "/",
  "/login",
  "/signup",
  "/favicon.ico",
  "/logo.png",
  "/logo2.png",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// Explicit allow-list of static CDN origins that may serve immutable static assets.
// API hosts, Horizon, Privy, and other third-party origins must NEVER be added here.
const STATIC_CDN_ORIGINS = new Set([]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Use { cache: 'reload' } to bypass any HTTP cache during precache.
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            await cache.add(new Request(url, { cache: "reload" }));
          } catch {
            // Ignore individual failures – non-critical, the runtime cache will pick up later.
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          // Drop caches that aren't tied to the current CACHE_VERSION.
          .filter((k) => !k.endsWith(`-${CACHE_VERSION}`))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle http(s); never intercept dev tools/extensions.
  if (!request.url.startsWith("http")) return;

  // Only handle GET requests; mutating requests bypass the SW entirely.
  if (request.method !== "GET") return;

  // Never intercept requests carrying an Authorization header.
  if (request.headers.has("authorization")) return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Never intercept cross-origin requests unless explicitly allow-listed for static assets.
  if (!isSameOrigin) {
    if (STATIC_CDN_ORIGINS.has(url.origin) && isStaticAsset(url.pathname)) {
      event.respondWith(cacheFirst(request, ASSET_CACHE));
    }
    return;
  }

  // Never intercept same-origin API or session proxy routes (/api/*).
  if (url.pathname.startsWith("/api/")) return;

  // Cache-first for static assets.
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  // Network-first for same-origin page navigations and non-API documents.
  event.respondWith(networkFirst(request, RUNTIME_CACHE));
});

function isStaticAsset(pathname) {
  return /\.(?:js|css|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot|map)$/i.test(pathname);
}

function isCacheableResponse(response) {
  if (!response || !response.ok || response.type !== "basic") return false;
  const cacheControl = response.headers?.get("cache-control") || "";
  if (/\b(?:no-store|private)\b/i.test(cacheControl)) return false;
  return true;
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (isCacheableResponse(response)) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    if (cached) return cached;
    return Response.error();
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (isCacheableResponse(response)) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Last-resort fallback for page navigations: return the precached "/" shell.
    if (request.mode === "navigate") {
      const shell = await caches.match("/");
      if (shell) return shell;
    }
    return Response.error();
  }
}

self.addEventListener("message", (event) => {
  // Allow the page to trigger an immediate skip + activation.
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  // Clear runtime cache on logout so cached pages cannot leak across accounts (#582).
  if (event.data && typeof event.data === "object" && event.data.type === "CLEAR_RUNTIME_CACHE") {
    const clearPromise = caches.delete(RUNTIME_CACHE);
    if (typeof event.waitUntil === "function") {
      event.waitUntil(clearPromise);
    }
  }
});
