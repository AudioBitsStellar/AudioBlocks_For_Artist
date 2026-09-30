"use client";

import React from "react";
import { Play, Users, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/shared/Skeleton";

export interface StatCardData {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  accentColor: string;
}

interface DashboardStatCardsProps {
  plays?: number;
  followers?: number;
  earningsXlm?: number;
  earningsUsd?: number;
  isLoading?: boolean;
  isError?: boolean;
}

export const DashboardStatCards: React.FC<DashboardStatCardsProps> = ({
  plays = 0,
  followers = 0,
  earningsUsd = 0,
  isLoading = false,
  isError = false,
}) => {
  if (isLoading) {
    return (
      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-5"
        role="status"
        aria-label="Loading stat cards"
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-[#121214] border border-gray-800 rounded-xl p-5 space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="h-8 w-32 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-950/40 border border-red-800/50 rounded-xl p-4 text-red-300 text-sm">
        Failed to load artist metrics. Please refresh or check connection.
      </div>
    );
  }

  const cards: StatCardData[] = [
    {
      title: "Total Plays",
      value: plays.toLocaleString("en-US"),
      change: 14.8,
      icon: <Play className="h-5 w-5 text-purple-400" />,
      accentColor: "from-purple-500/20 to-purple-600/5",
    },
    {
      title: "Followers",
      value: followers.toLocaleString("en-US"),
      change: 8.2,
      icon: <Users className="h-5 w-5 text-blue-400" />,
      accentColor: "from-blue-500/20 to-blue-600/5",
    },
    {
      title: "Total Earnings",
      value: `$${earningsUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: 22.5,
      icon: <DollarSign className="h-5 w-5 text-emerald-400" />,
      accentColor: "from-emerald-500/20 to-emerald-600/5",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`relative overflow-hidden bg-gradient-to-b ${card.accentColor} bg-[#121214] border border-gray-800/80 hover:border-gray-700 rounded-xl p-5 transition-all duration-200 shadow-md`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-400">{card.title}</span>
            <div className="p-2 bg-white/5 rounded-lg border border-white/10">{card.icon}</div>
          </div>

          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-white tracking-tight">{card.value}</h3>
            <span
              className={`inline-flex items-center text-xs font-semibold ${
                card.change >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {card.change >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {card.change >= 0 ? `+${card.change}%` : `${card.change}%`}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
