import dynamic from "next/dynamic";

const OverviewCards = dynamic(() => import("@/components/OverviewCards"));
const EarningsRoyalties = dynamic(() => import("@/components/EarningsRoyalties"));
const MyAlbums = dynamic(() => import("@/components/MyAlbums"));
const FansEngagement = dynamic(() => import("@/components/FansEngagement"));
const Transactions = dynamic(() => import("@/components/Transactions"));
const Comments = dynamic(() => import("@/components/Comments"));
import ErrorBoundary from "@/components/ErrorBoundary";

export default function OverviewPage() {
  return (
    <>
      <ErrorBoundary fallbackTitle="Failed to load overview cards">
        <OverviewCards />
      </ErrorBoundary>
      <ErrorBoundary fallbackTitle="Failed to load earnings data">
        <EarningsRoyalties />
      </ErrorBoundary>
      <MyAlbums />
      <FansEngagement />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="w-full col-span-1 md:col-span-2">
          <Transactions />
        </div>
        <div className="w-full col-span-1 md:col-span-1">
          <Comments />
        </div>
      </div>
    </>
  );
}
