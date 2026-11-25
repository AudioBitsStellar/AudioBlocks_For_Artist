import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import StellarNetworkBanner from "@/components/StellarNetworkBanner";

describe("StellarNetworkBanner", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete window.__RUNTIME_CONFIG__;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    delete window.__RUNTIME_CONFIG__;
  });

  it("shows a persistent testnet warning", () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

    render(<StellarNetworkBanner />);

    expect(screen.getByRole("status", { name: "Stellar network environment" })).toHaveTextContent(
      /TESTNET.*Stellar Testnet.*no mainnet value/i
    );
  });

  it("does not show a warning when configured for mainnet", () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE =
      "Public Global Stellar Network ; September 2015";

    const { container } = render(<StellarNetworkBanner />);

    expect(container).toBeEmptyDOMElement();
  });
});
