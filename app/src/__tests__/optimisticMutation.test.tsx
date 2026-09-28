import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const { mockPatch, mockPut } = vi.hoisted(() => ({
  mockPatch: vi.fn(),
  mockPut: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  createApiClient: vi.fn().mockResolvedValue({ patch: mockPatch, put: mockPut }),
}));

import { useOptimisticMutation } from "@/api/queryClient";

interface Track {
  id: number;
  title: string;
}
interface Edit {
  id: number;
  title: string;
}

const KEY = ["tracks"];
const initial: Track[] = [
  { id: 1, title: "One" },
  { id: 2, title: "Two" },
];

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  client.setQueryData<Track[]>(KEY, initial);
  const invalidateSpy = vi.spyOn(client, "invalidateQueries");
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  return { client, invalidateSpy, wrapper };
}

const applyOptimistic = (tracks: Track[], edit: Edit) =>
  tracks.map((t) => (t.id === edit.id ? { ...t, title: edit.title } : t));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useOptimisticMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the cache before the server responds", async () => {
    const { client, wrapper } = setup();
    const request = deferred<{ data: unknown }>();
    mockPatch.mockReturnValue(request.promise);

    const { result } = renderHook(
      () =>
        useOptimisticMutation<unknown, Edit, Track[]>({
          endpoint: (v) => `/song/${v.id}`,
          queryKey: KEY,
          applyOptimistic,
        }),
      { wrapper }
    );

    act(() => {
      result.current.mutate({ id: 1, title: "Renamed" });
    });

    await waitFor(() =>
      expect(client.getQueryData<Track[]>(KEY)?.[0]).toEqual({ id: 1, title: "Renamed" })
    );
    // The request has not resolved yet.
    expect(result.current.isPending).toBe(true);

    await act(async () => {
      request.resolve({ data: {} });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith("/song/1", { id: 1, title: "Renamed" });
  });

  it("restores the previous cache and calls onError when the request fails", async () => {
    const { client, wrapper } = setup();
    const onError = vi.fn();
    mockPatch.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(
      () =>
        useOptimisticMutation<unknown, Edit, Track[]>({
          endpoint: (v) => `/song/${v.id}`,
          queryKey: KEY,
          applyOptimistic,
          onError,
        }),
      { wrapper }
    );

    await act(async () => {
      result.current.mutate({ id: 1, title: "Renamed" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(client.getQueryData<Track[]>(KEY)).toEqual(initial);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "boom" }), {
      id: 1,
      title: "Renamed",
    });
  });

  it("runs onOptimistic immediately and its undo function on failure", async () => {
    const { wrapper } = setup();
    const undo = vi.fn();
    const onOptimistic = vi.fn().mockReturnValue(undo);
    mockPatch.mockRejectedValue(new Error("nope"));

    const { result } = renderHook(
      () =>
        useOptimisticMutation<unknown, Edit>({
          endpoint: (v) => `/song/${v.id}`,
          onOptimistic,
        }),
      { wrapper }
    );

    await act(async () => {
      result.current.mutate({ id: 2, title: "X" });
    });

    expect(onOptimistic).toHaveBeenCalledWith({ id: 2, title: "X" });
    await waitFor(() => expect(undo).toHaveBeenCalledTimes(1));
  });

  it("does not roll back on success, and invalidates the cache once settled", async () => {
    const { client, invalidateSpy, wrapper } = setup();
    const undo = vi.fn();
    const onSuccess = vi.fn();
    mockPatch.mockResolvedValue({ data: { ok: true } });

    const { result } = renderHook(
      () =>
        useOptimisticMutation<{ ok: boolean }, Edit, Track[]>({
          endpoint: (v) => `/song/${v.id}`,
          queryKey: KEY,
          applyOptimistic,
          onOptimistic: () => undo,
          onSuccess,
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current.mutateAsync({ id: 1, title: "Renamed" });
    });

    expect(undo).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith({ ok: true }, { id: 1, title: "Renamed" });
    expect(client.getQueryData<Track[]>(KEY)?.[0].title).toBe("Renamed");
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: KEY }));
  });

  it("uses PUT when configured and skips the HTTP call when `request` is provided", async () => {
    const { wrapper } = setup();
    mockPut.mockResolvedValue({ data: {} });

    const put = renderHook(
      () =>
        useOptimisticMutation<unknown, Edit>({
          method: "put",
          endpoint: (v) => `/song/${v.id}`,
        }),
      { wrapper }
    );
    await act(async () => {
      await put.result.current.mutateAsync({ id: 1, title: "A" });
    });
    expect(mockPut).toHaveBeenCalledWith("/song/1", { id: 1, title: "A" });

    const request = vi.fn().mockResolvedValue({ simulated: true });
    const simulated = renderHook(
      () =>
        useOptimisticMutation<unknown, Edit>({
          endpoint: (v) => `/song/${v.id}`,
          request,
        }),
      { wrapper }
    );
    await act(async () => {
      await simulated.result.current.mutateAsync({ id: 1, title: "B" });
    });
    expect(request).toHaveBeenCalledWith({ id: 1, title: "B" });
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it("leaves the cache alone when nothing is cached yet", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);
    mockPatch.mockResolvedValue({ data: {} });
    const apply = vi.fn();

    const { result } = renderHook(
      () =>
        useOptimisticMutation<unknown, Edit, Track[]>({
          endpoint: (v) => `/song/${v.id}`,
          queryKey: KEY,
          applyOptimistic: apply,
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current.mutateAsync({ id: 1, title: "A" });
    });

    expect(apply).not.toHaveBeenCalled();
    expect(client.getQueryData(KEY)).toBeUndefined();
  });
});
