import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import PayoutSettingsPage from "@/app/dashboard/settings/payout/page";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const VALID_PUBLIC_KEY = "GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR";
const VALID_SECRET_KEY = "SAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQC5MY";

function flipOneChar(key: string): string {
  const replacement = key[12] === "A" ? "B" : "A";
  return `${key.slice(0, 12)}${replacement}${key.slice(13)}`;
}

describe("PayoutSettingsPage Stellar address validation (#590)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("shows an inline error and refuses to store a key with one character changed", () => {
    render(<PayoutSettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: /\+ Add Payout Method/i }));
    const input = screen.getByLabelText("Payout address");
    fireEvent.change(input, { target: { value: flipOneChar(VALID_PUBLIC_KEY) } });

    expect(screen.getByRole("alert")).toHaveTextContent(/valid Stellar public address/i);

    fireEvent.click(screen.getByRole("button", { name: /Save Method/i }));
    expect(localStorage.getItem("audioblocks:payout-methods:v1")).toBeNull();
  });

  it("warns inline and clears/never stores a pasted S... secret key", () => {
    render(<PayoutSettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: /\+ Add Payout Method/i }));
    const input = screen.getByLabelText("Payout address") as HTMLInputElement;
    fireEvent.change(input, { target: { value: VALID_SECRET_KEY } });

    expect(screen.getByRole("alert")).toHaveTextContent(/secret key/i);
    expect(input.value).toBe("");
    expect(localStorage.getItem("audioblocks:payout-methods:v1")).toBeNull();
  });

  it("accepts and stores a valid Stellar public key (normalized to uppercase)", () => {
    render(<PayoutSettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: /\+ Add Payout Method/i }));
    const input = screen.getByLabelText("Payout address");
    fireEvent.change(input, { target: { value: `  ${VALID_PUBLIC_KEY.toLowerCase()}  ` } });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Save Method/i }));
    const stored = JSON.parse(localStorage.getItem("audioblocks:payout-methods:v1") ?? "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].address).toBe(VALID_PUBLIC_KEY);
  });
});
