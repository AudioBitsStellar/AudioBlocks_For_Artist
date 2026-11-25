import axios, {
  AxiosError,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@/utils/jwt", () => ({
  getDisplayNameFromToken: () => "Test Artist",
}));

import EarningsRoyalties from "@/components/EarningsRoyalties";

// Clock pinned to mid-June 2026 (Date only, so React Query's timers stay real).
const NOW = new Date("2026-06-15T12:00:00.000Z");

/** What GET /api/royalty-payouts/export returns: amounts in stroops (1 XLM = 10^7). */
const PAYOUTS_CSV = [
  "ID,SaleEventId,Status,Currency,GrossAmount,CreatedAt",
  "p1,s1,reconciled,stroops,50000000,2026-06-03T10:00:00.000Z",
  "p2,s2,pending,stroops,20000000,2026-06-01T09:00:00.000Z",
  "p3,s3,reconciled,stroops,30000000,2026-05-10T00:00:00.000Z",
  "p4,s4,discrepancy,stroops,70000000,2026-04-02T00:00:00.000Z",
  "p5,s5,reconciled,stroops,100000000,2026-01-20T00:00:00.000Z",
].join("\n");

const EMPTY_CSV = "ID,SaleEventId,Status,Currency,GrossAmount,CreatedAt\n";

const EXPORT_URL = "/royalty-payouts/export";

type FailureMode = "none" | "http";
let failureMode: FailureMode;
let earningsPayload = PAYOUTS_CSV;
let holdResponse: boolean;
let requests: InternalAxiosRequestConfig[];
let resolveHeldResponse: (() => void) | undefined;
let queryClient: QueryClient | undefined;
let exportedBlob: Blob | undefined;
let downloadedAnchor: HTMLAnchorElement | undefined;
let revokedUrls: string[];
const originalCreateObjectURL = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
const originalRevokeObjectURL = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");

function response(config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse {
  return {
    config,
    data,
    status,
    statusText: status === 200 ? "OK" : "Not Found",
    headers: {},
  };
}

function apiError(config: InternalAxiosRequestConfig): AxiosError {
  return new AxiosError(
    "Request failed with status code 404",
    AxiosError.ERR_BAD_REQUEST,
    config,
    undefined,
    response(config, { message: "Earnings not found" }, 404)
  );
}

async function handleRequest(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  if (holdResponse) {
    return new Promise((resolve) => {
      resolveHeldResponse = () => resolve(response(config, earningsPayload));
    });
  }

  if (failureMode === "http") throw apiError(config);
  if (config.method?.toUpperCase() === "GET" && config.url === EXPORT_URL) {
    return response(config, earningsPayload);
  }

  throw new AxiosError(`No mock route for ${config.method} ${config.url}`, undefined, config);
}

const networkAdapter: AxiosAdapter = (config) => {
  requests.push(config);
  return handleRequest(config);
};

function renderEarnings() {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <EarningsRoyalties />
    </QueryClientProvider>
  );
}

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  failureMode = "none";
  earningsPayload = PAYOUTS_CSV;
  holdResponse = false;
  requests = [];
  resolveHeldResponse = undefined;
  exportedBlob = undefined;
  downloadedAnchor = undefined;
  revokedUrls = [];
  axios.defaults.adapter = networkAdapter;

  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: (blob: Blob) => {
      exportedBlob = blob;
      return "blob:earnings-report";
    },
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: (url: string) => revokedUrls.push(url),
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
    downloadedAnchor = document.querySelector<HTMLAnchorElement>("a[download]") ?? undefined;
  });
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  queryClient?.clear();
  vi.restoreAllMocks();
  if (originalCreateObjectURL) {
    Object.defineProperty(URL, "createObjectURL", originalCreateObjectURL);
  } else {
    Reflect.deleteProperty(URL, "createObjectURL");
  }
  if (originalRevokeObjectURL) {
    Object.defineProperty(URL, "revokeObjectURL", originalRevokeObjectURL);
  } else {
    Reflect.deleteProperty(URL, "revokeObjectURL");
  }
});

describe("EarningsRoyalties integration (#47)", () => {
  it("shows loading while the payouts request is pending", async () => {
    holdResponse = true;
    renderEarnings();

    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0].url).toBe(EXPORT_URL);

    await act(async () => resolveHeldResponse?.());
    expect(await screen.findByTestId("earnings-total")).toHaveTextContent("18 XLM");
  });

  it("totals reconciled payouts from the backend export, in XLM", async () => {
    renderEarnings();

    // 5 + 3 + 10 XLM reconciled in the last 12 months; the discrepancy is left out.
    expect(await screen.findByTestId("earnings-total")).toHaveTextContent("18 XLM");
    // June 5 XLM vs May 3 XLM.
    expect(screen.getByText("2 XLM more than last month")).toBeInTheDocument();
    expect(screen.getByText(/2 XLM pending reconciliation/)).toBeInTheDocument();
    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe("get");
    expect(requests[0].url).toBe(EXPORT_URL);
  });

  it("lists the most recent payouts with their reconciliation status", async () => {
    renderEarnings();
    await screen.findByTestId("earnings-total");

    const list = screen.getByRole("list", { name: "Recent royalty payouts" });
    const items = within(list).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("5 XLM");
    expect(items[0]).toHaveTextContent("Reconciled");
    expect(items[1]).toHaveTextContent("Pending reconciliation");
    expect(within(list).getByText("Under review")).toBeInTheDocument();
  });

  it("never shows a sample withdrawal or a payout request it cannot submit", async () => {
    renderEarnings();
    await screen.findByTestId("earnings-total");

    expect(screen.queryByText(/1,840/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /request payout/i })).not.toBeInTheDocument();
  });

  it("shows an API error and retries successfully when requested", async () => {
    failureMode = "http";
    renderEarnings();

    expect(await screen.findByRole("alert")).toHaveTextContent(/failed to load earnings data/i);
    failureMode = "none";
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByTestId("earnings-total")).toHaveTextContent("18 XLM");
    expect(requests).toHaveLength(2);
  });

  it("shows the empty state when the artist has no payouts yet", async () => {
    earningsPayload = EMPTY_CSV;
    renderEarnings();

    expect(await screen.findByText("No earnings data yet")).toBeInTheDocument();
    expect(screen.queryByTestId("earnings-chart")).not.toBeInTheDocument();
  });

  it("charts a single payout across a continuous month axis", async () => {
    earningsPayload = [
      "ID,SaleEventId,Status,Currency,GrossAmount,CreatedAt",
      "only,s1,reconciled,stroops,12345678,2026-06-02T00:00:00.000Z",
    ].join("\n");
    renderEarnings();

    expect(await screen.findByTestId("earnings-total")).toHaveTextContent("1.2345678 XLM");
    expect(screen.getByTestId("earnings-chart")).toBeInTheDocument();
    // The screen-reader table has a row for every month, not just the one with data.
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(13);
  });

  it("applies the date range to the totals", async () => {
    renderEarnings();
    await screen.findByTestId("earnings-total");

    fireEvent.change(screen.getByRole("combobox", { name: "Earnings date range" }), {
      target: { value: "3" },
    });

    // April–June: 5 + 3 XLM; January falls outside.
    expect(screen.getByTestId("earnings-total")).toHaveTextContent("8 XLM");
  });

  it("exports the monthly series for the selected range as CSV", async () => {
    renderEarnings();
    await screen.findByTestId("earnings-total");

    fireEvent.change(screen.getByRole("combobox", { name: "Earnings date range" }), {
      target: { value: "3" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Export earnings and royalties as CSV" }));

    expect(downloadedAnchor?.download).toMatch(/^earnings_\d{4}-\d{2}\.csv$/);
    expect(downloadedAnchor?.href).toBe("blob:earnings-report");
    expect(exportedBlob?.type).toBe("text/csv;charset=utf-8;");
    expect(await readBlob(exportedBlob!)).toBe(
      "Month,Asset,Reconciled,Pending\r\n2026-04,XLM,0,0\r\n2026-05,XLM,3,0\r\n2026-06,XLM,5,2"
    );
    expect(revokedUrls).toEqual(["blob:earnings-report"]);
  });

  it("exports a header-only CSV when there are no payouts", async () => {
    earningsPayload = EMPTY_CSV;
    renderEarnings();

    await screen.findByText("No earnings data yet");
    fireEvent.click(screen.getByRole("button", { name: "Export earnings and royalties as CSV" }));

    expect(await readBlob(exportedBlob!)).toBe("Month,Asset,Reconciled,Pending");
  });
});
