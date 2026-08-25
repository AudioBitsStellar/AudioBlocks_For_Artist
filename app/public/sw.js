/* AudioBlocks service worker – issue #175
 *
 * Strategies:
 *   - Static assets (JS, CSS, images, fonts):  cache-first
 *   - Navigations (HTML pages):                network-first, fall back to cache (and "/" if nothing else)
 *   - Same-origin GET (incl. API responses):   network-first, fall back to cache for offline reading
 *   - Mutating requests (POST/PUT/PATCH/DELETE): never cached
 *
 * Cache invalidation on new deployments is handled by bumping CACHE_VERSION.
 * Old caches are purged in the `activate` handler so users receive the new shell.
 */

const CACHE_VERSION = "audioblocks-v1";
const SHELL_CACHE = `shell-${CACHE_VERSION}`;
const ASSET_CACHE = `assets-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "/",
  "/login",
  "/signup",
  "/dashboard",
  "/favicon.ico",
  "/logo.png",
  "/logo2.png",
  "/next.svg",
  "/vercel.svg",
];

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Use { cache: 'reload' } to bypass any HTTP cache during precache.
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            await cache.add(new Request(url, { cache: "reload" }));
          } catch (err) {
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

  // Mutating requests bypass the SW entirely.
  if (MUTATING_METHODS.has(request.method)) return;

  // Cache-first for static assets.
  if (isStaticAsset(request.url)) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  // Network-first for everything else (navigations + API GETs).
  event.respondWith(networkFirst(request, RUNTIME_CACHE));
});

function isStaticAsset(url) {
  return /\.(?:js|css|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot|map)(?:\?.*)?$/i.test(
    new URL(url).pathname
  );
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type === "basic") {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    if (cached) return cached;
    return Response.error();
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type === "basic") {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
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
  }
});
