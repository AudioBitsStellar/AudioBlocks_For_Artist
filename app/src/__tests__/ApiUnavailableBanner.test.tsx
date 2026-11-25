import { act, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import ApiUnavailableBanner from "@/components/ApiUnavailableBanner";
import { reportApiAvailable, reportApiUnavailable } from "@/lib/apiAvailability";

describe("ApiUnavailableBanner", () => {
  afterEach(() => {
    act(() => reportApiAvailable());
  });

  it("announces service failures and retries active queries", async () => {
    const queryClient = new QueryClient();
    const refetchQueries = vi.spyOn(queryClient, "refetchQueries");

    reportApiUnavailable();
    render(
      <QueryClientProvider client={queryClient}>
        <ApiUnavailableBanner />
      </QueryClientProvider>
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/service is temporarily unavailable/i);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    });
    expect(refetchQueries).toHaveBeenCalledWith({ type: "active" });
  });

  it("renders nothing after the API recovers", () => {
    reportApiAvailable();
    const queryClient = new QueryClient();
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <ApiUnavailableBanner />
      </QueryClientProvider>
    );

    expect(container).toBeEmptyDOMElement();
  });
});
