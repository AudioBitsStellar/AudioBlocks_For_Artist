"use client";

import { useCallback, useMemo } from "react";
import {
  FanLoyaltyProgram,
  LoyaltyProgramConfig,
  RewardTier,
  RewardTierConfig,
  Reward,
} from "@/types";

// Default loyalty program configuration
const DEFAULT_LOYALTY_CONFIG: LoyaltyProgramConfig = {
  pointsPerStream: 1,
  pointsPerPurchase: 10,
  pointsPerShare: 2,
  pointsPerReview: 5,
  pointsPerEvent: 15,
  referralBonusPoints: 50,
  tiers: [
    {
      tier: "bronze",
      minPoints: 0,
      maxPoints: 499,
      benefits: ["Standard rewards", "Member discounts"],
      bonusMultiplier: 1,
      color: "#CD7F32",
    },
    {
      tier: "silver",
      minPoints: 500,
      maxPoints: 1499,
      benefits: ["Exclusive content", "15% bonus points", "Priority support"],
      bonusMultiplier: 1.15,
      color: "#C0C0C0",
    },
    {
      tier: "gold",
      minPoints: 1500,
      maxPoints: 4999,
      benefits: ["VIP access", "30% bonus points", "Early releases", "Dedicated support"],
      bonusMultiplier: 1.3,
      color: "#FFD700",
    },
    {
      tier: "platinum",
      minPoints: 5000,
      maxPoints: Infinity,
      benefits: [
        "All-access pass",
        "50% bonus points",
        "Exclusive events",
        "Personal artist connection",
        "Premium support",
      ],
      bonusMultiplier: 1.5,
      color: "#E5E4E2",
    },
  ],
};

/**
 * Hook for managing fan loyalty program
 * Provides utilities for calculating points, tiers, and managing rewards
 */
export function useLoyaltyProgram(
  loyaltyProgram: FanLoyaltyProgram | null,
  config: LoyaltyProgramConfig = DEFAULT_LOYALTY_CONFIG
) {
  /**
   * Get tier configuration by tier name
   */
  const getTierConfig = useCallback(
    (tier: RewardTier): RewardTierConfig => {
      return config.tiers.find((t) => t.tier === tier) || config.tiers[0];
    },
    [config.tiers]
  );

  /**
   * Calculate current tier based on points
   */
  const calculateTier = useCallback(
    (points: number): RewardTier => {
      const sortedTiers = [...config.tiers].sort((a, b) => b.minPoints - a.minPoints);
      for (const tier of sortedTiers) {
        if (points >= tier.minPoints) {
          return tier.tier;
        }
      }
      return "bronze";
    },
    [config.tiers]
  );

  /**
   * Get current tier info
   */
  const currentTierInfo = useMemo(() => {
    if (!loyaltyProgram) return getTierConfig("bronze");
    return getTierConfig(loyaltyProgram.currentTier);
  }, [loyaltyProgram, getTierConfig]);

  /**
   * Get next tier info and points needed
   */
  const nextTierInfo = useMemo(() => {
    if (!loyaltyProgram) return null;

    const tierIndex = config.tiers.findIndex((t) => t.tier === loyaltyProgram.currentTier);
    if (tierIndex === -1 || tierIndex === config.tiers.length - 1) return null;

    const nextTier = config.tiers[tierIndex + 1];
    const pointsNeeded = Math.max(0, nextTier.minPoints - loyaltyProgram.points.current);

    return {
      tier: nextTier.tier,
      config: nextTier,
      pointsNeeded,
    };
  }, [loyaltyProgram, config.tiers]);

  /**
   * Calculate points with bonus multiplier
   */
  const calculatePointsWithBonus = useCallback(
    (basePoints: number, tier: RewardTier = "bronze"): number => {
      const tierConfig = getTierConfig(tier);
      return Math.floor(basePoints * tierConfig.bonusMultiplier);
    },
    [getTierConfig]
  );

  /**
   * Calculate points earned from action
   */
  const calculatePointsEarned = useCallback(
    (
      action: "stream" | "purchase" | "share" | "review" | "event",
      tier: RewardTier = "bronze"
    ): number => {
      const basePoints: Record<string, number> = {
        stream: config.pointsPerStream,
        purchase: config.pointsPerPurchase,
        share: config.pointsPerShare,
        review: config.pointsPerReview,
        event: config.pointsPerEvent,
      };

      const base = basePoints[action] || 0;
      return calculatePointsWithBonus(base, tier);
    },
    [config, calculatePointsWithBonus]
  );

  /**
   * Check if reward is redeemable with current points
   */
  const isRewardRedeemable = useCallback(
    (reward: Reward): boolean => {
      if (!loyaltyProgram) return false;
      return loyaltyProgram.points.current >= reward.pointsCost && reward.isRedeemable;
    },
    [loyaltyProgram]
  );

  /**
   * Get available rewards sorted by points cost
   */
  const sortedAvailableRewards = useMemo(() => {
    if (!loyaltyProgram) return [];
    return [...loyaltyProgram.availableRewards].sort((a, b) => a.pointsCost - b.pointsCost);
  }, [loyaltyProgram]);

  /**
   * Get progress percentage to next tier
   */
  const progressToNextTier = useMemo(() => {
    if (!loyaltyProgram || !nextTierInfo) return 100;

    const currentTierConfig = getTierConfig(loyaltyProgram.currentTier);
    const pointsInCurrentTier = loyaltyProgram.points.current - currentTierConfig.minPoints;
    const totalPointsInTier = nextTierInfo.config.minPoints - currentTierConfig.minPoints;

    if (totalPointsInTier === 0) return 0;
    return Math.min(100, (pointsInCurrentTier / totalPointsInTier) * 100);
  }, [loyaltyProgram, nextTierInfo, getTierConfig]);

  /**
   * Format points display
   */
  const formatPoints = useCallback((points: number): string => {
    return points.toLocaleString();
  }, []);

  return {
    // Config
    config,
    getTierConfig,

    // Calculations
    calculateTier,
    calculatePointsWithBonus,
    calculatePointsEarned,

    // Current status
    currentTierInfo,
    nextTierInfo,
    progressToNextTier,

    // Rewards
    isRewardRedeemable,
    sortedAvailableRewards,

    // Utilities
    formatPoints,
  };
}

/**
 * Hook for managing exclusive content access
 */
export function useExclusiveContent(loyaltyProgram: FanLoyaltyProgram | null) {
  const { getTierConfig } = useLoyaltyProgram(loyaltyProgram);

  /**
   * Check if content is unlocked
   */
  const isContentUnlocked = useCallback(
    (requiredPoints: number): boolean => {
      if (!loyaltyProgram) return false;
      return loyaltyProgram.points.current >= requiredPoints;
    },
    [loyaltyProgram]
  );

  /**
   * Get locked content by tier
   */
  const getContentByTier = useCallback(
    (tier: RewardTier) => {
      if (!loyaltyProgram) return [];
      const tierConfig = getTierConfig(tier);
      return loyaltyProgram.exclusiveContent.filter(
        (content) =>
          content.unlockRequiredPoints >= tierConfig.minPoints &&
          content.unlockRequiredPoints < tierConfig.maxPoints
      );
    },
    [loyaltyProgram, getTierConfig]
  );

  /**
   * Get points needed to unlock content
   */
  const getPointsNeededToUnlock = useCallback(
    (requiredPoints: number): number => {
      if (!loyaltyProgram) return requiredPoints;
      return Math.max(0, requiredPoints - loyaltyProgram.points.current);
    },
    [loyaltyProgram]
  );

  return {
    isContentUnlocked,
    getContentByTier,
    getPointsNeededToUnlock,
  };
}
