import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const REQUIRED_KEYS = [
  "NEXT_PUBLIC_API_BASE_URL",
  "NEXT_PUBLIC_ANALYTICS_WRITE_KEY",
  "NEXT_PUBLIC_USE_MOCK_DATA",
] as const;

const validEnv = {
  NEXT_PUBLIC_API_BASE_URL: "https://api.example.com",
  NEXT_PUBLIC_ANALYTICS_WRITE_KEY: "test-write-key",
  NEXT_PUBLIC_USE_MOCK_DATA: "false",
  NODE_ENV: "test",
};

/** Re-imports the module fresh so top-level `validateEnv()` reruns against the current process.env. */
async function loadEnvModule() {
  vi.resetModules();
  return import("../lib/env");
}

describe("validateEnv", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    for (const key of REQUIRED_KEYS) delete process.env[key];
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns the parsed env when all required variables are valid", async () => {
    Object.assign(process.env, validEnv);
    const { validateEnv } = await loadEnvModule();

    const result = validateEnv();

    expect(result.NEXT_PUBLIC_API_BASE_URL).toBe(validEnv.NEXT_PUBLIC_API_BASE_URL);
    expect(result.NEXT_PUBLIC_ANALYTICS_WRITE_KEY).toBe(validEnv.NEXT_PUBLIC_ANALYTICS_WRITE_KEY);
    expect(result.NEXT_PUBLIC_USE_MOCK_DATA).toBe(false);
  });

  it("throws when a required variable is missing", async () => {
    Object.assign(process.env, validEnv);
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    const { validateEnv } = await loadEnvModule();

    expect(() => validateEnv()).toThrow(/NEXT_PUBLIC_API_BASE_URL/);
  });

  it("throws when a URL variable is malformed", async () => {
    Object.assign(process.env, validEnv, {
      NEXT_PUBLIC_API_BASE_URL: "not-a-valid-url",
    });
    const { validateEnv } = await loadEnvModule();

    expect(() => validateEnv()).toThrow(/must be a valid URL/);
  });

  it("throws when the boolean variable isn't exactly 'true' or 'false'", async () => {
    Object.assign(process.env, validEnv, {
      NEXT_PUBLIC_USE_MOCK_DATA: "yes",
    });
    const { validateEnv } = await loadEnvModule();

    expect(() => validateEnv()).toThrow(/NEXT_PUBLIC_USE_MOCK_DATA/);
  });

  it("lists ALL invalid/missing variables in a single error, not just the first", async () => {
    Object.assign(process.env, validEnv, {
      NEXT_PUBLIC_API_BASE_URL: "not-a-valid-url",
      NEXT_PUBLIC_USE_MOCK_DATA: "yes",
    });
    delete process.env.NEXT_PUBLIC_ANALYTICS_WRITE_KEY;
    const { validateEnv } = await loadEnvModule();

    try {
      validateEnv();
      expect.unreachable("validateEnv should have thrown");
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toMatch(/NEXT_PUBLIC_API_BASE_URL/);
      expect(message).toMatch(/NEXT_PUBLIC_ANALYTICS_WRITE_KEY/);
      expect(message).toMatch(/NEXT_PUBLIC_USE_MOCK_DATA/);
    }
  });
});
