"use client";

import { FanLoyaltyProgram, LoyaltyProgramConfig } from "@/types";
import { useLoyaltyProgram } from "@/hooks/useLoyaltyProgram";
import { useI18n } from "@/context/I18nContext";

interface LoyaltyRewardsTierProps {
  loyaltyProgram: FanLoyaltyProgram | null;
  config?: LoyaltyProgramConfig;
}

/**
 * Component displaying tier information and progress to next tier
 */
export default function LoyaltyRewardsTier({ loyaltyProgram, config }: LoyaltyRewardsTierProps) {
  const { t } = useI18n();
  const { currentTierInfo, nextTierInfo, progressToNextTier, formatPoints } = useLoyaltyProgram(
    loyaltyProgram,
    config
  );

  if (!loyaltyProgram) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#2A2A2A] bg-[#161616] p-6">
      {/* Current Tier */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3] mb-2">
          {t.rewards.currentTier}
        </p>
        <div
          className="flex items-center gap-3 rounded-xl p-4"
          style={{
            backgroundColor: `${currentTierInfo.color}20`,
            borderLeft: `4px solid ${currentTierInfo.color}`,
          }}
        >
          <div
            className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
            style={{ backgroundColor: currentTierInfo.color }}
          >
            {currentTierInfo.tier[0].toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white capitalize">{currentTierInfo.tier}</h3>
            <p className="text-sm text-[#A3A3A3]">
              {formatPoints(loyaltyProgram.points.current)} /{" "}
              {formatPoints(currentTierInfo.maxPoints)} {t.rewards.yourPoints.toLowerCase()}
            </p>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3] mb-3">
          Benefits
        </p>
        <ul className="space-y-2">
          {currentTierInfo.benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2 text-sm text-white">
              <span className="text-[#D2045B] font-bold mt-0.5">✓</span>
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Progress to Next Tier */}
      {nextTierInfo && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">
              Next: {nextTierInfo.tier}
            </p>
            <p className="text-xs text-[#A3A3A3]">
              {formatPoints(nextTierInfo.pointsNeeded)} {t.rewards.yourPoints.toLowerCase()}
            </p>
          </div>
          <div className="w-full h-2 rounded-full bg-[#2A2A2A] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#D2045B] to-[#885FA8] transition-all duration-500"
              style={{ width: `${progressToNextTier}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export { LoyaltyRewardsTier };
