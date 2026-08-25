'use client';

import { FanLoyaltyProgram, LoyaltyProgramConfig } from '@/types';
import { useI18n } from '@/context/I18nContext';
import LoyaltyRewardsTier from './LoyaltyRewardsTier';
import LoyaltyExclusiveContent from './LoyaltyExclusiveContent';
import LoyaltyRewardsCatalog from './LoyaltyRewardsCatalog';
import { Gift, Crown, Trophy } from 'lucide-react';

interface LoyaltyDashboardProps {
  loyaltyProgram: FanLoyaltyProgram | null;
  config?: LoyaltyProgramConfig;
  onUnlockContent?: (contentId: string) => void;
  onAccessContent?: (contentId: string) => void;
  onRedeemReward?: (rewardId: string) => void;
}

/**
 * Comprehensive loyalty program dashboard component
 * Displays tier information, exclusive content, and rewards
 */
export default function LoyaltyDashboard({
  loyaltyProgram,
  config,
  onUnlockContent,
  onAccessContent,
  onRedeemReward,
}: LoyaltyDashboardProps) {
  const { t } = useI18n();

  if (!loyaltyProgram) {
    return (
      <div className="rounded-2xl border border-[#2A2A2A] bg-[#161616] p-12 text-center">
        <Trophy className="h-12 w-12 text-[#A3A3A3] mx-auto mb-4 opacity-50" />
        <p className="text-[#A3A3A3]">Join the loyalty program to start earning rewards</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-[#2A2A2A] bg-gradient-to-r from-[#D2045B]/20 to-[#885FA8]/20 p-6">
        <div className="flex items-center gap-4 mb-4">
          <Crown className="h-8 w-8 text-[#D2045B]" />
          <div>
            <h2 className="text-2xl font-bold text-white">{t.rewards.title}</h2>
            <p className="text-sm text-[#A3A3A3]">
              Earn points and unlock exclusive rewards
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="rounded-lg bg-[#0F0F0F] p-4">
            <p className="text-xs text-[#A3A3A3] mb-1">{t.rewards.yourPoints}</p>
            <p className="text-2xl font-bold text-[#D2045B]">
              {loyaltyProgram.points.current.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg bg-[#0F0F0F] p-4">
            <p className="text-xs text-[#A3A3A3] mb-1">Lifetime Points</p>
            <p className="text-2xl font-bold text-[#885FA8]">
              {loyaltyProgram.points.total.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Tier Progress */}
      <LoyaltyRewardsTier loyaltyProgram={loyaltyProgram} config={config} />

      {/* Exclusive Content */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Gift className="h-6 w-6 text-[#D2045B]" />
          {t.rewards.exclusiveContent}
        </h3>
        <LoyaltyExclusiveContent
          loyaltyProgram={loyaltyProgram}
          config={config}
          onUnlock={onUnlockContent}
          onAccess={onAccessContent}
        />
      </div>

      {/* Rewards Catalog */}
      <LoyaltyRewardsCatalog
        loyaltyProgram={loyaltyProgram}
        config={config}
        onRedeem={onRedeemReward}
      />
    </div>
  );
}

export { LoyaltyDashboard };
