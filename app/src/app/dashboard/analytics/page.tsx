import { ANALYTICS_ENDPOINTS } from "@/api/api-endpoint";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import { fetchServerBackend } from "@/lib/serverBackend";
import type { AnalyticsResponse } from "@/types/api";

export const metadata = {
  title: "Fan Engagement Analytics | AudioBlocks",
  description:
    "View detailed analytics about your fan engagement, plays, and geographic distribution.",
};

export default async function AnalyticsPage() {
  const initialData = await fetchServerBackend<AnalyticsResponse>(
    ANALYTICS_ENDPOINTS.DATA("last30days")
  );
  return <AnalyticsDashboard initialData={initialData} />;
}
