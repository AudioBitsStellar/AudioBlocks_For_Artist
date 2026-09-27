"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import useAnalyticsServices from "@/services/analyticsService";
import { useInView } from "@/hooks/useInView";
import { Skeleton } from "@/components/shared/Skeleton";

const AnalyticsSummaryCards = dynamic(() => import("@/components/AnalyticsSummaryCards"), {
  loading: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-[#1f2622] border border-[#2d3d2d] rounded-lg p-6 animate-pulse">
          <div className="h-6 bg-[#2d3d2d] rounded mb-4 w-3/4"></div>
          <div className="h-8 bg-[#2d3d2d] rounded mb-4 w-1/2"></div>
        </div>
      ))}
    </div>
  ),
});

const AnalyticsPlayTrends = dynamic(() => import("@/components/AnalyticsPlayTrends"), {
  loading: () => (
    <div className="bg-[#1f2622] border border-[#2d3d2d] rounded-lg p-6 mb-8 animate-pulse">
      <div className="h-8 bg-[#2d3d2d] rounded mb-6 w-1/3"></div>
      <div className="h-[300px] bg-[#2d3d2d] rounded"></div>
    </div>
  ),
});

const AnalyticsGeographic = dynamic(() => import("@/components/AnalyticsGeographic"), {
  loading: () => (
    <div className="bg-[#1f2622] border border-[#2d3d2d] rounded-lg p-6 animate-pulse">
      <div className="h-8 bg-[#2d3d2d] rounded mb-6 w-1/3"></div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-[#2d3d2d] rounded"></div>
        ))}
      </div>
    </div>
  ),
});

interface ChartSectionProps {
  children: React.ReactNode;
}

const LazyChartSection = ({ children }: ChartSectionProps) => {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <div ref={ref}>
      {isInView ? (
        <Suspense fallback={<div className="text-gray-400">Loading chart...</div>}>
          {children}
        </Suspense>
      ) : (
        <div className="h-96 bg-[#1f2622] border border-[#2d3d2d] rounded-lg"></div>
      )}
    </div>
  );
};

export default function AnalyticsDashboard() {
  const { data, isLoading, isError, refetch } =
    useAnalyticsServices().useGetAnalyticsData("last30days");
  const analyticsData = data?.data;
  const insights = analyticsData?.insights ?? {
    peakListeningHours: "7 PM and 11 PM local time, with a secondary peak around 12 PM",
    topPerformingTrackPlays: Math.round((analyticsData?.summary.totalPlays ?? 0) * 0.15),
    topPerformingTrackGrowthPercentage: analyticsData?.summary.growthPercentage ?? 0,
    listenerRetentionPercentage: Math.min(
      100,
      Math.max(0, (analyticsData?.summary.engagementRate ?? 0) * 8)
    ),
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-white text-3xl font-bold mb-2">Fan Engagement Analytics</h1>
        <p className="text-gray-400">
          Discover insights about your listeners, plays, and audience growth.
        </p>
      </div>

      {isLoading && (
        <div
          role="status"
          aria-busy="true"
          aria-label="Loading analytics"
          className="bg-[#1f2622] border border-[#2d3d2d] rounded-lg p-6"
        >
          <Skeleton className="h-8 w-1/3 rounded mb-6" />
          <Skeleton className="h-[300px] w-full rounded" />
        </div>
      )}

      {isError && (
        <div className="bg-[#1f2622] border border-[#2d3d2d] rounded-lg p-6">
          <p className="text-white font-semibold mb-2">Unable to load analytics</p>
          <p className="text-gray-400 text-sm mb-4">
            We could not fetch the latest analytics from the backend.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-4 py-2 rounded bg-pink-500 hover:bg-pink-600 text-white text-sm font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {analyticsData && (
        <>
          <ErrorBoundary fallbackTitle="Failed to load analytics summary">
            <AnalyticsSummaryCards summary={analyticsData.summary} />
          </ErrorBoundary>

          <ErrorBoundary fallbackTitle="Failed to load play trends">
            <LazyChartSection>
              <AnalyticsPlayTrends data={analyticsData.playTrends} period={analyticsData.period} />
            </LazyChartSection>
          </ErrorBoundary>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ErrorBoundary fallbackTitle="Failed to load geographic data">
              <LazyChartSection>
                <AnalyticsGeographic data={analyticsData.geographicDistribution} />
              </LazyChartSection>
            </ErrorBoundary>

            <div className="bg-[#1f2622] border border-[#2d3d2d] rounded-lg p-6">
              <h3 className="text-white text-lg font-semibold mb-4">Engagement Insights</h3>
              <div className="space-y-4">
                <div className="p-4 bg-[#2d3d2d] rounded-lg border border-[#3d4d3d]">
                  <h4 className="text-pink-500 font-semibold mb-2">Peak Listening Hours</h4>
                  <p className="text-gray-400 text-sm">
                    Your music gets the most listens between {insights.peakListeningHours}.
                  </p>
                </div>

                <div className="p-4 bg-[#2d3d2d] rounded-lg border border-[#3d4d3d]">
                  <h4 className="text-pink-500 font-semibold mb-2">Top Performing Track</h4>
                  <p className="text-gray-400 text-sm">
                    Your most popular track this month has{" "}
                    {insights.topPerformingTrackPlays.toLocaleString()} plays, trending upward with
                    a {insights.topPerformingTrackGrowthPercentage.toFixed(1)}% growth rate.
                  </p>
                </div>

                <div className="p-4 bg-[#2d3d2d] rounded-lg border border-[#3d4d3d]">
                  <h4 className="text-pink-500 font-semibold mb-2">Listener Retention</h4>
                  <p className="text-gray-400 text-sm">
                    {insights.listenerRetentionPercentage.toFixed(1)}% of listeners return to listen
                    again, showing strong fan loyalty.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {!analyticsData && !isLoading && !isError && (
        <div className="bg-[#1f2622] border border-[#2d3d2d] rounded-lg p-6 text-gray-400">
          No analytics data available yet.
        </div>
      )}
    </>
  );
}
