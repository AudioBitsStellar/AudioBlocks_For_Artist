import Breadcrumb from "@/components/Breadcrumb";
import dynamic from "next/dynamic";

const OnChainStatsPanel = dynamic(() => import("@/components/OnChainStatsPanel"));

export const metadata = {
  title: "On-Chain Activity | AudioBlocks",
  description: "See the transactions, operations and assets recorded on your Stellar account.",
};

export default function OnChainStatsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard/overview" },
          { label: "On-Chain", isActive: true },
        ]}
      />
      <div>
        <h1 className="text-2xl font-bold text-text">On-chain activity</h1>
        <p className="mt-1 text-sm text-text-muted">
          Read straight from the Stellar ledger, so nothing here depends on our own database
          catching up.
        </p>
      </div>
      <OnChainStatsPanel />
    </div>
  );
}
