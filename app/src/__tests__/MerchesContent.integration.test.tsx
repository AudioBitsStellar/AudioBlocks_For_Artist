import axios, {
  AxiosError,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import type { MerchItem, MerchListResponse } from "@/services/merchService";

vi.mock("@/lib/featureFlags", () => ({ featureFlags: { useMockMerches: false } }));
vi.mock("@/hooks/useRole", () => ({
  useRole: () => ({ can: () => true }),
}));

import MerchesContent from "@/components/MerchesContent";

const seededMerch: MerchItem = {
  id: 1,
  title: "Studio Hoodie",
  detail: "Heavyweight cotton hoodie",
  date: "2026-10-15",
  time: "18:30",
  price: "59.99",
  image: "https://example.com/hoodie.jpg",
};

const metrics = [
  {
    label: "Total Items",
    value: "1",
    descriptor: "Active listings",
    gradient: "from-pink-500 to-purple-500",
  },
];

type FailureMode = "none" | "http" | "network";
let merchItems: MerchItem[];
let failureMode: FailureMode;
let holdResponses: boolean;
let requests: InternalAxiosRequestConfig[];
let handleRequest: (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>;

const networkAdapter: AxiosAdapter = (config) => {
  requests.push(config);
  return handleRequest(config);
};

function response(
  config: InternalAxiosRequestConfig,
  data: unknown,
  status = 200
): AxiosResponse {
  return {
    config,
    data,
    status,
    statusText: status === 204 ? "No Content" : status === 200 ? "OK" : "Not Found",
    headers: {},
  };
}

function apiError(
  config: InternalAxiosRequestConfig,
  status: number,
  data: { message: string }
): AxiosError {
  const failedResponse = response(config, data, status);
  return new AxiosError(
    data.message,
    status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
    config,
    undefined,
    failedResponse
  );
}

function parsePayload(config: InternalAxiosRequestConfig): Record<string, string> {
  if (typeof config.data === "string") return JSON.parse(config.data) as Record<string, string>;
  return (config.data ?? {}) as Record<string, string>;
}

async function respondToRequest(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  if (holdResponses) return new Promise(() => {});
  if (failureMode === "network") {
    throw new AxiosError("Network Error", AxiosError.ERR_NETWORK, config);
  }

  const method = config.method?.toUpperCase();
  const path = config.url;
  if (failureMode === "http" && method === "GET" && path === "/artist/merches") {
    throw apiError(config, 404, { message: "Merch inventory not found" });
  }

  if (method === "GET" && path === "/artist/merches") {
    const body: MerchListResponse = { metrics, items: merchItems };
    return response(config, body);
  }

  if (method === "POST" && path === "/artist/merches") {
    const payload = parsePayload(config);
    const created: MerchItem = {
      id: Math.max(0, ...merchItems.map((item) => item.id)) + 1,
      title: payload.title,
      detail: payload.detail,
      date: payload.date,
      time: payload.time,
      price: payload.price,
      image: payload.image,
    };
    merchItems = [...merchItems, created];
    return response(config, created, 201);
  }

  const itemPath = /^\/artist\/merches\/(\d+)$/.exec(path ?? "");
  if (itemPath) {
    const id = Number(itemPath[1]);
    const existing = merchItems.find((item) => item.id === id);
    if (!existing) throw apiError(config, 404, { message: "Merch item not found" });

    if (method === "PUT") {
      const updated = { ...existing, ...parsePayload(config) } as MerchItem;
      merchItems = merchItems.map((item) => (item.id === id ? updated : item));
      return response(config, updated);
    }

    if (method === "DELETE") {
      merchItems = merchItems.filter((item) => item.id !== id);
      return response(config, undefined, 204);
    }
  }

  throw apiError(config, 404, { message: `No mock route for ${method} ${path}` });
}

let queryClient: QueryClient;

function renderMerches() {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MerchesContent />
    </QueryClientProvider>
  );
}

function cardFor(title: string): HTMLElement {
  const heading = screen.getByRole("heading", { name: title });
  const card = heading.closest(".group");
  if (!card) throw new Error(`Merch card for ${title} was not found`);
  return card;
}

beforeEach(() => {
  merchItems = [{ ...seededMerch }];
  failureMode = "none";
  holdResponses = false;
  requests = [];
  handleRequest = respondToRequest;
  axios.defaults.adapter = networkAdapter;
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  queryClient?.clear();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("MerchesContent integration", () => {
  it("renders merch returned by the listing service", async () => {
    renderMerches();

    expect(screen.getByRole("status", { name: "Loading merch" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Studio Hoodie" })).toBeInTheDocument();
    expect(screen.getByText("Heavyweight cotton hoodie")).toBeInTheDocument();
    expect(screen.getByText("59.99")).toBeInTheDocument();
    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe("get");
    expect(requests[0].url).toBe("/artist/merches");
  });

  it("creates, edits, and deletes merch through the service and refreshes the list", async () => {
    renderMerches();
    await screen.findByRole("heading", { name: "Studio Hoodie" });

    fireEvent.click(screen.getByRole("button", { name: "New Merch" }));
    fireEvent.change(screen.getByLabelText(/^title/i), { target: { value: "Tour T-Shirt" } });
    fireEvent.change(screen.getByLabelText(/^detail/i), { target: { value: "2026 tour shirt" } });
    fireEvent.change(screen.getByLabelText(/^price/i), { target: { value: "25.00" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByRole("heading", { name: "Tour T-Shirt" });
    expect(merchItems).toHaveLength(2);
    const createRequest = requests.find((request) => request.method === "post");
    expect(createRequest?.url).toBe("/artist/merches");
    expect(parsePayload(createRequest!)).toMatchObject({
      title: "Tour T-Shirt",
      detail: "2026 tour shirt",
      price: "25.00",
    });

    fireEvent.click(within(cardFor("Tour T-Shirt")).getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText(/^title/i), { target: { value: "World Tour T-Shirt" } });
    fireEvent.change(screen.getByLabelText(/^price/i), { target: { value: "30.00" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByRole("heading", { name: "World Tour T-Shirt" });
    expect(merchItems.find((item) => item.id === 2)).toMatchObject({
      title: "World Tour T-Shirt",
      price: "30.00",
    });
    expect(requests.some((request) => request.method === "put" && request.url === "/artist/merches/2"))
      .toBe(true);

    fireEvent.click(within(cardFor("World Tour T-Shirt")).getByRole("button", { name: "Delete" }));
    const confirmation = screen.getByRole("dialog", { name: "Delete Merch Item" });
    expect(within(confirmation).getByText(/World Tour T-Shirt/)).toBeInTheDocument();
    fireEvent.click(within(confirmation).getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "World Tour T-Shirt" })).not.toBeInTheDocument();
    });
    expect(merchItems.map((item) => item.id)).toEqual([1]);
    expect(requests.some((request) => request.method === "delete" && request.url === "/artist/merches/2"))
      .toBe(true);
    expect(requests.filter((request) => request.method === "get").length).toBeGreaterThanOrEqual(4);
  });

  it("shows an API error and retries the list successfully", async () => {
    failureMode = "http";
    renderMerches();

    expect(await screen.findByRole("alert")).toHaveTextContent(/failed to load merch/i);
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();

    failureMode = "none";
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("heading", { name: "Studio Hoodie" })).toBeInTheDocument();
    expect(requests.filter((request) => request.method === "get")).toHaveLength(2);
  });

  it("shows a loading error after a network failure and retry", async () => {
    failureMode = "network";
    renderMerches();

    expect(await screen.findByRole("alert", {}, { timeout: 10000 })).toHaveTextContent(
      /failed to load merch/i
    );
    expect(requests.filter((request) => request.method === "get")).toHaveLength(2);
  });

  it("keeps the loading state visible while the list request is pending", async () => {
    holdResponses = true;
    renderMerches();

    expect(screen.getByRole("status", { name: "Loading merch" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Latest Drops" })).not.toBeInTheDocument();
    await waitFor(() => expect(requests).toHaveLength(1));
  });
});
