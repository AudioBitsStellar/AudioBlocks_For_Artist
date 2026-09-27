"use client";

import { PlayTrendData } from "@/services/analyticsService";
import { colorTokens } from "@/theme/colors";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useState } from "react";

interface AnalyticsPlayTrendsProps {
  data: PlayTrendData[];
  period: "last30days" | "last90days";
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: unknown[] }) => {
  if (!active || !payload || !payload[0]) return null;

  const data = payload[0] as { payload: PlayTrendData };
  return (
    <div className="bg-surface border border-border rounded p-3">
      <p className="text-text-muted text-sm">{data.payload.date}</p>
      <p className="text-primary font-semibold">{data.payload.plays.toLocaleString()} plays</p>
    </div>
  );
};

export default function AnalyticsPlayTrends({ data, period }: AnalyticsPlayTrendsProps) {
  const [hoveredPeriod, setHoveredPeriod] = useState<"last30days" | "last90days">(period);

  const chartData = hoveredPeriod === "last30days" ? data.slice(-30) : data;

  const handlePeriodChange = (newPeriod: "last30days" | "last90days") => {
    setHoveredPeriod(newPeriod);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    newPeriod: "last30days" | "last90days"
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handlePeriodChange(newPeriod);
    }
  };

  const periodButtonBase =
    "px-4 py-2 rounded text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface";
  const periodButtonClass = (active: boolean) =>
    `${periodButtonBase} ${
      active ? "bg-primary text-primary-contrast" : "bg-surface-sunken text-text-muted hover:bg-surface-raised"
    }`;

  return (
    <div className="bg-surface border border-border rounded-lg p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-text text-lg font-semibold">Play Trends</h2>
        <div className="flex gap-2" role="group" aria-label="Time period selection">
          <button
            onClick={() => handlePeriodChange("last30days")}
            onKeyDown={(e) => handleKeyDown(e, "last30days")}
            className={periodButtonClass(hoveredPeriod === "last30days")}
            aria-pressed={hoveredPeriod === "last30days"}
            aria-label="View last 30 days"
          >
            30 Days
          </button>
          <button
            onClick={() => handlePeriodChange("last90days")}
            onKeyDown={(e) => handleKeyDown(e, "last90days")}
            className={periodButtonClass(hoveredPeriod === "last90days")}
            aria-pressed={hoveredPeriod === "last90days"}
            aria-label="View last 90 days"
          >
            90 Days
          </button>
        </div>
      </div>

      <div role="region" aria-label={`Play trends for ${hoveredPeriod === "last30days" ? "last 30 days" : "last 90 days"}`}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            aria-label="Line chart showing play trends over time"
          >
            <CartesianGrid strokeDasharray="3 3" stroke={colorTokens.border.subtle} />
            <XAxis
              dataKey="date"
              stroke={colorTokens.text.subtle}
              style={{ fontSize: "12px" }}
              tick={{
                fill: colorTokens.text.muted,
              }}
              aria-label="Date"
            />
            <YAxis
              stroke={colorTokens.text.subtle}
              style={{ fontSize: "12px" }}
              tick={{
                fill: colorTokens.text.muted,
              }}
              aria-label="Number of plays"
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="plays"
              stroke={colorTokens.primary.default}
              strokeWidth={2}
              dot={false}
              isAnimationActive={true}
              aria-hidden="true"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export { AnalyticsPlayTrends };
