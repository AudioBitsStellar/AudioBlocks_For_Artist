import axios, {
  AxiosError,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@/utils/jwt", () => ({
  getDisplayNameFromToken: () => "Test Artist",
}));

import EarningsRoyalties from "@/components/EarningsRoyalties";

const earningsApiResponse = {
  success: true,
  data: {
    totalEarnings: 12500,
    comparedToLastMonth: 340,
    data: [
      { month: "Jan", earnings: 800, royalties: 600 },
      { month: "Feb", earnings: 950, royalties: 700 },
      { month: "Mar", earnings: 1100, royalties: 900 },
      { month: "Apr", earnings: 1300, royalties: 1050 },
      { month: "May", earnings: 1500, royalties: 1200 },
      { month: "Jun", earnings: 1800, royalties: 1400 },
    ],
  },
};

type FailureMode = "none" | "http";
let failureMode: FailureMode;
let holdResponse: boolean;
let requests: InternalAxiosRequestConfig[];
let resolveHeldResponse: (() => void) | undefined;
let queryClient: QueryClient | undefined;
let exportedBlob: Blob | undefined;
let downloadedAnchor: HTMLAnchorElement | undefined;
let revokedUrls: string[];
const originalCreateObjectURL = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
const originalRevokeObjectURL = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");

function response(
  config: InternalAxiosRequestConfig,
  data: unknown,
  status = 200
): AxiosResponse {
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
      resolveHeldResponse = () => resolve(response(config, earningsApiResponse));
    });
  }

  if (failureMode === "http") throw apiError(config);
  if (config.method?.toUpperCase() === "GET" && config.url === "/artist/earnings") {
    return response(config, earningsApiResponse);
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
  failureMode = "none";
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

describe("EarningsRoyalties integration", () => {
  it("shows loading while the earnings request is pending", async () => {
    holdResponse = true;
    renderEarnings();

    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0].url).toBe("/artist/earnings");

    await act(async () => resolveHeldResponse?.());
    expect(await screen.findAllByText("$12,500.00")).toHaveLength(2);
  });

  it("fetches earnings through the service and renders the response", async () => {
    renderEarnings();

    expect(await screen.findAllByText("$12,500.00")).toHaveLength(2);
    expect(screen.getByText("$340 more than last month")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Earnings & Royalties" })).toBeInTheDocument();
    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe("get");
    expect(requests[0].url).toBe("/artist/earnings");
  });

  it("shows an API error and retries successfully when requested", async () => {
    failureMode = "http";
    renderEarnings();

    expect(await screen.findByRole("alert")).toHaveTextContent(/failed to load earnings data/i);
    failureMode = "none";
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findAllByText("$12,500.00")).toHaveLength(2);
    expect(requests).toHaveLength(2);
  });

  it("exposes the selected earnings type and date-range filters", async () => {
    renderEarnings();
    await screen.findAllByText("$12,500.00");

    const earningsType = screen.getByRole("combobox", { name: "Earnings type" });
    const dateRange = screen.getByRole("combobox", { name: "Earnings date range" });
    expect(earningsType).toHaveValue("Royalties");
    expect(dateRange).toHaveValue("12");

    fireEvent.change(earningsType, { target: { value: "Royalties" } });
    fireEvent.change(dateRange, { target: { value: "6" } });
    expect(dateRange).toHaveValue("6");
    expect(screen.getByLabelText("Earnings and royalties chart")).toBeInTheDocument();
  });

  it("exports the fetched earnings data as a CSV download", async () => {
    renderEarnings();
    await screen.findAllByText("$12,500.00");

    fireEvent.click(screen.getByRole("button", { name: "Export earnings and royalties as CSV" }));

    expect(downloadedAnchor?.download).toMatch(/^earnings_\d{4}-\d{2}\.csv$/);
    expect(downloadedAnchor?.href).toBe("blob:earnings-report");
    expect(exportedBlob?.type).toBe("text/csv;charset=utf-8;");
    expect(await readBlob(exportedBlob!)).toBe(
      "Month,Earnings,Royalties\r\nJan,800,600\r\nFeb,950,700\r\nMar,1100,900\r\nApr,1300,1050\r\nMay,1500,1200\r\nJun,1800,1400"
    );
    expect(revokedUrls).toEqual(["blob:earnings-report"]);
  });

  it("filters the exported data to the selected date range", async () => {
    renderEarnings();
    await screen.findAllByText("$12,500.00");

    fireEvent.change(screen.getByRole("combobox", { name: "Earnings date range" }), {
      target: { value: "3" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Export earnings and royalties as CSV" }));

    expect(await readBlob(exportedBlob!)).toBe(
      "Month,Earnings,Royalties\r\nApr,1300,1050\r\nMay,1500,1200\r\nJun,1800,1400"
    );
  });
});
