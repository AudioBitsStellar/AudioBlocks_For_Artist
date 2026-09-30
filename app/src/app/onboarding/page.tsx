"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { OnboardingStep } from "@/types/onboarding";
import BasicInfoStep from "@/components/onboarding/BasicInfoStep";
import VerificationStep from "@/components/onboarding/VerificationStep";
import PayoutWalletStep from "@/components/onboarding/PayoutWalletStep";

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [completedSteps, setCompletedSteps] = useState<OnboardingStep[]>([]);

  useEffect(() => {
    const token = Cookies.get("audioblocks_jwt");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  const handleStepComplete = (step: OnboardingStep) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps([...completedSteps, step]);
    }

    if (step < 3) {
      setCurrentStep((step + 1) as OnboardingStep);
    } else {
      router.push("/dashboard");
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as OnboardingStep);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to AudioBlocks</h1>
          <p className="text-[#A3A3A3]">Complete your artist profile to start uploading music</p>
        </div>

        <div className="mb-8 flex items-center justify-between">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center flex-1">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  completedSteps.includes(step as OnboardingStep)
                    ? "bg-green-600"
                    : currentStep === step
                      ? "bg-[#D2045B]"
                      : "bg-[#2A2A2A]"
                } text-white font-semibold`}
              >
                {completedSteps.includes(step as OnboardingStep) ? "✓" : step}
              </div>
              {step < 3 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    completedSteps.includes(step as OnboardingStep)
                      ? "bg-green-600"
                      : "bg-[#2A2A2A]"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div
          className="rounded-2xl p-8"
          style={{ background: "#161616", border: "1px solid #2A2A2A" }}
        >
          {currentStep === 1 && <BasicInfoStep onComplete={() => handleStepComplete(1)} />}
          {currentStep === 2 && (
            <VerificationStep onComplete={() => handleStepComplete(2)} onBack={handleBack} />
          )}
          {currentStep === 3 && (
            <PayoutWalletStep onComplete={() => handleStepComplete(3)} onBack={handleBack} />
          )}
        </div>
      </div>
    </div>
  );
}
