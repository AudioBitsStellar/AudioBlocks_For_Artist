import { ANALYTICS_ENDPOINTS } from "@/api/api-endpoint";
import { useGet } from "@/api/queryClient";

export interface AnalyticsSummary {
  totalPlays: number;
  uniqueListeners: number;
  engagementRate: number;
  growthPercentage: number;
  engagementTrendPercentage?: number;
  listenerGrowthPercentage?: number;
}

export interface PlayTrendData {
  date: string;
  plays: number;
}

export interface GeographicData {
  country: string;
  region: string;
  plays: number;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  playTrends: PlayTrendData[];
  geographicDistribution: GeographicData[];
  period: "last30days" | "last90days";
  insights?: AnalyticsInsights;
}

export interface AnalyticsInsights {
  peakListeningHours: string;
  topPerformingTrackPlays: number;
  topPerformingTrackGrowthPercentage: number;
  listenerRetentionPercentage: number;
}

export interface AnalyticsResponse {
  success: boolean;
  data: AnalyticsData;
}

export interface AnalyticsSummaryResponse {
  success: boolean;
  data: AnalyticsSummary;
}

const generateStablePlayTrends = (days: number): PlayTrendData[] => {
  const firstDate = Date.UTC(2026, 4, 3);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(firstDate + index * 24 * 60 * 60 * 1000);
    return {
      date: date.toISOString().split("T")[0],
      plays: 180 + index * 7 + (index % 5) * 11,
    };
  });
};

const STABLE_PLAY_TRENDS_90 = generateStablePlayTrends(90);
const STABLE_PLAY_TRENDS_30 = STABLE_PLAY_TRENDS_90.slice(-30);

const mockGeographicData: GeographicData[] = [
  { country: "United States", region: "North America", plays: 2500 },
  { country: "United Kingdom", region: "Europe", plays: 1800 },
  { country: "Canada", region: "North America", plays: 1200 },
  { country: "Germany", region: "Europe", plays: 1000 },
  { country: "Australia", region: "Oceania", plays: 980 },
  { country: "France", region: "Europe", plays: 850 },
  { country: "Japan", region: "Asia", plays: 720 },
  { country: "Brazil", region: "South America", plays: 650 },
  { country: "Mexico", region: "North America", plays: 580 },
  { country: "Netherlands", region: "Europe", plays: 520 },
];

export function getAnalyticsData(period: "last30days" | "last90days"): AnalyticsData {
  const playTrends = period === "last30days" ? STABLE_PLAY_TRENDS_30 : STABLE_PLAY_TRENDS_90;
  const totalPlays = playTrends.reduce((sum, trend) => sum + trend.plays, 0);

  return {
    summary: {
      totalPlays,
      uniqueListeners: Math.floor(totalPlays * 0.62),
      engagementRate: 8.7,
      growthPercentage: 18.4,
      engagementTrendPercentage: 3.2,
      listenerGrowthPercentage: 14.7,
    },
    playTrends,
    geographicDistribution: mockGeographicData,
    period,
    insights: {
      peakListeningHours: "7 PM and 11 PM local time, with a secondary peak around 12 PM",
      topPerformingTrackPlays: Math.round(totalPlays * 0.15),
      topPerformingTrackGrowthPercentage: 21.3,
      listenerRetentionPercentage: 72.8,
    },
  };
}

export function getAnalyticsSummary(): AnalyticsSummary {
  return getAnalyticsData("last30days").summary;
}

export const ANALYTICS_QUERY_KEY = ["get-artist-analytics"];
export const ANALYTICS_SUMMARY_QUERY_KEY = ["get-artist-analytics-summary"];

const useAnalyticsServices = () => {
  const useGetAnalyticsData = (
    period: "last30days" | "last90days" = "last30days",
    enabled: boolean = true
  ) => {
    return useGet<AnalyticsResponse>(
      [...ANALYTICS_QUERY_KEY, period],
      ANALYTICS_ENDPOINTS.DATA(period),
      {
        enabled,
        staleTime: 1000 * 60,
      }
    );
  };

  const useGetAnalyticsSummary = (enabled: boolean = true) => {
    return useGet<AnalyticsSummaryResponse>(
      ANALYTICS_SUMMARY_QUERY_KEY,
      ANALYTICS_ENDPOINTS.SUMMARY,
      {
        enabled,
        staleTime: 1000 * 60,
      }
    );
  };

  return { useGetAnalyticsData, useGetAnalyticsSummary };
};

export default useAnalyticsServices;
