"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  TooltipProps,
} from "recharts";
import useEarningsServices from "@/services/earningsService";
import { PlatformRevenue } from "@/types";
import { colorTokens } from "@/theme/colors";

const PLATFORM_COLORS = [
  colorTokens.primary.default,
  colorTokens.secondary.default,
  "var(--color-info)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-error)",
];

const AXIS_COLOR = "var(--color-text-muted)";
const AXIS_LINE_COLOR = "var(--color-border)";

const ChartSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-6 w-48 bg-surface-raised rounded mb-4" />
    <div className="h-9 w-40 bg-surface-raised rounded mb-2" />
    <div className="h-4 w-56 bg-surface-raised rounded mb-6" />
    <div className="h-64 bg-surface-raised rounded" />
  </div>
);

const EmptyState = () => (
  <div className="h-64 flex flex-col items-center justify-center text-text-muted gap-2">
    <p className="text-lg font-semibold">No platform revenue data yet</p>
    <p className="text-sm">Your per-platform earnings will appear here once available.</p>
  </div>
);

const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as PlatformRevenue;
    return (
      <div
        className="rounded-lg px-4 py-3 shadow-lg border border-border"
        style={{ backgroundColor: "var(--color-surface-raised)" }}
      >
        <p className="text-text font-semibold mb-1">{data.platform}</p>
        <p className="text-text text-sm">
          Revenue: ${data.revenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </p>
        <p className="text-text-muted text-sm">
          {data.percentage.toFixed(1)}% of total
        </p>
        <p className="text-text-muted text-sm">
          {data.streams.toLocaleString()} streams
        </p>
      </div>
    );
  }
  return null;
};

export default function PlatformRevenueBreakdown() {
  const { useGetPlatformRevenue } = useEarningsServices();
  const { data: response, isLoading, isError } = useGetPlatformRevenue(true);

  const summary = response?.data;
  const platforms: PlatformRevenue[] = summary?.platforms ?? [];
  const totalRevenue = summary?.totalRevenue ?? 0;

  return (
    <div className="bg-surface-raised rounded-lg p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-text text-xl font-bold mb-1">Revenue by Platform</h2>
          {isLoading ? (
            <div className="animate-pulse">
              <div className="h-9 w-40 bg-surface-raised rounded mb-2" />
              <div className="h-4 w-56 bg-surface-raised rounded" />
            </div>
          ) : (
            <div className="flex items-baseline gap-4">
              <p className="text-text text-3xl font-bold">
                ${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-text-muted text-sm">
                across {platforms.length} platform{platforms.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      </div>

      {isError ? (
        <div className="h-64 flex items-center justify-center text-red-400" role="alert">
          Failed to load platform revenue data. Please try again later.
        </div>
      ) : isLoading ? (
        <ChartSkeleton />
      ) : platforms.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="h-64 mb-6" aria-label="Platform revenue bar chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={platforms}
                layout="vertical"
                margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke={AXIS_LINE_COLOR} strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  stroke={AXIS_COLOR}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `$${Number(value).toLocaleString()}`}
                />
                <YAxis
                  type="category"
                  dataKey="platform"
                  stroke={AXIS_COLOR}
                  axisLine={false}
                  tickLine={false}
                  width={100}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-surface-sunken)" }} />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]} maxBarSize={32}>
                  {platforms.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PLATFORM_COLORS[index % PLATFORM_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-text-muted font-medium py-2">Platform</th>
                  <th className="text-right text-text-muted font-medium py-2">Revenue</th>
                  <th className="text-right text-text-muted font-medium py-2">Share</th>
                  <th className="text-right text-text-muted font-medium py-2">Streams</th>
                </tr>
              </thead>
              <tbody>
                {platforms.map((p, index) => (
                  <tr key={p.platform} className="border-b border-border/50">
                    <td className="py-3 text-text font-medium">
                      <span
                        className="inline-block w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: PLATFORM_COLORS[index % PLATFORM_COLORS.length] }}
                      />
                      {p.platform}
                    </td>
                    <td className="py-3 text-text text-right">
                      ${p.revenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 text-text-muted text-right">{p.percentage.toFixed(1)}%</td>
                    <td className="py-3 text-text-muted text-right">
                      {p.streams.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
