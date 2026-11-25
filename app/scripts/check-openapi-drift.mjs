#!/usr/bin/env node
/**
 * Fails when the vendored backend OpenAPI document (docs/openapi.yaml) no
 * longer matches the backend repository. This is what makes generated types
 * drift visible in CI: update the snapshot and re-run `npm run api:types`
 * instead of editing src/types/generated/api.ts by hand.
 *
 * Override the upstream location with OPENAPI_UPSTREAM_URL (useful for forks
 * or a pinned commit during an incident).
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../..");
const SPEC_PATH = resolve(REPO_ROOT, "docs/openapi.yaml");
const UPSTREAM_URL =
  process.env.OPENAPI_UPSTREAM_URL ||
  "https://raw.githubusercontent.com/AudioBitsStellar/AudioBlock_Backend/main/docs/openapi.yaml";
const ATTEMPTS = 3;

function normalize(text) {
  return text.replace(/\r\n/g, "\n").replace(/\s+$/, "\n");
}

async function fetchSpec() {
  let lastError;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const response = await fetch(UPSTREAM_URL, {
        signal: AbortSignal.timeout(30_000),
        headers: { "user-agent": "audioblocks-api-types-drift" },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < ATTEMPTS) {
        await new Promise((resolveWait) => setTimeout(resolveWait, attempt * 2_000));
      }
    }
  }
  console.error(
    `Could not fetch ${UPSTREAM_URL} after ${ATTEMPTS} attempts: ${lastError?.message ?? lastError}`
  );
  console.error(
    "If the backend repository moved, set OPENAPI_UPSTREAM_URL to the new raw specs URL."
  );
  process.exit(2);
}

function firstDifference(expected, actual) {
  const expectedLines = expected.split("\n");
  const actualLines = actual.split("\n");
  const length = Math.max(expectedLines.length, actualLines.length);
  for (let index = 0; index < length; index++) {
    if (expectedLines[index] !== actualLines[index]) {
      return {
        line: index + 1,
        expected: expectedLines[index] ?? "<end of file>",
        actual: actualLines[index] ?? "<end of file>",
      };
    }
  }
  return null;
}

const vendored = normalize(readFileSync(SPEC_PATH, "utf8"));
const upstream = normalize(await fetchSpec());

if (vendored === upstream) {
  console.log(`docs/openapi.yaml matches ${UPSTREAM_URL}.`);
  process.exit(0);
}

const difference = firstDifference(vendored, upstream);
console.error("Backend OpenAPI drift detected: docs/openapi.yaml is stale.");
if (difference) {
  console.error(`  first difference at line ${difference.line}`);
  console.error(`  vendored: ${difference.expected}`);
  console.error(`  upstream: ${difference.actual}`);
}
console.error("");
console.error("Refresh the snapshot and regenerate types:");
console.error(`  curl -fsSL ${UPSTREAM_URL} -o docs/openapi.yaml`);
console.error("  cd app && npm run api:types");
process.exit(1);
