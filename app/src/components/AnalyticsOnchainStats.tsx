"use client";

/**
 * On-chain plays and sales in the analytics dashboard (#467), read from the
 * subgraph by `services/onchainAnalyticsService.ts` and gated behind the
 * `artistOnchainAnalytics` rollout flag (#469).
 *
 * The panel is additive: the backend REST analytics already on this page keep
 * working when the subgraph is unconfigured, slow or wrong. That's why the
 * flag check lives in the outer component (an artist outside the rollout never
 * issues the request) and why every failure mode below renders a quiet note
 * rather than throwing into the page.
 */

import { useEffect, useState } from "react";
import { Activity, DollarSign, PlayCircle, ShoppingBag } from "lucide-react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { getFreighterAddress } from "@/lib/freighter";
import { isSubgraphConfigured } from "@/lib/subgraph";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import useOnchainAnalyticsService, {
  indexerLagMinutes,
  OnchainStatsPeriod,
} from "@/services/onchainAnalyticsService";

interface AnalyticsOnchainStatsProps {
  period?: OnchainStatsPeriod;
}

const Stat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="p-4 bg-[#2d3d2d] rounded-lg border border-[#3d4d3d]">
    <p className="text-gray-400 text-sm font-medium mb-1 flex items-center gap-2">
      {icon}
      {label}
    </p>
    <p className="text-white text-2xl font-bold">{value}</p>
  </div>
);

function OnchainStatsPanel({
  artistAddress,
  period,
}: {
  artistAddress: string;
  period: OnchainStatsPeriod;
}) {
  const { useGetOnchainStats } = useOnchainAnalyticsService();
  const { data, isLoading, isError, refetch, isStaleData } = useGetOnchainStats(
    artistAddress,
    period
  );

  if (isLoading) {
    return (
      <div className="mt-8 bg-[#1f2622] border border-[#2d3d2d] rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-[#2d3d2d] rounded w-1/3 mb-6"></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-24 bg-[#2d3d2d] rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <section
        className="mt-8 bg-[#1f2622] border border-[#2d3d2d] rounded-lg p-6"
        aria-label="On-chain activity unavailable"
      >
        <h3 className="text-white text-lg font-semibold mb-2">On-chain activity unavailable</h3>
        <p className="text-gray-400 text-sm mb-4">
          The indexer could not be reached, so the figures below stay as they are.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-4 py-2 rounded bg-pink-500 hover:bg-pink-600 text-white text-sm font-medium transition-colors"
        >
          Retry
        </button>
      </section>
    );
  }

  return (
    <section
      className="mt-8 bg-[#1f2622] border border-[#2d3d2d] rounded-lg p-6"
      role="region"
      aria-label="On-chain plays and sales"
    >
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h3 className="text-white text-lg font-semibold">On-chain plays and sales</h3>
        {isStaleData && data.indexedAt !== null && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400"
            title="The indexer has not produced a recent block, so these totals lag behind the chain."
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            {indexerLagMinutes(data.indexedAt)} min behind chain
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat
          icon={<PlayCircle className="w-4 h-4 text-pink-500" aria-hidden="true" />}
          label="Plays"
          value={data.totalPlays.toLocaleString()}
        />
        <Stat
          icon={<ShoppingBag className="w-4 h-4 text-pink-500" aria-hidden="true" />}
          label="Sales"
          value={data.totalSales.toLocaleString()}
        />
        <Stat
          icon={<DollarSign className="w-4 h-4 text-pink-500" aria-hidden="true" />}
          label="Sale volume"
          value={`${data.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} XLM`}
        />
      </div>

      <p className="text-gray-500 text-xs mt-4 flex items-center gap-2">
        <Activity className="w-3.5 h-3.5" aria-hidden="true" />
        {data.daily.length === 0
          ? "No on-chain activity indexed for this artist in the period yet."
          : `From ${data.daily.length} indexed day${data.daily.length === 1 ? "" : "s"}${
              data.indexedBlock !== null ? ` at ledger ${data.indexedBlock.toLocaleString()}` : ""
            }.`}
      </p>
    </section>
  );
}

export default function AnalyticsOnchainStats({ period = 30 }: AnalyticsOnchainStatsProps) {
  const [artistAddress, setArtistAddress] = useState<string | null>(null);
  const [walletChecked, setWalletChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Same read `useStellarWallet` uses to restore a previous session: the
    // extension answers for itself, and a null answer just means "not connected".
    getFreighterAddress()
      .then((address) => {
        if (!cancelled) setArtistAddress(address);
      })
      .catch(() => {
        if (!cancelled) setArtistAddress(null);
      })
      .finally(() => {
        if (!cancelled) setWalletChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const enabled = useFeatureFlag("artistOnchainAnalytics", artistAddress);

  if (!enabled) return null;

  if (!isSubgraphConfigured()) {
    return (
      <section className="mt-8 bg-[#1f2622] border border-[#2d3d2d] rounded-lg p-6">
        <h3 className="text-white text-lg font-semibold mb-2">On-chain activity not set up</h3>
        <p className="text-gray-400 text-sm">
          This deployment has no subgraph endpoint configured, so on-chain plays and sales are not
          available yet.
        </p>
      </section>
    );
  }

  if (!artistAddress) {
    return (
      <section className="mt-8 bg-[#1f2622] border border-[#2d3d2d] rounded-lg p-6">
        <h3 className="text-white text-lg font-semibold mb-2">
          Connect a wallet for on-chain stats
        </h3>
        <p className="text-gray-400 text-sm">
          {walletChecked
            ? "Plays and sales are filed against your Stellar public key. Connect Freighter to see yours."
            : "Checking for a connected Stellar wallet…"}
        </p>
      </section>
    );
  }

  return (
    <ErrorBoundary fallbackTitle="Failed to load on-chain activity">
      <OnchainStatsPanel artistAddress={artistAddress} period={period} />
    </ErrorBoundary>
  );
}

export { AnalyticsOnchainStats };
