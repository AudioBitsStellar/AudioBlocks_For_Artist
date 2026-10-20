import { VerificationStatus } from "@/services/verificationService";
import VerifiedBadge from "@/components/common/VerifiedBadge";

interface VerificationStatusCardProps {
  status: VerificationStatus;
  onApplyClick: () => void;
  onSimulateApprovalClick: () => void;
}

/**
 * Card showing artist verification status with actions.
 */
export default function VerificationStatusCard({
  status,
  onApplyClick,
  onSimulateApprovalClick,
}: VerificationStatusCardProps) {
  return (
    <div
      data-testid="profile-verification"
      className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#2A2A2A] bg-[#161616] px-4 py-3"
    >
      <div className="flex items-center gap-3">
        {status === "verified" && <VerifiedBadge />}
        <p className="text-xs text-[#A3A3A3]">
          {status === "verified" && (
            <span className="text-white font-medium">Your artist profile is verified.</span>
          )}
          {status === "pending" && (
            <span className="text-white font-medium">Verification application under review.</span>
          )}
          {status === "unverified" && (
            <>
              <span className="text-white font-medium">Not verified.</span> Apply to get a
              verified badge on your profile.
            </>
          )}
        </p>
      </div>
      {status === "unverified" && (
        <button
          onClick={onApplyClick}
          className="rounded-lg bg-[#D2045B] hover:bg-[#B8043F] text-white text-sm font-semibold px-4 py-2 transition-colors"
        >
          Apply for Verification
        </button>
      )}
      {status === "pending" && process.env.NODE_ENV !== "production" && (
        <button
          onClick={onSimulateApprovalClick}
          className="rounded-lg border border-[#2A2A2A] text-white text-xs font-semibold px-3 py-1.5 hover:bg-[#1E1E1E] transition-colors"
        >
          Simulate approval (dev)
        </button>
      )}
    </div>
  );
}
