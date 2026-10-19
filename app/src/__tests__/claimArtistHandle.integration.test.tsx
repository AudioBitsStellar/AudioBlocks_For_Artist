import { act, cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import useArtistServices from "@/services/artistServices";
import { fetchPublicArtistProfile } from "@/lib/publicArtistProfile";

const { patch, success, failure } = vi.hoisted(() => ({
  patch: vi.fn(),
  success: vi.fn(),
  failure: vi.fn(),
}));
vi.mock("@/api/axios", () => ({
  createApiClient: async () => ({ patch }),
  extractApiError: (e: unknown) => e,
}));
vi.mock("@/hooks/useToastHandler", () => ({
  useHandleSuccess: () => success,
  useHandleError: () => failure,
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

it("PATCHes only the username and resolves the claimed handle through the public profile reader", async () => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.audioblocks.test/api");
  let saved: string | undefined;
  patch.mockImplementation(async (_url: string, payload: { username: string }) => {
    saved = payload.username;
    return { data: { success: true, data: { username: saved } } };
  });
  const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
    saved
      ? ({
          status: 200,
          ok: true,
          json: async () => ({ data: { id: "artist-1", handle: saved, name: "Solo Sound" } }),
        } as Response)
      : ({ status: 404, ok: false } as Response)
  );
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  client.setQueryData(["get-artist-profile"], { username: "old" });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useArtistServices().useUpdateArtistProfile(), { wrapper });
  expect(await fetchPublicArtistProfile(" @Solo.Sound ")).toEqual({ status: "not-found" });
  await act(async () => {
    await result.current.mutateAsync({ username: "Solo.Sound" });
  });
  expect(patch).toHaveBeenCalledWith("/artist/update-profile", { username: "Solo.Sound" });
  expect(client.getQueryState(["get-artist-profile"])?.isInvalidated).toBe(true);
  expect(await fetchPublicArtistProfile("Solo.Sound")).toMatchObject({
    status: "ok",
    profile: { handle: "Solo.Sound" },
  });
  expect(fetch).toHaveBeenLastCalledWith(
    "https://api.audioblocks.test/api/artist/public/Solo.Sound",
    expect.objectContaining({ cache: "no-store" })
  );
  client.clear();
});
