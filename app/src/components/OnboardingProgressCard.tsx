"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Sparkles, ChevronRight } from "lucide-react";
import { useOnboardingProgress } from "@/services/onboardingService";

interface OnboardingProgressCardProps {
  className?: string;
}

export default function OnboardingProgressCard({ className = "" }: OnboardingProgressCardProps) {
  const { progress, markStepComplete } = useOnboardingProgress();

  if (progress.isFullyCompleted) {
    return null;
  }

  return (
    <div
      className={`rounded-2xl border border-emerald-500/20 bg-[#141a16] p-6 space-y-5 ${className}`}
      role="region"
      aria-label="Artist Onboarding Progress"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="text-emerald-400 h-5 w-5" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-white">Complete your Artist Onboarding</h2>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Finish setting up your account to unlock all features, tipping, and analytics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Progress</span>
            <span className="block text-xl font-bold font-mono text-emerald-400">{progress.percentage}%</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[#2A2A2A] rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
          style={{ width: `${progress.percentage}%` }}
          role="progressbar"
          aria-valuenow={progress.percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {/* Steps List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {progress.steps.map((step) => (
          <div
            key={step.id}
            className={`flex items-start justify-between gap-3 p-3.5 rounded-xl border transition-colors ${
              step.completed
                ? "bg-[#19221c] border-emerald-900/40 text-gray-300"
                : "bg-[#1a1a1a] border-[#2C2C2C] text-white"
            }`}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() => !step.completed && markStepComplete(step.id)}
                className="mt-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded-full"
                aria-label={step.completed ? `${step.title} completed` : `Mark ${step.title} as completed`}
              >
                {step.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-500 shrink-0 hover:text-emerald-400 transition-colors" />
                )}
              </button>

              <div>
                <h3 className={`text-sm font-medium ${step.completed ? "line-through text-gray-400" : "text-white"}`}>
                  {step.title}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{step.description}</p>
              </div>
            </div>

            {!step.completed && step.actionUrl && (
              <Link
                href={step.actionUrl}
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors shrink-0 self-center"
              >
                Start
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
