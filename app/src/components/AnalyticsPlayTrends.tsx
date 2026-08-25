"use client";

import { PlayTrendData } from "@/services/analyticsService";
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
    <div className="bg-[#1f2622] border border-[#2d3d2d] rounded p-3">
      <p className="text-gray-300 text-sm">{data.payload.date}</p>
      <p className="text-pink-500 font-semibold">{data.payload.plays.toLocaleString()} plays</p>
    </div>
  );
};

export default function AnalyticsPlayTrends({ data, period }: AnalyticsPlayTrendsProps) {
  const [hoveredPeriod, setHoveredPeriod] = useState<"last30days" | "last90days">(period);

  const chartData = hoveredPeriod === "last30days" ? data.slice(-30) : data;

  return (
    <div className="bg-[#1f2622] border border-[#2d3d2d] rounded-lg p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white text-lg font-semibold">Play Trends</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setHoveredPeriod("last30days")}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              hoveredPeriod === "last30days"
                ? "bg-pink-500 text-white"
                : "bg-[#2d3d2d] text-gray-300 hover:bg-[#3d4d3d]"
            }`}
            aria-label="View last 30 days"
          >
            30 Days
          </button>
          <button
            onClick={() => setHoveredPeriod("last90days")}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              hoveredPeriod === "last90days"
                ? "bg-pink-500 text-white"
                : "bg-[#2d3d2d] text-gray-300 hover:bg-[#3d4d3d]"
            }`}
            aria-label="View last 90 days"
          >
            90 Days
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2d3d2d" />
          <XAxis
            dataKey="date"
            stroke="#666"
            style={{ fontSize: "12px" }}
            tick={{
              fill: "#999",
            }}
          />
          <YAxis
            stroke="#666"
            style={{ fontSize: "12px" }}
            tick={{
              fill: "#999",
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="plays"
            stroke="#ec4899"
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
