"use client";

import { useCallback, useState } from "react";
import {
  Area,
  AreaChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  TooltipProps,
} from "recharts";
import { Calendar, ChevronDown, Download, Printer, Wallet } from "lucide-react";
import useEarningsServices from "@/services/earningsService";
import { EarningsDataPoint } from "@/types";
import { colorTokens } from "@/theme/colors";
import { getDisplayNameFromToken } from "@/utils/jwt";

const PRINT_TARGET_ID = "earnings-report-print";
const PRINT_BODY_CLASS = "printing-earnings-report";
const DATE_RANGE_LABEL = "Last 12 months";

const TOOLTIP_FILL = colorTokens.primary.default;
const TOOLTIP_TEXT = colorTokens.primary.contrast;
const AXIS_COLOR = "var(--color-text-muted)";
const AXIS_LINE_COLOR = "var(--color-border)";
const LINE_COLOR = colorTokens.secondary.default;
const AREA_STOP_A = colorTokens.primary.default;
const AREA_STOP_B = colorTokens.secondary.default;

const CSV_HEADERS = ["Month", "Earnings", "Royalties"];

function escapeCsvValue(value: string | number): string {
  const stringValue = String(value);
  return /[",\n\r]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
}

function getCurrentMonthFilename(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `earnings_${year}-${month}.csv`;
}

function createEarningsCsv(data: EarningsDataPoint[]): string {
  const rows = data.map((point) =>
    [point.month, point.earnings, point.royalties].map(escapeCsvValue).join(",")
  );

  return [CSV_HEADERS.join(","), ...rows].join("\r\n");
}

const CustomTooltip = ({ active, payload, coordinate }: TooltipProps<number, string>) => {
  if (active && payload && payload.length && coordinate) {
    const data: EarningsDataPoint = payload[0].payload as EarningsDataPoint;
    const isHighlighted = data.month === highlightedMonth(payload[0].payload as EarningsDataPoint);
    if (isHighlighted) {
      return (
        <g>
          <rect
            x={coordinate.x - 30}
            y={coordinate.y - 35}
            width={60}
            height={28}
            rx={8}
            fill={TOOLTIP_FILL}
          />
          <text
            x={coordinate.x}
            y={coordinate.y - 18}
            textAnchor="middle"
            fill={TOOLTIP_TEXT}
            fontSize={14}
            fontWeight="600"
          >
            ${data.royalties.toLocaleString()}
          </text>
        </g>
      );
    }
  }
  return null;
};

function highlightedMonth(payload: EarningsDataPoint): string {
  return payload.month;
}

const CustomDot = ({
  cx,
  cy,
  payload,
  highlightMonth,
}: {
  cx?: number;
  cy?: number;
  payload?: EarningsDataPoint;
  highlightMonth: string;
}) => {
  if (payload?.month === highlightMonth) {
    return <circle cx={cx} cy={cy} r={6} fill={TOOLTIP_FILL} />;
  }
  return null;
};

const ChartSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-6 w-32 bg-surface-raised rounded mb-4" />
    <div className="h-9 w-48 bg-surface-raised rounded mb-2" />
    <div className="h-4 w-64 bg-surface-raised rounded mb-6" />
    <div className="h-64 bg-surface-raised rounded" />
  </div>
);

const EmptyState = () => (
  <div className="h-64 flex flex-col items-center justify-center text-text-muted gap-2">
    <p className="text-lg font-semibold">No earnings data yet</p>
    <p className="text-sm">Your earnings and royalties will appear here once available.</p>
  </div>
);

export default function EarningsRoyalties() {
  const { useGetEarnings } = useEarningsServices();
  const { data: response, isLoading, isError } = useGetEarnings(true);

  const summary = response?.data;
  const chartData: EarningsDataPoint[] = summary?.data ?? [];
  const highlightMonth = chartData.length > 0 ? chartData[chartData.length - 1].month : "";
  const [payoutRequested, setPayoutRequested] = useState(false);

  const totalEarnings = summary?.totalEarnings ?? 0;
  const diff = summary?.comparedToLastMonth ?? 0;
  const diffLabel =
    diff === 0
      ? "Same as last month"
      : diff > 0
        ? `$${diff.toLocaleString()} more than last month`
        : `$${Math.abs(diff).toLocaleString()} less than last month`;

  const availablePayout = Math.max(totalEarnings, 0);
  const payoutHistory = [
    ...(payoutRequested
      ? [
          {
            id: "pending-request",
            amount: availablePayout,
            status: "Pending review",
            requestedAt: "Today",
          },
        ]
      : []),
    {
      id: "last-withdrawal",
      amount: 1840,
      status: "Completed",
      requestedAt: "Jul 12, 2026",
    },
  ];

  const handleRequestPayout = useCallback(() => {
    if (availablePayout <= 0) return;
    setPayoutRequested(true);
  }, [availablePayout]);

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
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const csv = createEarningsCsv(chartData);
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = getCurrentMonthFilename();
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [chartData]);

  return (
    <div id={PRINT_TARGET_ID} className="bg-surface-raised rounded-lg p-6">
      <div className="earnings-print-only hidden">
        <h1 className="text-lg font-bold">Earnings & Royalties Report</h1>
        <p className="text-sm">Artist: {getDisplayNameFromToken()}</p>
        <p className="text-sm">Date range: {DATE_RANGE_LABEL}</p>
        <p className="text-sm">Generated: {new Date().toLocaleDateString()}</p>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <h2 className="text-text text-xl font-bold mb-4">Earnings & Royalties</h2>
          {isLoading ? (
            <div className="animate-pulse">
              <div className="h-9 w-48 bg-surface-raised rounded mb-2" />
              <div className="h-4 w-64 bg-surface-raised rounded" />
            </div>
          ) : (
            <div className="flex items-baseline gap-4">
              <p className="text-text text-3xl font-bold">
                ${totalEarnings.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-text-muted text-sm">{diffLabel}</p>
            </div>
          )}
        </div>

        <div className="earnings-print-hide flex gap-2">
          <div className="relative">
            <select
              aria-label="Earnings type"
              className="bg-surface-sunken border border-border rounded-lg px-4 pr-8 py-2 text-text text-sm appearance-none cursor-pointer hover:border-border-subtle transition-colors"
            >
              <option>Royalties</option>
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted pointer-events-none"
              size={16}
              aria-hidden="true"
            />
          </div>

          <div className="relative">
            <Calendar
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted"
              size={16}
              aria-hidden="true"
            />
            <select
              aria-label="Earnings date range"
              className="bg-surface-sunken border border-border rounded-lg pl-10 pr-8 py-2 text-text text-sm appearance-none cursor-pointer hover:border-border-subtle transition-colors"
            >
              <option>{DATE_RANGE_LABEL}</option>
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

      <div className="earnings-print-hide grid gap-4 lg:grid-cols-[1.1fr_0.9fr] mb-6">
        <section className="rounded-lg border border-border bg-surface-sunken p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-text font-semibold">
                <Wallet size={18} aria-hidden="true" />
                <h3>Request payout</h3>
              </div>
              <p className="mt-1 text-sm text-text-muted">
                Send available royalties to your connected payout destination.
              </p>
            </div>
            <span className="rounded-full bg-surface-raised px-3 py-1 text-xs text-text-muted">
              {payoutRequested ? "Pending" : "Ready"}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-text-muted">Available balance</p>
              <p className="text-2xl font-bold text-text">
                ${availablePayout.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRequestPayout}
              disabled={isLoading || availablePayout <= 0 || payoutRequested}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {payoutRequested ? "Request submitted" : "Request payout"}
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface-sunken p-4">
          <h3 className="text-text font-semibold">Withdrawal history</h3>
          <ul className="mt-3 space-y-3" aria-label="Withdrawal history">
            {payoutHistory.map((payout) => (
              <li key={payout.id} className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium text-text">
                    ${payout.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-text-muted">{payout.requestedAt}</p>
                </div>
                <span className="rounded-full bg-surface-raised px-3 py-1 text-xs text-text-muted">
                  {payout.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {isError ? (
        <div className="h-64 flex items-center justify-center text-red-400" role="alert">
          Failed to load earnings data. Please try again later.
        </div>
      ) : isLoading ? (
        <ChartSkeleton />
      ) : chartData.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="h-80" aria-label="Earnings and royalties chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="earnings-area-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={AREA_STOP_A} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={AREA_STOP_B} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={AXIS_LINE_COLOR} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" stroke={AXIS_COLOR} axisLine={false} tickLine={false} />
              <YAxis
                stroke={AXIS_COLOR}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `$${Number(value).toLocaleString()}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                x={highlightMonth}
                stroke={AXIS_COLOR}
                strokeDasharray="5 5"
                ifOverflow="extendDomain"
              />
              <Area
                type="monotone"
                dataKey="earnings"
                stroke={LINE_COLOR}
                fill="url(#earnings-area-gradient)"
                strokeWidth={2}
                dot={<CustomDot highlightMonth={highlightMonth} />}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="royalties"
                stroke={TOOLTIP_FILL}
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export { EarningsRoyalties };
