#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

const appRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const manifestPath = resolve(appRoot, ".next/app-build-manifest.json");
const buildManifestPath = resolve(appRoot, ".next/build-manifest.json");
const loadableManifestPath = resolve(appRoot, ".next/react-loadable-manifest.json");
const budgets = JSON.parse(readFileSync(resolve(appRoot, "performance-budgets.json"), "utf8"));

if (!existsSync(manifestPath) && !existsSync(buildManifestPath)) {
  console.error("Production build manifest not found. Run npm run build first.");
  process.exit(2);
}

if (!existsSync(loadableManifestPath)) {
  console.error("Dynamic import manifest not found. Run npm run build first.");
  process.exit(2);
}

const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : null;
const buildManifest = existsSync(buildManifestPath)
  ? JSON.parse(readFileSync(buildManifestPath, "utf8"))
  : null;
const loadableManifest = JSON.parse(readFileSync(loadableManifestPath, "utf8"));

const filesBySize = new Map();
const failures = [];

function gzipSize(file) {
  if (!filesBySize.has(file)) {
    const absolutePath = resolve(appRoot, ".next", file);
    try {
      filesBySize.set(file, gzipSync(readFileSync(absolutePath), { level: 9 }).length);
    } catch (error) {
      console.error(`Cannot read build asset ${file}: ${error.message}`);
      process.exit(2);
    }
  }
  return filesBySize.get(file);
}

function routeScripts(route) {
  const normalizedRoute = route.replace(/\/page$/, "");
  const routePath = normalizedRoute.replace(/^\//, "");
  const entry = manifest?.app?.[route] ?? manifest?.app?.[`${normalizedRoute}/page`];
  let scripts;

  if (entry) {
    scripts = entry.filter((file) => /\.m?js$/.test(file));
  } else {
    const clientManifestPath = resolve(
      appRoot,
      ".next/server/app",
      routePath,
      "page_client-reference-manifest.js"
    );
    if (!existsSync(clientManifestPath)) return null;

    const sandbox = { globalThis: {} };
    runInNewContext(readFileSync(clientManifestPath, "utf8"), sandbox);
    const clientManifest = sandbox.globalThis.__RSC_MANIFEST?.[`${normalizedRoute}/page`];
    if (!clientManifest?.clientModules) return null;

    scripts = [
      ...(buildManifest?.polyfillFiles ?? []),
      ...(buildManifest?.rootMainFiles ?? []),
      ...Object.values(clientManifest.clientModules).flatMap((module) => module.chunks),
    ].filter((file) => /\.m?js$/.test(file));
  }

  const routeSource = routePath ? `app/${routePath}/page.tsx` : "app/page.tsx";
  const dynamicScripts = Object.entries(loadableManifest)
    .filter(([key]) => key.split("\\").join("/").startsWith(`${routeSource} ->`))
    .flatMap(([, module]) => module.files)
    .filter((file) => /\.m?js$/.test(file));

  return [...new Set([...scripts, ...dynamicScripts])];
}

for (const [route, budget] of Object.entries(budgets.routes)) {
  const scripts = routeScripts(route);
  if (!scripts) {
    failures.push(`${route}: route is missing from the production build manifests`);
    continue;
  }

  const bytes = scripts.reduce((total, file) => total + gzipSize(file), 0);
  const limit = budget.initialJavaScriptGzipBytes;
  const status = bytes <= limit ? "PASS" : "FAIL";
  console.log(
    `${status} ${route}: ${(bytes / 1024).toFixed(1)} KiB gzipped initial JS ` +
      `(budget ${(limit / 1024).toFixed(1)} KiB, ${scripts.length} chunks)`
  );

  if (bytes > limit) {
    failures.push(`${route}: ${bytes} bytes exceeds the ${limit}-byte budget`);
  }
}

if (manifest && !Object.keys(manifest.app ?? {}).length) {
  const available = readdirSync(resolve(appRoot, ".next"));
  failures.push(
    `No App Router routes found in the manifest. Available .next entries: ${available.join(", ")}`
  );
}

if (failures.length) {
  console.error("\nPerformance budget regression:");
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log("All production JavaScript budgets passed.");
