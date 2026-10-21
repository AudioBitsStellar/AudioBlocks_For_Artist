"use client";

import { useEffect, useState } from "react";
import { Wallet, ExternalLink, Copy, Check, ArrowDownLeft, ShieldCheck, RefreshCw } from "lucide-react";
import { fetchAccountBalances, type HorizonBalance } from "@/lib/horizon";
import { useStellarWallet } from "@/components/common/wallet/useStellarWallet";
import { getActiveNetworkId } from "@/lib/stellarNetwork";

interface PayoutWalletProps {
  /** Optional balance or address props for backward compatibility */
  availableBalance?: string;
  walletAddress?: string;
  onWithdraw?: (input: any) => Promise<string>;
}

interface RoyaltyPayment {
  id: string;
  txHash: string;
  amount: string;
  asset: string;
  date: string;
  source: string;
}

const SAMPLE_RECENT_ROYALTIES: RoyaltyPayment[] = [
  {
    id: "royalty-1",
    txHash: "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
    amount: "125.40",
    asset: "XLM",
    date: "2026-05-01",
    source: "Midnight Drive Streams",
  },
  {
    id: "royalty-2",
    txHash: "d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0123456",
    amount: "98.75",
    asset: "XLM",
    date: "2026-04-10",
    source: "Lagos Live Sessions Sales",
  },
];

export default function WithdrawFunds({ walletAddress, availableBalance }: PayoutWalletProps) {
  const { address: connectedAddress } = useStellarWallet();
  const address =
    walletAddress ||
    connectedAddress ||
    "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";

  const [balances, setBalances] = useState<HorizonBalance[] | null>(
    availableBalance
      ? [{ asset_type: "native", balance: availableBalance }]
      : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const networkId = typeof window !== "undefined" ? getActiveNetworkId() : "testnet";

  const loadBalances = async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      const data = await fetchAccountBalances(address);
      if (data) {
        setBalances(data);
      }
    } catch {
      // keep fallback/current
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBalances();
  }, [address]);

  const handleCopy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const shortened = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

  return (
    <div className="bg-[#1f2622] border border-[#2d3d2d] rounded-lg p-6 space-y-5 text-text">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2d3d2d] pb-4">
        <div className="flex items-center gap-2">
          <Wallet size={20} className="text-pink-500" aria-hidden="true" />
          <h2 className="text-white text-lg font-semibold">Your payout wallet</h2>
        </div>
        <button
          onClick={loadBalances}
          disabled={isLoading}
          aria-label="Refresh balances"
          className="text-gray-400 hover:text-white transition-colors p-1 rounded"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin text-pink-500" : ""} />
        </button>
      </div>

      {/* Wallet Address & Explorer Link */}
      <div className="space-y-1.5">
        <span className="text-xs text-gray-400">Payout Address</span>
        <div className="flex items-center justify-between bg-black/40 px-3 py-2 rounded-lg border border-[#2A2A2A]">
          <span className="font-mono text-sm text-gray-200" title={address}>
            {shortened}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs text-pink-400 hover:text-pink-300 font-medium flex items-center gap-1"
              aria-label="Copy wallet address"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
            <a
              href={`https://stellar.expert/explorer/${networkId}/account/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
              aria-label="View account on StellarExpert"
            >
              <ExternalLink size={13} />
            </a>
          </div>
        </div>
      </div>

      {/* Non-custodial explanation banner */}
      <div className="p-3 bg-zinc-900/80 border border-zinc-700/60 rounded-lg flex items-start gap-2.5">
        <ShieldCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" />
        <p className="text-xs text-gray-300 leading-relaxed">
          AudioBlocks is strictly <strong>non-custodial</strong>. Royalties are distributed on-chain directly to your Stellar address by the smart contract. AudioBlocks never holds your funds.
        </p>
      </div>

      {/* Live Balances Per Asset */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Live On-Chain Balances
        </h3>
        {isLoading && !balances ? (
          <p className="text-xs text-gray-400 animate-pulse">Fetching balances from Horizon...</p>
        ) : balances && balances.length > 0 ? (
          <div className="divide-y divide-[#2A2A2A] rounded-lg border border-[#2A2A2A] bg-black/30 overflow-hidden">
            {balances.map((b, i) => {
              const code = b.asset_type === "native" ? "XLM" : b.asset_code || "Unknown";
              return (
                <div key={i} className="flex justify-between items-center px-3 py-2 text-sm">
                  <span className="font-medium text-white">{code}</span>
                  <span className="font-mono text-gray-200">{b.balance}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-[#2A2A2A] bg-black/30 p-3 text-xs text-gray-400">
            {address ? "Account unfunded or no active asset balances on Horizon." : "No wallet connected."}
          </div>
        )}
      </div>

      {/* Link to move funds using artist's own wallet */}
      <div className="pt-1">
        <a
          href="https://www.freighter.app"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#2A2A2A] hover:bg-[#333333] text-gray-200 text-xs font-semibold px-4 py-2.5 transition-colors border border-zinc-700/60"
        >
          <span>Move funds using your Stellar wallet</span>
          <ExternalLink size={13} />
        </a>
      </div>

      {/* Recent incoming royalty payments with explorer links */}
      <div className="space-y-2 pt-2 border-t border-[#2d3d2d]">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Recent Incoming Royalties
        </h3>
        <div className="space-y-2">
          {SAMPLE_RECENT_ROYALTIES.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between p-2.5 rounded-lg bg-black/20 border border-[#2A2A2A] text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-full bg-emerald-500/10 text-emerald-400">
                  <ArrowDownLeft size={14} />
                </span>
                <div>
                  <p className="font-medium text-white">{r.source}</p>
                  <p className="text-[11px] text-gray-400">{r.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono font-medium text-emerald-400">+{r.amount} {r.asset}</p>
                <a
                  href={`https://stellar.expert/explorer/${networkId}/tx/${r.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-gray-400 hover:text-white flex items-center gap-0.5 justify-end"
                >
                  <span>tx</span>
                  <ExternalLink size={9} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { WithdrawFunds, WithdrawFunds as PayoutWalletView };
