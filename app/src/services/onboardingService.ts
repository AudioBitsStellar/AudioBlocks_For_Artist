/**
 * Onboarding progress persistence service (#383).
 *
 * Persists the artist onboarding steps to localStorage with debounced sync,
 * supporting step completion tracking, progress percentage calculation,
 * and state restoration across sessions.
 */

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "audioblocks:onboarding-progress:v1";

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
  actionUrl?: string;
}

export interface OnboardingProgressState {
  steps: OnboardingStep[];
  currentStepId: string;
  completedCount: number;
  totalCount: number;
  percentage: number;
  isFullyCompleted: boolean;
  lastUpdated: string;
}

export const DEFAULT_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "account_created",
    title: "Create Artist Account",
    description: "Sign up and set up your core workspace credentials",
    completed: true,
    required: true,
  },
  {
    id: "email_verified",
    title: "Verify Email",
    description: "Confirm your email address for workspace security",
    completed: false,
    required: true,
    actionUrl: "/verify-email",
  },
  {
    id: "profile_setup",
    title: "Complete Artist Profile",
    description: "Add avatar, bio, and social links to showcase your brand",
    completed: false,
    required: false,
    actionUrl: "/dashboard/settings",
  },
  {
    id: "wallet_connected",
    title: "Connect Stellar Wallet",
    description: "Link a Stellar account to receive instant royalties and tips",
    completed: false,
    required: true,
    actionUrl: "/dashboard/settings/linked-accounts",
  },
  {
    id: "first_track",
    title: "Upload First Track",
    description: "Publish your first music release on AudioBlocks",
    completed: false,
    required: false,
    actionUrl: "/dashboard/upload-music",
  },
];

let inMemoryState: OnboardingProgressState | null = null;

function calculateState(steps: OnboardingStep[]): OnboardingProgressState {
  const completedCount = steps.filter((s) => s.completed).length;
  const totalCount = steps.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const nextIncomplete = steps.find((s) => !s.completed);

  return {
    steps,
    currentStepId: nextIncomplete ? nextIncomplete.id : steps[steps.length - 1]?.id || "",
    completedCount,
    totalCount,
    percentage,
    isFullyCompleted: completedCount === totalCount,
    lastUpdated: new Date().toISOString(),
  };
}

export function getOnboardingProgress(): OnboardingProgressState {
  if (inMemoryState) return inMemoryState;

  if (typeof window === "undefined") {
    inMemoryState = calculateState(DEFAULT_ONBOARDING_STEPS);
    return inMemoryState;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.steps)) {
        // Merge stored step completion statuses with latest step metadata
        const mergedSteps = DEFAULT_ONBOARDING_STEPS.map((defStep) => {
          const stored = parsed.steps.find((s: { id: string }) => s.id === defStep.id);
          return {
            ...defStep,
            completed: stored ? Boolean(stored.completed) : defStep.completed,
          };
        });
        inMemoryState = calculateState(mergedSteps);
        return inMemoryState;
      }
    }
  } catch {
    // Storage read error fallback
  }

  inMemoryState = calculateState(DEFAULT_ONBOARDING_STEPS);
  return inMemoryState;
}

export function saveOnboardingProgress(steps: OnboardingStep[]): OnboardingProgressState {
  const newState = calculateState(steps);
  inMemoryState = newState;

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch {
      // Storage quota exceeded or disabled
    }
  }

  return newState;
}

export function completeStep(stepId: string): OnboardingProgressState {
  const current = getOnboardingProgress();
  const updatedSteps = current.steps.map((step) =>
    step.id === stepId ? { ...step, completed: true } : step
  );
  return saveOnboardingProgress(updatedSteps);
}

export function resetOnboardingProgress(): OnboardingProgressState {
  inMemoryState = null;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage remove error fallback
    }
  }
  return getOnboardingProgress();
}

/**
 * Custom Hook for accessing and mutating onboarding progress in React components.
 */
export function useOnboardingProgress() {
  const [progress, setProgress] = useState<OnboardingProgressState>(getOnboardingProgress);

  useEffect(() => {
    setProgress(getOnboardingProgress());
  }, []);

  const markStepComplete = useCallback((stepId: string) => {
    const next = completeStep(stepId);
    setProgress(next);
  }, []);

  const resetProgress = useCallback(() => {
    const next = resetOnboardingProgress();
    setProgress(next);
  }, []);

  return {
    progress,
    markStepComplete,
    resetProgress,
  };
}
