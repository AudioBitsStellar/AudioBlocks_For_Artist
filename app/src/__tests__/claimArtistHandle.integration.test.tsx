import { act, cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import useArtistServices from "@/services/artistServices";
import { fetchPublicArtistProfile } from "@/lib/publicArtistProfile";
import { fetchArtistHandleProfile } from "@/lib/claimArtistHandle";

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

it("PATCHes only the username and resolves the saved profile by UUID after checking privacy", async () => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.audioblocks.test/api");
  vi.stubEnv("NEXT_PUBLIC_ARTIST_HANDLE_LOOKUP_ENABLED", "true");
  const id = "12345678-1234-1234-1234-123456789abc";
  let saved: string | undefined;
  patch.mockImplementation(async (_url: string, payload: { username: string }) => {
    saved = payload.username;
    return { data: { success: true, data: { username: saved } } };
  });
  const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
    if (!saved) return { status: 404, ok: false } as Response;
    const data = String(url).endsWith(`/users/${id}/public`)
      ? { id }
      : { profile: { id, username: saved }, openGraph: { title: "Solo Sound" } };
    return { status: 200, ok: true, json: async () => ({ data }) } as Response;
  });
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  client.setQueryData(["get-artist-profile"], { username: "old" });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useArtistServices().useUpdateArtistProfile(), { wrapper });
  expect(await fetchArtistHandleProfile(" @Solo.Sound ")).toEqual({ status: "not-found" });
  await act(async () => {
    await result.current.mutateAsync({ username: "Solo.Sound" });
  });
  expect(patch).toHaveBeenCalledWith("/artist/update-profile", { username: "Solo.Sound" });
  expect(client.getQueryState(["get-artist-profile"])?.isInvalidated).toBe(true);
  expect(await fetchPublicArtistProfile(id)).toMatchObject({
    status: "ok",
    profile: { handle: "Solo.Sound" },
  });
  expect(fetch).toHaveBeenLastCalledWith(
    `https://api.audioblocks.test/api/artist/${id}/metadata`,
    expect.objectContaining({ next: { revalidate: 300 } })
  );
  expect(fetch).toHaveBeenNthCalledWith(
    2,
    `https://api.audioblocks.test/api/users/${id}/public`,
    expect.objectContaining({ cache: "no-store" })
  );
  client.clear();
});
