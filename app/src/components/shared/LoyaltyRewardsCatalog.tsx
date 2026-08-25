'use client';

import { FanLoyaltyProgram, LoyaltyProgramConfig } from '@/types';
import { useLoyaltyProgram } from '@/hooks/useLoyaltyProgram';
import { useI18n } from '@/context/I18nContext';
import { Gift, Star } from 'lucide-react';

interface LoyaltyRewardsCatalogProps {
  loyaltyProgram: FanLoyaltyProgram | null;
  config?: LoyaltyProgramConfig;
  onRedeem?: (rewardId: string) => void;
}

/**
 * Component displaying available rewards for redemption
 */
export default function LoyaltyRewardsCatalog({
  loyaltyProgram,
  config,
  onRedeem,
}: LoyaltyRewardsCatalogProps) {
  const { t } = useI18n();
  const { isRewardRedeemable, sortedAvailableRewards, formatPoints } = useLoyaltyProgram(
    loyaltyProgram,
    config
  );

  if (!loyaltyProgram) {
    return null;
  }

  if (sortedAvailableRewards.length === 0) {
    return (
      <div className="rounded-2xl border border-[#2A2A2A] bg-[#161616] p-12 text-center">
        <Gift className="h-12 w-12 text-[#A3A3A3] mx-auto mb-4 opacity-50" />
        <p className="text-[#A3A3A3]">{t.rewards.noRewards}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#2A2A2A] bg-[#161616] p-6">
      <h3 className="text-lg font-semibold text-white mb-6">{t.rewards.redeemRewards}</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedAvailableRewards.map((reward) => {
          const isRedeemable = isRewardRedeemable(reward);
          const pointsShortfall = loyaltyProgram
            ? Math.max(0, reward.pointsCost - loyaltyProgram.points.current)
            : reward.pointsCost;

          return (
            <div
              key={reward.id}
              className={`rounded-xl border p-5 transition-all ${
                isRedeemable
                  ? 'border-[#D2045B] bg-[#111111] hover:bg-[#161616]'
                  : 'border-[#2A2A2A] bg-[#0F0F0F] opacity-60'
              }`}
            >
              {/* Icon and Title */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-white mb-1">{reward.name}</h4>
                  <p className="text-xs text-[#A3A3A3]">{reward.description}</p>
                </div>
                {reward.icon ? (
                  <span className="text-2xl ml-2">{reward.icon}</span>
                ) : (
                  <Star className="h-5 w-5 text-[#D2045B] ml-2" />
                )}
              </div>

              {/* Benefit Value */}
              {reward.benefitValue && (
                <div className="mb-3 text-sm font-semibold text-[#D2045B]">
                  {reward.benefitValue}
                </div>
              )}

              {/* Category Badge */}
              <div className="mb-4">
                <span className="text-xs font-medium px-2 py-1 rounded bg-[#2A2A2A] text-[#A3A3A3] capitalize">
                  {reward.category}
                </span>
              </div>

              {/* Points Cost and Button */}
              <div className="flex items-center justify-between pt-3 border-t border-[#2A2A2A]">
                <div className="text-sm">
                  <p className="text-xs text-[#A3A3A3] mb-1">Cost</p>
                  <p className="font-semibold text-white">{formatPoints(reward.pointsCost)}</p>
                </div>

                {isRedeemable ? (
                  <button
                    onClick={() => onRedeem?.(reward.id)}
                    className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#D2045B] hover:bg-[#B8043F] text-white transition-colors"
                  >
                    {t.rewards.redeem}
                  </button>
                ) : (
                  <div className="text-right">
                    <p className="text-xs text-[#A3A3A3] mb-1">Need</p>
                    <p className="font-semibold text-[#D2045B]">
                      +{formatPoints(pointsShortfall)}
                    </p>
                  </div>
                )}
              </div>

              {/* Expiration Warning */}
              {reward.expiresAt && (
                <p className="text-xs text-yellow-500 mt-3">
                  Expires: {new Date(reward.expiresAt).toLocaleDateString()}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { LoyaltyRewardsCatalog };
