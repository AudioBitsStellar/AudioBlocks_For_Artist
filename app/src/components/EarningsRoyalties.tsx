'use client';

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
import { Calendar, ChevronDown } from 'lucide-react';
import useEarningsServices from '@/services/earningsService';
import { EarningsDataPoint } from '@/types';

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
            fill="#EC4899"
          />
          <text
            x={coordinate.x}
            y={coordinate.y - 18}
            textAnchor="middle"
            fill="white"
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
    return <circle cx={cx} cy={cy} r={6} fill="#EC4899" />;
  }
  return null;
};

// ─── Loading skeleton ────────────────────────────────────────────────────────
const ChartSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-6 w-32 bg-gray-700 rounded mb-4" />
    <div className="h-9 w-48 bg-gray-700 rounded mb-2" />
    <div className="h-4 w-64 bg-gray-700 rounded mb-6" />
    <div className="h-64 bg-gray-800 rounded" />
  </div>
);

// ─── Empty state ─────────────────────────────────────────────────────────────
const EmptyState = () => (
  <div className="h-64 flex flex-col items-center justify-center text-gray-500 gap-2">
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

  return (
    <div className="bg-[#151918] rounded-lg p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <h2 className="text-white text-xl font-bold mb-4">Earnings & Royalties</h2>
          {isLoading ? (
            <div className="animate-pulse">
              <div className="h-9 w-48 bg-gray-700 rounded mb-2" />
              <div className="h-4 w-64 bg-gray-700 rounded" />
            </div>
          ) : (
            <div className="flex items-baseline gap-4">
              <p className="text-white text-3xl font-bold">
                ${totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-gray-400 text-sm">{diffLabel}</p>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <select className="bg-[#161616] border border-gray-700 rounded-lg px-4 pr-8 py-2 text-white text-sm appearance-none cursor-pointer hover:border-gray-600 transition-colors">
              <option>Royalties</option>
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
              size={16}
            />
          </div>
          <div className="relative">
            <Calendar
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={16}
            />
            <select className="bg-[#161616] border border-gray-700 rounded-lg pl-10 pr-8 py-2 text-white text-sm appearance-none cursor-pointer hover:border-gray-600 transition-colors">
              <option>Last 12 months</option>
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
              size={16}
            />
          </div>
        </div>
      </div>

      {/* Chart area */}
      {isLoading ? (
        <ChartSkeleton />
      ) : isError ? (
        <div className="h-64 flex items-center justify-center text-red-400 text-sm">
          Failed to load earnings data. Please try again later.
        </div>
      ) : chartData.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#D2045B" stopOpacity={0.35} />
                  <stop offset="97.33%" stopColor="#D2045B" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#885FA8" stopOpacity={0.35} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="transparent" vertical={false} />
              <XAxis
                dataKey="month"
                stroke="#9CA3AF"
                style={{ fontSize: '12px' }}
                tick={{ fill: '#9CA3AF' }}
                axisLine={{ stroke: '#374151' }}
              />
              <YAxis
                stroke="#9CA3AF"
                style={{ fontSize: '12px' }}
                tick={{ fill: '#9CA3AF' }}
                tickFormatter={(v) => `$${v}`}
                axisLine={{ stroke: '#374151' }}
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
                stroke="#885FA8"
                strokeWidth={1.4}
                dot={(props: any) => (
                  <CustomDot {...props} highlightMonth={highlightMonth} />
                )}
                activeDot={false}
              />
              {highlightMonth && (
                <ReferenceLine
                  x={highlightMonth}
                  stroke="white"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  opacity={0.5}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
