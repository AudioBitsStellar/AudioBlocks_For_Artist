import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { clearSession } from "@/api/axios";

vi.mock("@/api/session", () => ({
  API_PROXY_BASE_URL: "/api/backend",
  endSession: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/api/queryClientInstance", () => ({
  clearQueryCache: vi.fn(),
}));

interface SwHarness {
  listeners: Record<string, ((event: Record<string, unknown>) => void)[]>;
  cacheStores: Map<string, Map<string, Response>>;
  cachesMock: {
    open: ReturnType<typeof vi.fn>;
    match: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    keys: ReturnType<typeof vi.fn>;
  };
  fetchMock: ReturnType<typeof vi.fn>;
}

function loadServiceWorker(): SwHarness {
  const swPath = path.resolve(process.cwd(), "public/sw.js");
  const swCode = fs.readFileSync(swPath, "utf8");

  const listeners: Record<string, ((event: Record<string, unknown>) => void)[]> = {};
  const cacheStores = new Map<string, Map<string, Response>>();

  const getStore = (name: string) => {
    if (!cacheStores.has(name)) cacheStores.set(name, new Map());
    return cacheStores.get(name)!;
  };

  const cachesMock = {
    open: vi.fn(async (name: string) => {
      const store = getStore(name);
      return {
        put: vi.fn(async (req: Request | string, res: Response) => {
          const key = typeof req === "string" ? req : req.url;
          store.set(key, res);
        }),
        add: vi.fn(async () => undefined),
      };
    }),
    match: vi.fn(async (req: Request | string) => {
      const key = typeof req === "string" ? req : req.url;
      for (const store of cacheStores.values()) {
        if (store.has(key)) return store.get(key);
      }
      return undefined;
    }),
    delete: vi.fn(async (name: string) => cacheStores.delete(name)),
    keys: vi.fn(async () => [...cacheStores.keys()]),
  };

  const fetchMock = vi.fn();

  const selfObj = {
    location: { origin: "https://artist.audioblocks.io" },
    addEventListener: (type: string, cb: (event: Record<string, unknown>) => void) => {
      listeners[type] = listeners[type] || [];
      listeners[type].push(cb);
    },
    skipWaiting: vi.fn().mockResolvedValue(undefined),
    clients: { claim: vi.fn().mockResolvedValue(undefined) },
  };

  const sandbox = {
    self: selfObj,
    caches: cachesMock,
    fetch: fetchMock,
    URL,
    Request,
    Response,
    Set,
    Promise,
  };

  vm.runInNewContext(swCode, sandbox);
  return { listeners, cacheStores, cachesMock, fetchMock };
}

function makeFakeResponse(overrides: Partial<Response> = {}): Response {
  return {
    ok: true,
    status: 200,
    type: "basic",
    headers: new Headers(),
    clone() {
      return this;
    },
    ...overrides,
  } as unknown as Response;
}

describe("Service Worker caching & logout purge (#582)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not intercept cross-origin requests, Authorization requests, or /api/* requests", () => {
    const sw = loadServiceWorker();
    const fetchHandler = sw.listeners.fetch[0];

    const cases = [
      new Request("https://api.audioblocks.io/v1/earnings", { method: "GET" }),
      new Request("https://horizon-testnet.stellar.org/accounts/G123", { method: "GET" }),
      new Request("https://artist.audioblocks.io/dashboard", {
        method: "GET",
        headers: { Authorization: "Bearer secret-jwt" },
      }),
      new Request("https://artist.audioblocks.io/api/backend/earnings", { method: "GET" }),
      new Request("https://artist.audioblocks.io/api/session", { method: "GET" }),
    ];

    for (const request of cases) {
      const respondWith = vi.fn();
      fetchHandler({ request, respondWith });
      expect(respondWith).not.toHaveBeenCalled();
    }
  });

  it("caches same-origin navigation pages for offline fallback and purges runtime cache on CLEAR_RUNTIME_CACHE", async () => {
    const sw = loadServiceWorker();
    const fetchHandler = sw.listeners.fetch[0];
    const messageHandler = sw.listeners.message[0];

    const pageReq = new Request("https://artist.audioblocks.io/dashboard/overview", {
      method: "GET",
    });
    const pageRes = makeFakeResponse();
    sw.fetchMock.mockResolvedValueOnce(pageRes);

    let capturedPromise: Promise<Response> | undefined;
    fetchHandler({
      request: pageReq,
      respondWith: (p: Promise<Response>) => {
        capturedPromise = p;
      },
    });
    expect(capturedPromise).toBeDefined();
    await capturedPromise;

    // Runtime cache now holds the page for offline navigation
    expect(sw.cacheStores.get("runtime-audioblocks-v2")?.has(pageReq.url)).toBe(true);

    // Offline navigation falls back to cached page
    sw.fetchMock.mockRejectedValueOnce(new Error("offline"));
    let offlinePromise: Promise<Response> | undefined;
    fetchHandler({
      request: pageReq,
      respondWith: (p: Promise<Response>) => {
        offlinePromise = p;
      },
    });
    expect(await offlinePromise).toBe(pageRes);

    // CLEAR_RUNTIME_CACHE empties the runtime cache
    let waitPromise: Promise<unknown> | undefined;
    messageHandler({
      data: { type: "CLEAR_RUNTIME_CACHE" },
      waitUntil: (p: Promise<unknown>) => {
        waitPromise = p;
      },
    });
    await waitPromise;
    expect(sw.cacheStores.has("runtime-audioblocks-v2")).toBe(false);
  });

  it("clearSession() posts CLEAR_RUNTIME_CACHE to the active service worker", () => {
    const postMessage = vi.fn();
    Object.defineProperty(navigator, "serviceWorker", {
      value: { controller: { postMessage } },
      configurable: true,
    });

    clearSession();
    expect(postMessage).toHaveBeenCalledWith({ type: "CLEAR_RUNTIME_CACHE" });
  });
});
