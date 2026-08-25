"use client";

import { useEffect } from "react";

/**
 * Registers the AudioBlocks service worker on the client.
 *
 * Registration is deliberately deferred until after hydration because
 * `navigator.serviceWorker` is not available during SSR. We additionally
 * gate registration on `next/script`-friendly environments (HTTPS or
 * localhost) to avoid throwing on plain http:// origins.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Avoid registering twice in dev (React StrictMode re-runs effects).
    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        // Listen for waiting workers and activate them on the next reload
        // so users get the latest shell without manual intervention.
        if (registration.waiting) {
          registration.waiting.postMessage("SKIP_WAITING");
        }
        // Track whether we've already initiated a reload so the listener
        // only fires once per controller swap.
        let reloaded = false;
        const onControllerChange = () => {
          if (reloaded) return;
          reloaded = true;
          // Reloading ensures newly cached assets are actually served and
          // that any in-memory SW-controlled state (e.g. background sync
          // handlers from a future iteration) is consistent.
          window.location.reload();
        };
        navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              newWorker.postMessage("SKIP_WAITING");
            }
          });
        });
      } catch (err) {
        // Service worker registration is non-fatal – log quietly so the app still runs.
        console.warn("[sw] registration failed", err);
      }
    };

    // Defer until after page load to keep first paint snappy.
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  return null;
}
