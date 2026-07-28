'use client';

import { useCallback } from 'react';
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
} from 'recharts';
import { Calendar, ChevronDown, Printer } from 'lucide-react';
import useEarningsServices from '@/services/earningsService';
import { EarningsDataPoint } from '@/types';
import { colorTokens } from '@/theme/colors';
import { getDisplayNameFromToken } from '@/utils/jwt';

const PRINT_TARGET_ID = 'earnings-report-print';
const PRINT_BODY_CLASS = 'printing-earnings-report';
const DATE_RANGE_LABEL = 'Last 12 months';

// Tooltip fill / text colors come from the token system so the chart follows
// the active theme automatically (issue #180).
const TOOLTIP_FILL = colorTokens.primary.default;
const TOOLTIP_TEXT = colorTokens.primary.contrast;
const AXIS_COLOR = 'var(--color-text-muted)';
const AXIS_LINE_COLOR = 'var(--color-border)';
const LINE_COLOR = colorTokens.secondary.default;
const AREA_STOP_A = colorTokens.primary.default;
const AREA_STOP_B = colorTokens.secondary.default;

// ─── Tooltip ────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, coordinate }: any) => {
  if (active && payload && payload.length) {
    const data: EarningsDataPoint = payload[0].payload;
    const isHighlighted = data.month === highlightedMonth(payload[0].payload);
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

// Returns the last month in the dataset (the highlighted dot)
function highlightedMonth(payload: EarningsDataPoint): string {
  return payload.month;
}

// ─── Dot ────────────────────────────────────────────────────────────────────
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

// ─── Loading skeleton ────────────────────────────────────────────────────────
const ChartSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-6 w-32 bg-surface-raised rounded mb-4" />
    <div className="h-9 w-48 bg-surface-raised rounded mb-2" />
    <div className="h-4 w-64 bg-surface-raised rounded mb-6" />
    <div className="h-64 bg-surface-raised rounded" />
  </div>
);

// ─── Empty state ─────────────────────────────────────────────────────────────
const EmptyState = () => (
  <div className="h-64 flex flex-col items-center justify-center text-text-muted gap-2">
    <p className="text-lg font-semibold">No earnings data yet</p>
    <p className="text-sm">Your earnings and royalties will appear here once available.</p>
  </div>
);

// ─── Main component ──────────────────────────────────────────────────────────
export default function EarningsRoyalties() {
  const { useGetEarnings } = useEarningsServices();
  const { data: response, isLoading, isError } = useGetEarnings(true);

  const summary = response?.data;
  const chartData: EarningsDataPoint[] = summary?.data ?? [];

  // The most recent month gets the pink dot + dashed reference line
  const highlightMonth = chartData.length > 0 ? chartData[chartData.length - 1].month : '';

  const totalEarnings = summary?.totalEarnings ?? 0;
  const diff = summary?.comparedToLastMonth ?? 0;
  const diffLabel =
    diff === 0
      ? 'Same as last month'
      : diff > 0
      ? `$${diff.toLocaleString()} more than last month`
      : `$${Math.abs(diff).toLocaleString()} less than last month`;

  const handlePrint = useCallback(() => {
    if (typeof window === 'undefined') return;

    const cleanup = () => {
      document.body.classList.remove(PRINT_BODY_CLASS);
      window.removeEventListener('afterprint', cleanup);
    };

    document.body.classList.add(PRINT_BODY_CLASS);
    window.addEventListener('afterprint', cleanup);
    window.print();
  }, []);

  return (
    <div id={PRINT_TARGET_ID} className="bg-surface-raised rounded-lg p-6">
      {/* Print-only report header: hidden on screen, shown via @media print */}
      <div className="earnings-print-only hidden">
        <h1 className="text-lg font-bold">Earnings & Royalties Report</h1>
        <p className="text-sm">Artist: {getDisplayNameFromToken()}</p>
        <p className="text-sm">Date range: {DATE_RANGE_LABEL}</p>
        <p className="text-sm">Generated: {new Date().toLocaleDateString()}</p>
      </div>

      {/* Header */}
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
                ${totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-text-muted text-sm">{diffLabel}</p>
            </div>
          )}
        </div>
        <div className="earnings-print-hide flex gap-2">
          <div className="relative">
            <select className="bg-surface-sunken border border-border rounded-lg px-4 pr-8 py-2 text-text text-sm appearance-none cursor-pointer hover:border-border-subtle transition-colors">
              <option>Royalties</option>
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted pointer-events-none"
              size={16}
            />
          </div>
          <div className="relative">
            <Calendar
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted"
              size={16}
            />
            <select className="bg-surface-sunken border border-border rounded-lg pl-10 pr-8 py-2 text-text text-sm appearance-none cursor-pointer hover:border-border-subtle transition-colors">
              <option>{DATE_RANGE_LABEL}</option>
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted pointer-events-none"
              size={16}
            />
          </div>
          <button
            type="button"
            onClick={handlePrint}
            aria-label="Print earnings report"
            title="Print earnings report"
            className="flex items-center justify-center w-11 h-11 bg-surface-sunken border border-border rounded-lg text-text-muted hover:border-border-subtle hover:text-text transition-colors cursor-pointer"
          >
            <Printer size={16} />
          </button>
        </div>
      </div>

      {/* Chart area */}
      {isLoading ? (
        <ChartSkeleton />
      ) : isError ? (
        <div className="h-64 flex items-center justify-center text-error text-sm">
          Failed to load earnings data. Please try again later.
        </div>
      ) : chartData.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="earnings-print-hide h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={AREA_STOP_A} stopOpacity={0.35} />
                  <stop offset="97.33%" stopColor={AREA_STOP_A} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={AREA_STOP_B} stopOpacity={0.35} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="transparent" vertical={false} />
              <XAxis
                dataKey="month"
                stroke={AXIS_COLOR}
                style={{ fontSize: '12px' }}
                tick={{ fill: AXIS_COLOR }}
                axisLine={{ stroke: AXIS_LINE_COLOR }}
              />
              <YAxis
                stroke={AXIS_COLOR}
                style={{ fontSize: '12px' }}
                tick={{ fill: AXIS_COLOR }}
                tickFormatter={(v) => `$${v}`}
                axisLine={{ stroke: AXIS_LINE_COLOR }}
              />
              <Tooltip content={<CustomTooltip />} />
              {/* Earnings: filled area, no stroke */}
              <Area
                type="monotone"
                dataKey="earnings"
                stroke="transparent"
                strokeWidth={0}
                fill="url(#colorValue)"
                dot={false}
              />
              {/* Royalties: line with pink dot on latest month */}
              <Line
                type="monotone"
                dataKey="royalties"
                stroke={LINE_COLOR}
                strokeWidth={1.4}
                dot={(props: any) => (
                  <CustomDot {...props} highlightMonth={highlightMonth} />
                )}
                activeDot={false}
              />
              {highlightMonth && (
                <ReferenceLine
                  x={highlightMonth}
                  stroke="var(--color-text-inverted)"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  opacity={0.5}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Print-only data table: charts don't render reliably on paper, so the
          print report shows the same monthly figures as a plain table. */}
      {chartData.length > 0 && (
        <table className="earnings-print-only hidden">
          <thead>
            <tr>
              <th>Month</th>
              <th>Earnings</th>
              <th>Royalties</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((point) => (
              <tr key={point.month}>
                <td>{point.month}</td>
                <td>${point.earnings.toLocaleString()}</td>
                <td>${point.royalties.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
