import { BadgeCheck } from "lucide-react";

export default function VerifiedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Verified artist"
      title="Verified artist"
      className={`inline-flex items-center gap-1 rounded-full bg-[#1D4ED8]/20 border border-[#3B82F6]/40 px-2 py-0.5 text-[11px] font-semibold text-[#60A5FA] ${className}`}
    >
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
      Verified
    </span>
  );
}

export { VerifiedBadge };
