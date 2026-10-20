import dynamic from "next/dynamic";
import ErrorBoundary from "@/components/ErrorBoundary";

const SetupArtistOnChainProfile = dynamic(
  () => import("@/components/common/wallet/SetupArtistOnChainProfile")
);

/**
 * On-chain profile setup tab wrapped in error boundary.
 * Handles wallet connection and on-chain profile creation.
 */
export default function OnChainProfileTab() {
  return (
    <div id="onchain-panel" role="tabpanel" className="mt-6">
      <ErrorBoundary
        fallbackTitle="On-Chain Profile Error"
        fallbackDescription="A wallet extension error or unexpected contract response prevented the on-chain tab from loading. Check your Freighter wallet connection and retry. Your profile editor tab remains accessible."
        retryLabel="Retry / Reconnect"
      >
        <SetupArtistOnChainProfile />
      </ErrorBoundary>
    </div>
  );
}
