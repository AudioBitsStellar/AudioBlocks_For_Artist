import Breadcrumb from "@/components/Breadcrumb";
import ErrorBoundary from "@/components/ErrorBoundary";
import dynamic from "next/dynamic";

const MerchesContent = dynamic(() => import("@/components/MerchesContent"));

export default function MerchesPage() {
  return (
    <div>
      <Breadcrumb items={[{ label: "Merches", isActive: true }]} />
      <ErrorBoundary fallbackTitle="Failed to load Merch section">
        <MerchesContent />
      </ErrorBoundary>
    </div>
  );
}
