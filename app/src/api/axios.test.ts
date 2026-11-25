import {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient, extractApiError, parseRetryAfterMs } from "./axios";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

function makeResponse(
  config: Parameters<AxiosAdapter>[0],
  status: number,
  headers: Record<string, string> = {},
  data: unknown = {}
): AxiosResponse {
  return {
    config,
    data,
    status,
    statusText: status === 429 ? "Too Many Requests" : "OK",
    headers: AxiosHeaders.from(headers),
  };
}

function makeRateLimitError(config: Parameters<AxiosAdapter>[0], retryAfter: string): AxiosError {
  return new AxiosError(
    "Request failed with status code 429",
    AxiosError.ERR_BAD_REQUEST,
    config,
    undefined,
    makeResponse(config, 429, { "Retry-After": retryAfter }, { message: "Rate limited" })
  );
}

describe("Retry-After handling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("parses Retry-After delay-seconds and HTTP dates", () => {
    const now = Date.parse("Wed, 21 Oct 2015 07:27:00 GMT");

    expect(parseRetryAfterMs("2", now)).toBe(2000);
    expect(parseRetryAfterMs("Wed, 21 Oct 2015 07:27:03 GMT", now)).toBe(3000);
    expect(parseRetryAfterMs("Wed, 21 Oct 2015 07:26:00 GMT", now)).toBe(0);
    expect(parseRetryAfterMs("not a date", now)).toBeUndefined();
  });

  it("uses Retry-After before retrying and informs the user", async () => {
    const client = await createApiClient();
    const adapter = vi
      .fn<AxiosAdapter>()
      .mockImplementationOnce((config) => Promise.reject(makeRateLimitError(config, "2")))
      .mockImplementationOnce((config) =>
        Promise.resolve(makeResponse(config, 200, {}, { ok: true }))
      );
    client.defaults.adapter = adapter;

    const request = client.get("/resource");
    await vi.advanceTimersByTimeAsync(0);
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(toast.info).toHaveBeenCalledWith("Rate limit reached. Retrying in 2 seconds.", {
      duration: 2000,
    });

    await vi.advanceTimersByTimeAsync(1999);
    expect(adapter).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    await expect(request).resolves.toMatchObject({ data: { ok: true } });
    expect(adapter).toHaveBeenCalledTimes(2);
  });

  it("shows a clear message when rate-limit retries are exhausted", async () => {
    const client = await createApiClient();
    const adapter = vi.fn<AxiosAdapter>((config) =>
      Promise.reject(makeRateLimitError(config, "1"))
    );
    client.defaults.adapter = adapter;

    const request = client.get("/resource");
    const rejection = request.catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(0);
    expect(adapter).toHaveBeenCalledTimes(1);
    await vi.runAllTimersAsync();

    expect(await rejection).toMatchObject({
      message: "Rate limited",
      status: 429,
      retryAfterMs: 1000,
    });
    expect(adapter).toHaveBeenCalledTimes(4);
    expect(toast.error).toHaveBeenCalledWith("Too many requests. Please try again in 1 second.");
  });

  it("preserves Retry-After on normalized rate-limit errors", () => {
    const error = makeRateLimitError(
      { headers: new AxiosHeaders() } as Parameters<AxiosAdapter>[0],
      "3"
    );

    expect(extractApiError(error)).toMatchObject({ status: 429, retryAfterMs: 3000 });
  });

  it("does not interpret Retry-After on non-rate-limit errors", () => {
    const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
    const error = new AxiosError(
      "Request failed with status code 503",
      AxiosError.ERR_BAD_RESPONSE,
      config,
      undefined,
      {
        config,
        data: {},
        status: 503,
        statusText: "Service Unavailable",
        headers: AxiosHeaders.from({ "Retry-After": "3" }),
      }
    );

    expect(extractApiError(error)).toMatchObject({ status: 503, retryAfterMs: undefined });
  });
});
