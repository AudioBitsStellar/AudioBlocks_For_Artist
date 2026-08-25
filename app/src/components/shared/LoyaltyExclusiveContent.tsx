'use client';

import { FanLoyaltyProgram, LoyaltyProgramConfig } from '@/types';
import { useLoyaltyProgram, useExclusiveContent } from '@/hooks/useLoyaltyProgram';
import { useI18n } from '@/context/I18nContext';
import { Lock, Unlock } from 'lucide-react';
import Image from 'next/image';

interface LoyaltyExclusiveContentProps {
  loyaltyProgram: FanLoyaltyProgram | null;
  config?: LoyaltyProgramConfig;
  onUnlock?: (contentId: string) => void;
  onAccess?: (contentId: string) => void;
}

/**
 * Component displaying exclusive content available based on loyalty tier
 */
export default function LoyaltyExclusiveContent({
  loyaltyProgram,
  config,
  onUnlock,
  onAccess,
}: LoyaltyExclusiveContentProps) {
  const { t } = useI18n();
  const { formatPoints } = useLoyaltyProgram(loyaltyProgram, config);
  const { isContentUnlocked, getPointsNeededToUnlock } = useExclusiveContent(loyaltyProgram);

  if (!loyaltyProgram) {
    return null;
  }

  const unlockedContent = loyaltyProgram.exclusiveContent.filter((c) => c.isUnlocked);
  const lockedContent = loyaltyProgram.exclusiveContent.filter((c) => !c.isUnlocked);

  return (
    <div className="space-y-6">
      {/* Unlocked Content */}
      {unlockedContent.length > 0 && (
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#161616] p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            {t.rewards.unlockedContent}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {unlockedContent.map((content) => (
              <div
                key={content.id}
                className="group rounded-xl overflow-hidden border border-[#2A2A2A] bg-[#111111] hover:border-[#D2045B] transition-colors cursor-pointer"
                onClick={() => onAccess?.(content.id)}
              >
                {content.thumbnailUrl && (
                  <div className="relative h-40 w-full overflow-hidden bg-[#2A2A2A]">
                    <Image
                      src={content.thumbnailUrl}
                      alt={content.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                      <Unlock className="h-6 w-6 text-[#D2045B]" />
                    </div>
                  </div>
                )}
                <div className="p-4">
                  <h4 className="font-semibold text-white mb-1">{content.title}</h4>
                  <p className="text-xs text-[#A3A3A3] mb-3 line-clamp-2">
                    {content.description}
                  </p>
                  <span className="inline-block text-xs font-medium px-2 py-1 rounded bg-[#D2045B]/20 text-[#D2045B]">
                    {content.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked Content */}
      {lockedContent.length > 0 && (
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#161616] p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            {t.rewards.lockedContent}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lockedContent.map((content) => {
              const pointsNeeded = getPointsNeededToUnlock(content.unlockRequiredPoints);
              return (
                <div
                  key={content.id}
                  className="rounded-xl overflow-hidden border border-[#2A2A2A] bg-[#111111] opacity-60"
                >
                  {content.thumbnailUrl && (
                    <div className="relative h-40 w-full overflow-hidden bg-[#2A2A2A]">
                      <Image
                        src={content.thumbnailUrl}
                        alt={content.title}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Lock className="h-6 w-6 text-[#A3A3A3]" />
                      </div>
                    </div>
                  )}
                  <div className="p-4">
                    <h4 className="font-semibold text-white mb-1">{content.title}</h4>
                    <p className="text-xs text-[#A3A3A3] mb-3 line-clamp-2">
                      {content.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium px-2 py-1 rounded bg-[#2A2A2A] text-[#A3A3A3]">
                        {content.type}
                      </span>
                      <button
                        onClick={() => onUnlock?.(content.id)}
                        disabled={pointsNeeded > 0}
                        className="text-xs font-semibold px-3 py-1 rounded bg-[#D2045B]/30 text-[#D2045B] hover:bg-[#D2045B]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {pointsNeeded > 0
                          ? `+${formatPoints(pointsNeeded)}`
                          : t.rewards.unlock}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {unlockedContent.length === 0 && lockedContent.length === 0 && (
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#161616] p-12 text-center">
          <p className="text-[#A3A3A3]">{t.rewards.noExclusiveContent}</p>
        </div>
      )}
    </div>
  );
}
