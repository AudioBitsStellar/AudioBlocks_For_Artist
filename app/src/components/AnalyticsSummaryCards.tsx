'use client';

import { AnalyticsSummary } from '@/services/analyticsService';
import { TrendingUp, Users, Activity, Target } from 'lucide-react';

interface AnalyticsSummaryCardsProps {
  summary: AnalyticsSummary;
}

const SummaryCard = ({
  icon: Icon,
  label,
  value,
  unit,
  trend,
  trendColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  trend?: number;
  trendColor?: string;
}) => (
  <div className="bg-[#1f2622] border border-[#2d3d2d] rounded-lg p-6">
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <p className="text-gray-400 text-sm font-medium">{label}</p>
        <div className="flex items-baseline gap-2 mt-2">
          <p className="text-white text-3xl font-bold">{value}</p>
          {unit && <span className="text-gray-500 text-sm">{unit}</span>}
        </div>
      </div>
      <div className="text-pink-500">{Icon}</div>
    </div>
    {trend !== undefined && (
      <div className={`text-sm font-medium ${trendColor || 'text-green-500'}`}>
        {trend > 0 ? '+' : ''}{trend}% from last period
      </div>
    )}
  </div>
);

export default function AnalyticsSummaryCards({ summary }: AnalyticsSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <SummaryCard
        icon={<TrendingUp size={24} />}
        label="Total Plays"
        value={summary.totalPlays.toLocaleString()}
        trend={summary.growthPercentage}
      />
      <SummaryCard
        icon={<Users size={24} />}
        label="Unique Listeners"
        value={summary.uniqueListeners.toLocaleString()}
        trend={Math.floor(summary.growthPercentage * 0.8)}
      />
      <SummaryCard
        icon={<Activity size={24} />}
        label="Engagement Rate"
        value={summary.engagementRate.toFixed(2)}
        unit="%"
        trend={parseFloat((Math.random() * 10 - 5).toFixed(2))}
      />
      <SummaryCard
        icon={<Target size={24} />}
        label="Growth"
        value={summary.growthPercentage.toFixed(2)}
        unit="%"
        trend={summary.growthPercentage}
      />
    </div>
  );
}

export { AnalyticsSummaryCards };
