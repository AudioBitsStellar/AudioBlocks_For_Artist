"use client";

/**
 * On-chain stats for the connected artist's Stellar account (#466).
 *
 * Every number here is derived from Horizon's index of the ledger by
 * `onchainStatsService`; this component only presents it. Styling uses theme
 * tokens exclusively so the panel follows the light/dark toggle (#463).
 */

import {
  CircleDollarSign,
  Coins,
  ExternalLink,
  Loader2,
  RefreshCw,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { explorerAccountUrl } from "@/lib/horizon";
import MockDataBadge from "./MockDataBadge";
import {
  formatAmount,
  humanizeOperationType,
  shareOfOperations,
  truncateAddress,
  useOnChainStats,
  type OnChainActivitySummary,
} from "@/services/onchainStatsService";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium" });
}

/** Sentence-cased for the breakdown list, where a lowercase label reads broken. */
function operationLabel(type: string): string {
  const label = humanizeOperationType(type);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-center gap-2 text-text-muted">
        <Icon size={16} aria-hidden="true" />
        <p className="text-sm">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold text-text">{value}</p>
      {hint && <p className="mt-1 text-xs text-text-subtle">{hint}</p>}
    </div>
  );
}

function OperationBreakdown({ summary }: { summary: OnChainActivitySummary }) {
  const rows = shareOfOperations(summary.operationsByType, summary.operationCount);

  return (
    <section
      aria-labelledby="onchain-operations-heading"
      className="rounded-lg border border-border bg-surface p-5"
    >
      <h2 id="onchain-operations-heading" className="text-base font-semibold text-text">
        Operations by type
      </h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-text-muted">No operations on this account yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => (
            <li key={row.type}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-text">{operationLabel(row.type)}</span>
                <span className="text-text-muted tabular-nums">
                  {row.count} · {Math.round(row.share * 100)}%
                </span>
              </div>
              <div
                className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-sunken"
                role="presentation"
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(row.share * 100, 2)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function HeldAssets({ summary }: { summary: OnChainActivitySummary }) {
  const rows = [
    { code: "XLM (native)", balance: summary.xlmBalance },
    ...summary.assets.map((asset) => ({ code: asset.code, balance: asset.balance })),
  ];

  return (
    <section
      aria-labelledby="onchain-assets-heading"
      className="rounded-lg border border-border bg-surface p-5"
    >
      <h2 id="onchain-assets-heading" className="text-base font-semibold text-text">
        Assets held
      </h2>
      <table className="mt-4 w-full text-sm">
        <caption className="sr-only">
          Balances held by this account, largest trustline first
        </caption>
        <thead>
          <tr className="text-left text-text-subtle">
            <th scope="col" className="pb-2 font-medium">
              Asset
            </th>
            <th scope="col" className="pb-2 text-right font-medium">
              Balance
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.code} className="border-t border-border-subtle">
              <th scope="row" className="py-2 text-left font-normal text-text">
                {row.code}
              </th>
              <td className="py-2 text-right tabular-nums text-text-muted">
                {formatAmount(row.balance)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default function OnChainStatsPanel() {
  const { summary, address, isLoading, error, isMock, refresh } = useOnChainStats();

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-error/40 bg-error/10 p-5 text-sm text-error"
      >
        <p>{error}</p>
        <button
          type="button"
          onClick={refresh}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 font-medium text-text hover:bg-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <RefreshCw size={14} aria-hidden="true" />
          Try again
        </button>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface p-5 text-sm text-text-muted">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span role="status">Reading your account from Horizon…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center text-base font-semibold text-text">
            <Wallet size={16} className="mr-2" aria-hidden="true" />
            {isMock ? "Sample account" : "Connected account"}
            <MockDataBadge label="onchain-stats" />
          </h2>
          <div className="flex items-center gap-2">
            <a
              href={explorerAccountUrl(summary.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ExternalLink size={14} aria-hidden="true" />
              View on stellar.expert
            </a>
            <button
              type="button"
              onClick={refresh}
              disabled={isLoading}
              aria-label="Refresh on-chain stats"
              className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-raised hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
            </button>
          </div>
        </div>

        <p className="mt-3 break-all font-mono text-xs text-text-subtle">
          {truncateAddress(summary.address)} · {summary.network}
        </p>
        {!address && (
          <p className="mt-2 text-sm text-text-muted">
            Connect a wallet to see your own activity. The figures below are a sample account.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="XLM balance"
          value={formatAmount(summary.xlmBalance)}
          hint={`${summary.assets.length} other asset${summary.assets.length === 1 ? "" : "s"}`}
          icon={CircleDollarSign}
        />
        <KpiCard
          label="Transactions"
          value={String(summary.transactionCount)}
          hint={
            summary.failedTransactionCount > 0
              ? `${summary.failedTransactionCount} failed`
              : "None failed"
          }
          icon={RefreshCw}
        />
        <KpiCard
          label="Operations"
          value={String(summary.operationCount)}
          hint={`${Object.keys(summary.operationsByType).length} kinds`}
          icon={Coins}
        />
        <KpiCard
          label="Active days"
          value={String(summary.activeDays.length)}
          hint={`Since ${formatDateTime(summary.firstActivityAt)}`}
          icon={Wallet}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <OperationBreakdown summary={summary} />
        <HeldAssets summary={summary} />
      </div>

      <p className="text-xs text-text-subtle">
        Last activity {formatDateTime(summary.lastActivityAt)}. Counts cover the {summary.operationCount}{" "}
        most recent operations Horizon has indexed for this account.
      </p>
    </div>
  );
}

export { OnChainStatsPanel };
