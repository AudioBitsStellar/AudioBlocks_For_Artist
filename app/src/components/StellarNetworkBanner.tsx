import { getRuntimeConfig } from "@/lib/runtimeConfig";

const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
const MAINNET_PASSPHRASE = "Public Global Stellar Network ; September 2015";

export default function StellarNetworkBanner() {
  const { stellarNetworkPassphrase } = getRuntimeConfig();
  if (stellarNetworkPassphrase === MAINNET_PASSPHRASE) return null;

  const isTestnet = stellarNetworkPassphrase === TESTNET_PASSPHRASE;

  return (
    <aside
      role="status"
      aria-label="Stellar network environment"
      className="w-full border-b border-amber-700 bg-amber-300 text-zinc-950"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm sm:px-6">
        <strong className="font-bold">{isTestnet ? "TESTNET" : "NON-MAINNET NETWORK"}</strong>
        <span>
          {isTestnet
            ? "This app is connected to Stellar Testnet. Transactions have no mainnet value."
            : "This app is configured for a non-mainnet Stellar network. Transactions may have no mainnet value."}
        </span>
      </div>
    </aside>
  );
}
