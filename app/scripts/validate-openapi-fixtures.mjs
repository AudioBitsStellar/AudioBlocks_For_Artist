#!/usr/bin/env node

import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import YAML from "yaml";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, "..");
const repoRoot = resolve(appRoot, "..");

function openApiToJsonSchema(value) {
  if (Array.isArray(value)) return value.map(openApiToJsonSchema);
  if (value === null || typeof value !== "object") return value;

  const { nullable, ...properties } = Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, openApiToJsonSchema(entry)])
  );
  return nullable ? { anyOf: [properties, { type: "null" }] } : properties;
}

const spec = openApiToJsonSchema(
  YAML.parse(readFileSync(resolve(repoRoot, "docs/openapi.yaml"), "utf8"))
);
const fixtures = JSON.parse(readFileSync(resolve(here, "openapi-fixtures.json"), "utf8"));
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
let failed = false;

const mappedFixtures = new Set(fixtures.map((fixture) => fixture.fixture));
const fixtureDirectory = resolve(appRoot, "src/__mocks__/openapi");
for (const file of readdirSync(fixtureDirectory).filter((file) => file.endsWith(".json"))) {
  const fixture = `src/__mocks__/openapi/${file}`;
  if (!mappedFixtures.has(fixture)) {
    console.error(`FAIL ${fixture}: add an OpenAPI mapping in scripts/openapi-fixtures.json`);
    failed = true;
  }
}

for (const fixture of fixtures) {
  const operation = spec.paths?.[fixture.path]?.[fixture.method];
  if (!operation) {
    console.error(
      `FAIL ${fixture.fixture}: no ${fixture.method.toUpperCase()} operation for ${fixture.path}`
    );
    failed = true;
    continue;
  }
  const responseSchema =
    operation?.responses?.[fixture.status]?.content?.["application/json"]?.schema;
  const schema = fixture.schema
    ? fixture.schema
        .slice(2)
        .split("/")
        .reduce((value, key) => value?.[key], spec)
    : responseSchema;

  if (!schema) {
    console.error(
      `FAIL ${fixture.fixture}: no JSON response schema for ${fixture.method.toUpperCase()} ${fixture.path} ${fixture.status}`
    );
    failed = true;
    continue;
  }

  const body = JSON.parse(readFileSync(resolve(appRoot, fixture.fixture), "utf8"));
  const value = fixture.select ? body[fixture.select] : body;
  const validate = ajv.compile({ ...schema, components: spec.components });
  if (!validate(value)) {
    console.error(`FAIL ${fixture.fixture}: response does not match docs/openapi.yaml`);
    for (const error of validate.errors ?? []) {
      console.error(`  ${error.instancePath || "/"}: ${error.message}`);
    }
    failed = true;
  } else {
    console.log(
      `PASS ${fixture.fixture}: ${fixture.method.toUpperCase()} ${fixture.path} ${fixture.status}`
    );
  }
}

if (failed) process.exit(1);
console.log(`Validated ${fixtures.length} mock responses against the backend OpenAPI schema.`);
