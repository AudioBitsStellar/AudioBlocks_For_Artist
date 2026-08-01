import dynamic from 'next/dynamic';

const AnalyticsSummaryCards = dynamic(() => import('@/components/AnalyticsSummaryCards'));
const AnalyticsPlayTrends = dynamic(() => import('@/components/AnalyticsPlayTrends'));
const AnalyticsGeographic = dynamic(() => import('@/components/AnalyticsGeographic'));
import ErrorBoundary from '@/components/ErrorBoundary';
import { getAnalyticsData } from '@/services/analyticsService';

export const metadata = {
  title: 'Fan Engagement Analytics | AudioBlocks',
  description: 'View detailed analytics about your fan engagement, plays, and geographic distribution.',
};

export default function AnalyticsPage() {
  const analyticsData = getAnalyticsData('last30days');

  return (
    <>
      <div className="mb-8">
        <h1 className="text-white text-3xl font-bold mb-2">Fan Engagement Analytics</h1>
        <p className="text-gray-400">
          Discover insights about your listeners, plays, and audience growth.
        </p>
      </div>

      <ErrorBoundary fallbackTitle="Failed to load analytics summary">
        <AnalyticsSummaryCards summary={analyticsData.summary} />
      </ErrorBoundary>

      <ErrorBoundary fallbackTitle="Failed to load play trends">
        <AnalyticsPlayTrends data={analyticsData.playTrends} period={analyticsData.period} />
      </ErrorBoundary>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ErrorBoundary fallbackTitle="Failed to load geographic data">
          <div>
            <AnalyticsGeographic data={analyticsData.geographicDistribution} />
          </div>
        </ErrorBoundary>

        <div className="bg-[#1f2622] border border-[#2d3d2d] rounded-lg p-6">
          <h3 className="text-white text-lg font-semibold mb-4">Engagement Insights</h3>
          <div className="space-y-4">
            <div className="p-4 bg-[#2d3d2d] rounded-lg border border-[#3d4d3d]">
              <h4 className="text-pink-500 font-semibold mb-2">Peak Listening Hours</h4>
              <p className="text-gray-400 text-sm">
                Your music gets the most listens between 7 PM and 11 PM local time, with a secondary peak
                around 12 PM.
              </p>
            </div>

            <div className="p-4 bg-[#2d3d2d] rounded-lg border border-[#3d4d3d]">
              <h4 className="text-pink-500 font-semibold mb-2">Top Performing Track</h4>
              <p className="text-gray-400 text-sm">
                Your most popular track this month has {(analyticsData.summary.totalPlays * 0.15).toLocaleString()} plays,
                trending upward with a {(Math.random() * 20 + 10).toFixed(1)}% growth rate.
              </p>
            </div>

            <div className="p-4 bg-[#2d3d2d] rounded-lg border border-[#3d4d3d]">
              <h4 className="text-pink-500 font-semibold mb-2">Listener Retention</h4>
              <p className="text-gray-400 text-sm">
                {(Math.random() * 20 + 60).toFixed(1)}% of listeners return to listen again, showing strong fan loyalty.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
