import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import MaintenanceBanner from "@/components/MaintenanceBanner";
import { setFeatureFlagOverride } from "@/lib/featureFlags";

describe("MaintenanceBanner", () => {
  beforeEach(() => {
    act(() => {
      setFeatureFlagOverride("maintenanceMode", undefined);
    });
    delete process.env.NEXT_PUBLIC_MAINTENANCE_MODE;
  });

  afterEach(() => {
    act(() => {
      setFeatureFlagOverride("maintenanceMode", undefined);
    });
    delete process.env.NEXT_PUBLIC_MAINTENANCE_MODE;
  });

  it("does not render when the flag is off and forceShow is false", async () => {
    await act(async () => {
      render(<MaintenanceBanner />);
    });
    expect(screen.queryByTestId("maintenance-banner")).toBeNull();
  });

  it("renders when forceShow is true", async () => {
    await act(async () => {
      render(<MaintenanceBanner forceShow />);
    });
    const banner = screen.getByTestId("maintenance-banner");
    expect(banner).toBeDefined();
    expect(banner.getAttribute("role")).toBe("status");
    expect(screen.getByText(/Planned Maintenance Scheduled:/i)).toBeDefined();
  });

  it("renders when maintenanceMode feature flag is overridden to true", async () => {
    await act(async () => {
      setFeatureFlagOverride("maintenanceMode", true);
      render(<MaintenanceBanner />);
    });
    expect(screen.getByTestId("maintenance-banner")).toBeDefined();
  });

  it("dismisses the banner when close button is clicked", async () => {
    await act(async () => {
      render(<MaintenanceBanner forceShow />);
    });
    expect(screen.getByTestId("maintenance-banner")).toBeDefined();

    const dismissBtn = screen.getByTestId("dismiss-maintenance-banner");
    await act(async () => {
      fireEvent.click(dismissBtn);
    });

    expect(screen.queryByTestId("maintenance-banner")).toBeNull();
  });
});
