#!/usr/bin/env node
/**
 * Generates TypeScript types from the vendored backend OpenAPI document.
 *
 * Source of truth: ../docs/openapi.yaml (a pinned copy of
 * AudioBitsStellar/AudioBlock_Backend `docs/openapi.yaml`).
 *
 * Usage:
 *   node scripts/generate-api-types.mjs           # write src/types/generated/api.ts
 *   node scripts/generate-api-types.mjs --check   # fail if the file is stale
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_DIR = resolve(HERE, "..");
const REPO_ROOT = resolve(APP_DIR, "..");
const SPEC_PATH = process.env.OPENAPI_SPEC
  ? resolve(process.env.OPENAPI_SPEC)
  : resolve(REPO_ROOT, "docs/openapi.yaml");
const OUTPUT_PATH = resolve(APP_DIR, "src/types/generated/api.ts");
const CHECK = process.argv.includes("--check");

const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "options", "head", "trace"];
const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function fail(message) {
  console.error(`generate-api-types: ${message}`);
  process.exit(1);
}

function pascalCase(value) {
  const words = value
    .replace(/\{([^}]+)\}/g, " $1 ")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

function propertyKey(name) {
  return IDENTIFIER.test(name) ? name : JSON.stringify(name);
}

function literal(value) {
  return JSON.stringify(value);
}

function renderType(schema, spec, indent = 0) {
  if (!schema) return "unknown";
  if (schema.$ref) {
    const prefix = "#/components/schemas/";
    if (!schema.$ref.startsWith(prefix)) {
      fail(`unsupported $ref ${schema.$ref}`);
    }
    return schema.$ref.slice(prefix.length);
  }
  if (Array.isArray(schema.oneOf)) {
    const type = schema.oneOf.map((entry) => renderType(entry, spec, indent)).join(" | ");
    return schema.nullable ? `(${type}) | null` : type;
  }
  if (Array.isArray(schema.anyOf)) {
    const type = schema.anyOf.map((entry) => renderType(entry, spec, indent)).join(" | ");
    return schema.nullable ? `(${type}) | null` : type;
  }
  if (Array.isArray(schema.allOf)) {
    const type = schema.allOf.map((entry) => renderType(entry, spec, indent)).join(" & ");
    return schema.nullable ? `(${type}) | null` : type;
  }

  let type;
  if (Array.isArray(schema.enum)) {
    type = schema.enum.map(literal).join(" | ");
  } else if (schema.type === "array") {
    const item = renderType(schema.items, spec, indent);
    type = `Array<${item}>`;
  } else if (schema.type === "object" || schema.properties) {
    type = renderObject(schema, spec, indent);
  } else if (schema.type === "integer" || schema.type === "number") {
    type = "number";
  } else if (schema.type === "boolean") {
    type = "boolean";
  } else if (schema.type === "string" && schema.format === "binary") {
    type = "File";
  } else if (schema.type === "string") {
    type = "string";
  } else if (schema.type === "null") {
    type = "null";
  } else {
    type = "unknown";
  }

  return schema.nullable ? `(${type}) | null` : type;
}

function renderObject(schema, spec, indent) {
  const properties = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  const names = Object.keys(properties);

  if (names.length === 0) {
    if (schema.additionalProperties === true) return "Record<string, unknown>";
    if (schema.additionalProperties) {
      return `Record<string, ${renderType(schema.additionalProperties, spec, indent)}>`;
    }
    return "Record<string, unknown>";
  }

  const pad = "  ".repeat(indent);
  const childPad = "  ".repeat(indent + 1);
  const lines = names.map((name) => {
    const optional = required.has(name) ? "" : "?";
    return `${childPad}${propertyKey(name)}${optional}: ${renderType(properties[name], spec, indent + 1)};`;
  });
  return `{\n${lines.join("\n")}\n${pad}}`;
}

function pathName(path) {
  return pascalCase(path.replace(/^\/+/, ""));
}

/**
 * Emits a named declaration. `interface` only works for plain object shapes;
 * arrays and unions (e.g. the /api/batch body) need a type alias.
 */
function declaration(name, schema, spec, indent = 0) {
  const type = renderType(schema, spec, indent);
  return type.startsWith("{")
    ? `export interface ${name} ${type}`
    : `export type ${name} = ${type};`;
}

function responseType(operation, spec) {
  const entries = Object.entries(operation.responses ?? {}).map(([status, response]) => {
    const schema =
      response?.content?.["application/json"]?.schema ??
      response?.content?.["application/octet-stream"]?.schema;
    const key = /^\d+$/.test(status) ? status : JSON.stringify(status);
    return `        ${key}: ${schema ? renderType(schema, spec, 4) : "unknown"};`;
  });
  if (entries.length === 0) {
    // A few backend operations document only a summary.
    return "Record<number, unknown>";
  }
  return `{\n${entries.join("\n")}\n      }`;
}

function operationTypes(spec) {
  const declarations = [];
  const paths = [];
  const seen = new Map();

  for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
    const methods = [];
    for (const method of HTTP_METHODS) {
      const operation = pathItem?.[method];
      if (!operation) continue;

      const baseName = `${method.charAt(0).toUpperCase()}${method.slice(1)}${pathName(path)}`;
      if (seen.has(baseName)) {
        fail(
          `generated type name collision: ${baseName} (${seen.get(baseName)} and ${method} ${path})`
        );
      }
      seen.set(baseName, `${method} ${path}`);

      const members = [];
      const requestSchema =
        operation.requestBody?.content?.["application/json"]?.schema ??
        operation.requestBody?.content?.["multipart/form-data"]?.schema;
      if (requestSchema) {
        const requestType = `${baseName}RequestBody`;
        declarations.push(declaration(requestType, requestSchema, spec, 0), "");
        members.push(`      requestBody: ${requestType};`);
      }

      members.push(`      responses: ${responseType(operation, spec)};`);
      methods.push(`    ${method}: {\n${members.join("\n")}\n    };`);
    }
    if (methods.length > 0) {
      paths.push(`  ${JSON.stringify(path)}: {\n${methods.join("\n")}\n  };`);
    }
  }

  return { declarations, paths };
}

function generate(spec) {
  if (!spec?.paths || !spec?.components?.schemas) {
    fail(`unexpected OpenAPI document at ${SPEC_PATH}`);
  }

  const lines = [
    "// This file is generated by scripts/generate-api-types.mjs from docs/openapi.yaml.",
    "// Do not edit by hand. Run `npm run api:types` to regenerate it.",
    "",
  ];

  for (const [name, schema] of Object.entries(spec.components.schemas)) {
    lines.push(declaration(name, schema, spec, 0), "");
  }

  const { declarations, paths } = operationTypes(spec);
  if (declarations.length > 0) {
    lines.push(...declarations);
  }

  lines.push(
    "export interface ApiPaths {",
    ...paths,
    "}",
    "",
    "export type ApiPath = keyof ApiPaths;",
    "export type ApiMethod<P extends ApiPath> = keyof ApiPaths[P];",
    ""
  );

  return lines.join("\n");
}

let document;
try {
  document = parse(readFileSync(SPEC_PATH, "utf8"));
} catch (error) {
  fail(`could not read ${SPEC_PATH}: ${error.message}`);
}

const output = generate(document);

if (CHECK) {
  let current = "";
  try {
    current = readFileSync(OUTPUT_PATH, "utf8");
  } catch {
    fail(`${OUTPUT_PATH} is missing; run \`npm run api:types\``);
  }
  if (current !== output) {
    fail(
      `${OUTPUT_PATH} is out of date with ${SPEC_PATH}; run \`npm run api:types\` and commit the result`
    );
  }
  console.log(`API types are up to date (${OUTPUT_PATH}).`);
  process.exit(0);
}

mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
writeFileSync(OUTPUT_PATH, output, "utf8");
console.log(`Wrote ${OUTPUT_PATH} from ${SPEC_PATH}.`);
