import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { getEnvProblems, validateEnv } from "../lib/env";

// The one validator for the app (#578). Sources are passed explicitly so the
// tests never depend on the machine's own environment.
const API = "https://api.example.com";

describe("validateEnv", () => {
  it("boots with only NEXT_PUBLIC_API_BASE_URL set (#578)", () => {
    const env = validateEnv({ NEXT_PUBLIC_API_BASE_URL: API });

    expect(env.NEXT_PUBLIC_API_BASE_URL).toBe(API);
    expect(env.NEXT_PUBLIC_USE_MOCK_DATA).toBe(false);
    expect(env.NEXT_PUBLIC_ANALYTICS_WRITE_KEY).toBeUndefined();
  });

  it("parses the optional variables when they are set", () => {
    const env = validateEnv({
      NEXT_PUBLIC_API_BASE_URL: API,
      NEXT_PUBLIC_ANALYTICS_WRITE_KEY: "test-write-key",
      NEXT_PUBLIC_USE_MOCK_DATA: "true",
      NODE_ENV: "test",
    });

    expect(env.NEXT_PUBLIC_ANALYTICS_WRITE_KEY).toBe("test-write-key");
    expect(env.NEXT_PUBLIC_USE_MOCK_DATA).toBe(true);
  });

  it("throws when the API base URL is missing", () => {
    expect(() => validateEnv({})).toThrow(/NEXT_PUBLIC_API_BASE_URL: is required/);
  });

  it("throws when the API base URL is malformed or not http(s)", () => {
    expect(() => validateEnv({ NEXT_PUBLIC_API_BASE_URL: "not-a-valid-url" })).toThrow(
      /must be a valid URL/
    );
    expect(() => validateEnv({ NEXT_PUBLIC_API_BASE_URL: "ftp://api.example.com" })).toThrow(
      /must start with http:\/\/ or https:\/\//
    );
  });

  it("throws when the mock flag isn't exactly 'true' or 'false'", () => {
    expect(() =>
      validateEnv({
        NEXT_PUBLIC_API_BASE_URL: API,
        NEXT_PUBLIC_USE_MOCK_DATA: "yes",
      })
    ).toThrow(/NEXT_PUBLIC_USE_MOCK_DATA/);
  });

  it("lists every problem in one error, not just the first", () => {
    try {
      validateEnv({
        NEXT_PUBLIC_API_BASE_URL: "not-a-valid-url",
        NEXT_PUBLIC_USE_MOCK_DATA: "yes",
      });
      expect.unreachable("validateEnv should have thrown");
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toMatch(/NEXT_PUBLIC_API_BASE_URL/);
      expect(message).toMatch(/NEXT_PUBLIC_USE_MOCK_DATA/);
    }
  });
});

describe("getEnvProblems", () => {
  it("returns nothing for a valid environment", () => {
    expect(getEnvProblems({ NEXT_PUBLIC_API_BASE_URL: API })).toEqual([]);
  });

  it("returns one readable line per problem for the configuration-error page", () => {
    expect(getEnvProblems({})).toEqual(["NEXT_PUBLIC_API_BASE_URL: is required"]);
  });
});

describe("a single API base URL variable (#578)", () => {
  const ROOT = path.resolve(__dirname, "../../..");

  it.each(["app/src", "app/.env.example", "README.md", ".github/workflows/e2e.yml"])(
    "%s never mentions NEXT_PUBLIC_API_URL",
    (target) => {
      const full = path.join(ROOT, target);
      const files = fs.statSync(full).isDirectory()
        ? (fs.readdirSync(full, { recursive: true }) as string[])
            .map((file) => path.join(full, file))
            .filter((file) => /\.(ts|tsx)$/.test(file) && !file.endsWith("env.test.ts"))
        : [full];
      const offenders = files.filter((file) =>
        /NEXT_PUBLIC_API_URL\b/.test(fs.readFileSync(file, "utf8"))
      );
      expect(offenders).toEqual([]);
    }
  );

  it("the root layout validates with the shared schema", () => {
    const layout = fs.readFileSync(path.join(ROOT, "app/src/app/layout.tsx"), "utf8");
    expect(layout).toMatch(/getEnvProblems\(\)/);
    expect(layout).not.toMatch(/REQUIRED_ENV_VARS/);
  });
});
