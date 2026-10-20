import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { loadMock, useMock } from "@/__mocks__/loadMock";
import { MOCK_MERCH_ITEMS } from "@/__mocks__/merch";

describe("loadMock", () => {
  it("resolves to the domain's fixture module", async () => {
    const merch = await loadMock("merch");
    expect(merch.MOCK_MERCH_ITEMS).toBe(MOCK_MERCH_ITEMS);
  });
});

describe("useMock", () => {
  it("returns null until the fixtures load, then the module", async () => {
    const { result } = renderHook(() => useMock("merch"));
    expect(result.current).toBeNull();
    await waitFor(() => expect(result.current?.MOCK_MERCH_ITEMS).toBe(MOCK_MERCH_ITEMS));
  });

  it("stays null when disabled, so real-data screens never see fixtures", async () => {
    const { result } = renderHook(() => useMock("merch", false));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(result.current).toBeNull();
  });
});
