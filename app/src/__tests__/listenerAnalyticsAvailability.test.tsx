import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ListenerMap from "@/components/ListenerMap";
import AnalyticsGeographic from "@/components/AnalyticsGeographic";

const data = [{ country: "Nigeria", region: "Africa", plays: 50 }];
afterEach(() => vi.unstubAllEnvs());
describe.each([ListenerMap, AnalyticsGeographic])("listener location availability", (Panel) => {
  it("hides even supplied location figures with mock mode off or unset", () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_DATA", "false");
    render(<Panel data={data} />);
    expect(
      screen.getByText("Listener location and demographics aren't available yet.")
    ).toBeInTheDocument();
    expect(screen.queryByText("Nigeria")).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
  it("labels sample location figures in mock mode", () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_DATA", "true");
    render(<Panel data={data} />);
    expect(screen.getByText("Mock")).toBeInTheDocument();
  });
});
