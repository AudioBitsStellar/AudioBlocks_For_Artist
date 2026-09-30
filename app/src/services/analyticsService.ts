import { ANALYTICS_ENDPOINTS } from "@/api/api-endpoint";
import { useGet } from "@/api/queryClient";
import { DASHBOARD_CACHE, DASHBOARD_QUERY_KEYS } from "@/api/cachePolicy";
import type { AgeDemographic, AnalyticsData, AnalyticsInsights, AnalyticsResponse, AnalyticsSummary, AnalyticsSummaryResponse, DemographicsData, DeviceDemographic, GenderDemographic, GeographicData, PlayTrendData } from "@/types/api";

// Response types live in the central `@/types/api` module (#140); re-exported
// here so existing imports from this service keep working.
export type { AgeDemographic, AnalyticsData, AnalyticsInsights, AnalyticsResponse, AnalyticsSummary, AnalyticsSummaryResponse, DemographicsData, DeviceDemographic, GenderDemographic, GeographicData, PlayTrendData } from "@/types/api";

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

const mockDemographicsData: DemographicsData = {
  age: [
    { range: "18-24", percentage: 38 },
    { range: "25-34", percentage: 42 },
    { range: "35-44", percentage: 12 },
    { range: "45-54", percentage: 5 },
    { range: "55+", percentage: 3 },
  ],
  gender: [
    { category: "Female", percentage: 48 },
    { category: "Male", percentage: 46 },
    { category: "Non-binary / Other", percentage: 6 },
  ],
  device: [
    { device: "Mobile App", percentage: 65 },
    { device: "Desktop / Web", percentage: 25 },
    { device: "Smart Speakers", percentage: 10 },
  ],
};

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
    demographics: mockDemographicsData,
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

export const ANALYTICS_QUERY_KEY = DASHBOARD_QUERY_KEYS.analytics;
export const ANALYTICS_SUMMARY_QUERY_KEY = DASHBOARD_QUERY_KEYS.analyticsSummary;

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
        staleTime: DASHBOARD_CACHE.analytics,
      }
    );
  };

  const useGetAnalyticsSummary = (enabled: boolean = true) => {
    return useGet<AnalyticsSummaryResponse>(
      ANALYTICS_SUMMARY_QUERY_KEY,
      ANALYTICS_ENDPOINTS.SUMMARY,
      {
        enabled,
        staleTime: DASHBOARD_CACHE.analytics,
      }
    );
  };

  return { useGetAnalyticsData, useGetAnalyticsSummary };
};

export default useAnalyticsServices;
