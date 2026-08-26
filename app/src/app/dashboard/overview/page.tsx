"use client";

import dynamic from "next/dynamic";
import { useDashboardCustomization } from "@/context/DashboardCustomizationContext";
import DashboardCustomizationPanel from "@/components/DashboardCustomizationPanel";

const OverviewCards = dynamic(() => import("@/components/OverviewCards"));
const EarningsRoyalties = dynamic(() => import("@/components/EarningsRoyalties"));
const PlatformRevenueBreakdown = dynamic(() => import("@/components/PlatformRevenueBreakdown"));
const MyAlbums = dynamic(() => import("@/components/MyAlbums"));
const FansEngagement = dynamic(() => import("@/components/FansEngagement"));
const Transactions = dynamic(() => import("@/components/Transactions"));
const Comments = dynamic(() => import("@/components/Comments"));
import ErrorBoundary from "@/components/ErrorBoundary";

const WIDGET_COMPONENTS: Record<string, React.ComponentType> = {
  "overview-cards": OverviewCards,
  "earnings": EarningsRoyalties,
  "platform-revenue": PlatformRevenueBreakdown,
  "albums": MyAlbums,
  "fans-engagement": FansEngagement,
  "transactions": Transactions,
  "comments": Comments,
};

export default function OverviewPage() {
  const { widgets } = useDashboardCustomization();
  const sortedWidgets = [...widgets].sort((a, b) => a.order - b.order);
  const visibleWidgets = sortedWidgets.filter((w) => w.visible);

  return (
    <>
      <div className="flex items-center justify-between">
        <div />
        <DashboardCustomizationPanel />
      </div>

      {visibleWidgets.map((widget) => {
        const Component = WIDGET_COMPONENTS[widget.id];
        if (!Component) return null;

        if (widget.id === "transactions" || widget.id === "comments") {
          // Keep the grid layout for transactions + comments
          if (widget.id === "transactions") {
            const commentsWidget = visibleWidgets.find((w) => w.id === "comments");
            return (
              <div key="tx-comments" className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="w-full col-span-1 md:col-span-2">
                  <ErrorBoundary fallbackTitle="Failed to load transactions">
                    <Transactions />
                  </ErrorBoundary>
                </div>
                {commentsWidget && (
                  <div className="w-full col-span-1 md:col-span-1">
                    <ErrorBoundary fallbackTitle="Failed to load comments">
                      <Comments />
                    </ErrorBoundary>
                  </div>
                )}
              </div>
            );
          }
          // Skip comments here — it's rendered inside the transactions grid
          return null;
        }

        return (
          <ErrorBoundary key={widget.id} fallbackTitle={`Failed to load ${widget.label}`}>
            <Component />
          </ErrorBoundary>
        );
      })}
    </>
  );
}
