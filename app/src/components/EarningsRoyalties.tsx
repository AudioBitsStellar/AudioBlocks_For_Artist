"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Calendar, ChevronDown, Download, Printer } from "lucide-react";
import useEarningsServices from "@/services/earningsService";
import { colorTokens } from "@/theme/colors";
import { getDisplayNameFromToken } from "@/utils/jwt";
import { downloadCsv, escapeCsvValue } from "@/utils/csv";
import {
  assetsIn,
  formatAssetAmount,
  summarizeEarnings,
  type EarningsMonth,
} from "@/utils/royaltyEarnings";

const PRINT_TARGET_ID = "earnings-report-print";
const PRINT_BODY_CLASS = "printing-earnings-report";

const DATE_RANGES = [
  { months: 3, label: "Last 3 months" },
  { months: 6, label: "Last 6 months" },
  { months: 12, label: "Last 12 months" },
] as const;

const AXIS_COLOR = "var(--color-text-muted)";
const AXIS_LINE_COLOR = "var(--color-border)";
const RECONCILED_COLOR = colorTokens.secondary.default;
const PENDING_COLOR = colorTokens.primary.default;
const AREA_STOP_A = colorTokens.primary.default;
const AREA_STOP_B = colorTokens.secondary.default;

const RECENT_PAYOUT_LIMIT = 5;

const STATUS_LABEL: Record<string, string> = {
  reconciled: "Reconciled",
  pending: "Pending reconciliation",
  discrepancy: "Under review",
};

function getCurrentMonthFilename(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `earnings_${year}-${month}.csv`;
}

function createEarningsCsv(months: EarningsMonth[], asset: string): string {
  const header = ["Month", "Asset", "Reconciled", "Pending"].join(",");
  const rows = months.map((month) =>
    [month.key, asset, month.reconciled, month.pending].map(escapeCsvValue).join(",")
  );
  return [header, ...rows].join("\r\n");
}

const ChartSkeleton = () => (
  <div className="animate-pulse" data-testid="earnings-loading">
    <div className="h-6 w-32 bg-surface-raised rounded mb-4" />
    <div className="h-9 w-48 bg-surface-raised rounded mb-2" />
    <div className="h-4 w-64 bg-surface-raised rounded mb-6" />
    <div className="h-64 bg-surface-raised rounded" />
  </div>
);

const EmptyState = () => (
  <div className="h-64 flex flex-col items-center justify-center text-text-muted gap-2">
    <p className="text-lg font-semibold">No earnings data yet</p>
    <p className="text-sm">
      Royalties appear here once a sale of your music is recorded by the royalty contract.
    </p>
  </div>
);

export default function EarningsRoyalties() {
  const { useGetRoyaltyPayouts } = useEarningsServices();
  const { records, isLoading, isError, refetch } = useGetRoyaltyPayouts(true);

  const [monthCount, setMonthCount] = useState<number>(12);
  const assets = useMemo(() => assetsIn(records), [records]);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const asset =
    selectedAsset && assets.includes(selectedAsset) ? selectedAsset : (assets[0] ?? "XLM");
  const rangeLabel = DATE_RANGES.find((range) => range.months === monthCount)?.label ?? "";

  const summary = useMemo(
    () => summarizeEarnings(records, asset, monthCount),
    [records, asset, monthCount]
  );
  const hasRecords = records.length > 0;

  const change = summary.changeFromLastMonth;
  const changeLabel =
    change === 0
      ? "Same as last month"
      : change > 0
        ? `${formatAssetAmount(change, asset)} more than last month`
        : `${formatAssetAmount(Math.abs(change), asset)} less than last month`;

  const handlePrint = useCallback(() => {
    if (typeof window === "undefined") return;

    const cleanup = () => {
      document.body.classList.remove(PRINT_BODY_CLASS);
      window.removeEventListener("afterprint", cleanup);
    };

    document.body.classList.add(PRINT_BODY_CLASS);
    window.addEventListener("afterprint", cleanup);
    window.print();
  }, []);

  const handleExport = useCallback(() => {
    downloadCsv(
      createEarningsCsv(hasRecords ? summary.months : [], asset),
      getCurrentMonthFilename()
    );
  }, [summary.months, asset, hasRecords]);

  return (
    <div id={PRINT_TARGET_ID} className="bg-surface-raised rounded-lg p-6">
      <div className="earnings-print-only hidden">
        <h1 className="text-lg font-bold">Earnings & Royalties Report</h1>
        <p className="text-sm">Artist: {getDisplayNameFromToken()}</p>
        <p className="text-sm">Date range: {rangeLabel}</p>
        <p className="text-sm">Generated: {new Date().toLocaleDateString()}</p>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex-1">
          <h2 className="text-text text-xl font-bold mb-4">Earnings & Royalties</h2>
          {isLoading ? (
            <div className="animate-pulse">
              <div className="h-9 w-48 bg-surface-raised rounded mb-2" />
              <div className="h-4 w-64 bg-surface-raised rounded" />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-baseline gap-4">
                <p className="text-text text-3xl font-bold" data-testid="earnings-total">
                  {formatAssetAmount(summary.totalReconciled, asset)}
                </p>
                <p className="text-text-muted text-sm">{changeLabel}</p>
              </div>
              <p className="mt-1 text-text-muted text-sm">
                Gross reconciled royalty sales, {rangeLabel.toLowerCase()}
                {summary.totalPending > 0
                  ? ` · ${formatAssetAmount(summary.totalPending, asset)} pending reconciliation`
                  : ""}
              </p>
            </>
          )}
        </div>

        <div className="earnings-print-hide flex flex-wrap gap-2">
          {assets.length > 1 && (
            <div className="relative">
              <select
                aria-label="Earnings asset"
                value={asset}
                onChange={(event) => setSelectedAsset(event.target.value)}
                className="bg-surface-sunken border border-border rounded-lg px-4 pr-8 py-2 text-text text-sm appearance-none cursor-pointer hover:border-border-subtle transition-colors"
              >
                {assets.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted pointer-events-none"
                size={16}
                aria-hidden="true"
              />
            </div>
          )}

          <div className="relative">
            <Calendar
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted"
              size={16}
              aria-hidden="true"
            />
            <select
              aria-label="Earnings date range"
              value={monthCount}
              onChange={(event) => setMonthCount(Number(event.target.value))}
              className="bg-surface-sunken border border-border rounded-lg pl-10 pr-8 py-2 text-text text-sm appearance-none cursor-pointer hover:border-border-subtle transition-colors"
            >
              {DATE_RANGES.map((range) => (
                <option key={range.months} value={range.months}>
                  {range.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted pointer-events-none"
              size={16}
              aria-hidden="true"
            />
          </div>

          <button
            type="button"
            onClick={handleExport}
            aria-label="Export earnings and royalties as CSV"
            className="inline-flex items-center gap-2 bg-surface-sunken border border-border rounded-lg px-4 py-2 text-text text-sm hover:border-border-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Download size={16} aria-hidden="true" />
            Export CSV
          </button>

          <button
            type="button"
            onClick={handlePrint}
            aria-label="Print earnings and royalties report"
            className="inline-flex items-center justify-center bg-surface-sunken border border-border rounded-lg px-3 py-2 text-text hover:border-border-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Printer size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {isError ? (
        <div
          className="h-64 flex flex-col items-center justify-center gap-3 text-red-400"
          role="alert"
        >
          <p>Failed to load earnings data. Please try again later.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-lg border border-border px-4 py-2 text-sm text-text transition-colors hover:border-border-subtle"
          >
            Retry
          </button>
        </div>
      ) : isLoading ? (
        <ChartSkeleton />
      ) : !hasRecords ? (
        <EmptyState />
      ) : (
        <>
          <div className="h-80" aria-hidden="true" data-testid="earnings-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary.months} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="earnings-area-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={AREA_STOP_A} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={AREA_STOP_B} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={AXIS_LINE_COLOR} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" stroke={AXIS_COLOR} axisLine={false} tickLine={false} />
                <YAxis
                  stroke={AXIS_COLOR}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => Number(value).toLocaleString("en-US")}
                />
                <Tooltip
                  formatter={(value, name) => [formatAssetAmount(Number(value), asset), name]}
                />
                <Area
                  type="monotone"
                  dataKey="reconciled"
                  name="Reconciled"
                  stroke={RECONCILED_COLOR}
                  fill="url(#earnings-area-gradient)"
                  strokeWidth={2}
                  // A lone non-zero month would otherwise be a flat line with a bump.
                  dot={{ r: 3 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="pending"
                  name="Pending reconciliation"
                  stroke={PENDING_COLOR}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* The chart is decorative for assistive tech; this table carries the same numbers. */}
          <table className="sr-only earnings-print-only">
            <caption>
              Royalty sales in {asset} per month, {rangeLabel.toLowerCase()}
            </caption>
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col">Reconciled</th>
                <th scope="col">Pending</th>
              </tr>
            </thead>
            <tbody>
              {summary.months.map((month) => (
                <tr key={month.key}>
                  <th scope="row">{month.label}</th>
                  <td>{formatAssetAmount(month.reconciled, asset)}</td>
                  <td>{formatAssetAmount(month.pending, asset)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <section className="earnings-print-hide mt-6 rounded-lg border border-border bg-surface-sunken p-4">
            <h3 className="text-text font-semibold">Recent royalty payouts</h3>
            {summary.records.length === 0 ? (
              <p className="mt-3 text-sm text-text-muted">No {asset} payouts recorded yet.</p>
            ) : (
              <ul className="mt-3 space-y-3" aria-label="Recent royalty payouts">
                {summary.records.slice(0, RECENT_PAYOUT_LIMIT).map((record) => (
                  <li
                    key={record.id || `${record.saleEventId}-${record.createdAt}`}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-text">
                        {formatAssetAmount(record.amount, asset)}
                      </p>
                      <p className="text-text-muted">
                        {new Date(record.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="rounded-full bg-surface-raised px-3 py-1 text-xs text-text-muted">
                      {STATUS_LABEL[record.status] ?? record.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {/* Compliance & legal disclaimer per #783 / COMP-01 */}
      <p
        className="mt-4 text-xs text-text-muted leading-relaxed"
        data-testid="earnings-legal-disclaimer"
      >
        * Earnings and royalties represent distributions calculated from verified streaming volume,
        licensed sync usage, and digital collectible transactions according to agreed smart contract
        terms. Royalties are not guaranteed returns, dividends, or interest-bearing financial
        investments.
      </p>
    </div>
  );
}

export { EarningsRoyalties };
