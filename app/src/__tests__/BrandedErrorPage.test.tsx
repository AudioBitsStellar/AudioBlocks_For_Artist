import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BrandedErrorPage from "@/components/shared/BrandedErrorPage";

describe("BrandedErrorPage", () => {
  it("shows a branded not-found page with routes back to the app", () => {
    render(<BrandedErrorPage kind="not-found" />);

    expect(screen.getByRole("heading", { name: /went off the playlist/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: /home/i })).toHaveAttribute("href", "/");
  });

  it("offers a retry and error reference on a server error page", () => {
    const onRetry = vi.fn();
    render(<BrandedErrorPage kind="error" onRetry={onRetry} reference="error-digest" />);

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.getByText("Reference: error-digest")).toBeInTheDocument();
  });
});
