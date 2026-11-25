import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getApiUnavailableSnapshot,
  reportApiAvailable,
  reportApiUnavailable,
  subscribeToApiAvailability,
} from "@/lib/apiAvailability";

describe("API availability state", () => {
  afterEach(() => {
    reportApiAvailable();
  });

  it("notifies subscribers when availability changes and clears after recovery", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToApiAvailability(listener);

    reportApiUnavailable();
    expect(getApiUnavailableSnapshot()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);

    reportApiAvailable();
    expect(getApiUnavailableSnapshot()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
  });
});
