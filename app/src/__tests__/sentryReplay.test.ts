import { describe, expect, it, vi, beforeEach } from "vitest";

const init = vi.fn();
const replayIntegration = vi.fn((opts: unknown) => ({ name: "Replay", opts }));

vi.mock("@sentry/nextjs", () => ({
  init: (...a: unknown[]) => init(...a),
  replayIntegration: (o: unknown) => replayIntegration(o),
  captureRouterTransitionStart: vi.fn(),
}));

import {
  REPLAY_ON_ERROR_SAMPLE_RATE,
  REPLAY_PRIVACY_OPTIONS,
  REPLAY_SESSION_SAMPLE_RATE,
} from "@/lib/sentryReplay";

describe("session replay PII masking (#765)", () => {
  beforeEach(() => {
    vi.resetModules();
    init.mockClear();
    replayIntegration.mockClear();
  });

  it("masks all text and inputs and blocks media", () => {
    expect(REPLAY_PRIVACY_OPTIONS).toEqual({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    });
  });

  it("samples a minority of sessions but every errored one", () => {
    expect(REPLAY_SESSION_SAMPLE_RATE).toBeGreaterThan(0);
    expect(REPLAY_SESSION_SAMPLE_RATE).toBeLessThanOrEqual(0.1);
    expect(REPLAY_ON_ERROR_SAMPLE_RATE).toBe(1);
  });

  it("initialises Sentry replay with the masking options when a DSN is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://key@example.ingest.sentry.io/1");
    await import("../../instrumentation-client");
    expect(replayIntegration).toHaveBeenCalledWith(REPLAY_PRIVACY_OPTIONS);
    const cfg = init.mock.calls[0][0];
    expect(cfg.replaysSessionSampleRate).toBe(REPLAY_SESSION_SAMPLE_RATE);
    expect(cfg.replaysOnErrorSampleRate).toBe(REPLAY_ON_ERROR_SAMPLE_RATE);
    vi.unstubAllEnvs();
  });

  it("records nothing when no DSN is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    vi.stubEnv("SENTRY_DSN", "");
    await import("../../instrumentation-client");
    expect(init).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
});
