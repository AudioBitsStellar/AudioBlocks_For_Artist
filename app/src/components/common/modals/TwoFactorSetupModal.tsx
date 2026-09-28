"use client";

import { useState } from "react";
import { toast } from "sonner";
import Modal from "@/components/shared/Modal";
import {
  beginTwoFactorSetup,
  confirmTwoFactorSetup,
  generateRecoveryCodes,
  type TwoFactorSetup,
} from "@/services/securitySettingsService";

interface TwoFactorSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnabled: () => void;
}

type Step = "setup" | "verify" | "recovery";

export default function TwoFactorSetupModal({
  open,
  onOpenChange,
  onEnabled,
}: TwoFactorSetupModalProps) {
  const [step, setStep] = useState<Step>("setup");
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  const reset = () => {
    setStep("setup");
    setSetup(null);
    setCode("");
    setError("");
    setRecoveryCodes([]);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleStart = () => {
    setSetup(beginTwoFactorSetup());
    setStep("verify");
  };

  const handleVerify = () => {
    const result = confirmTwoFactorSetup(code);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRecoveryCodes(result.settings.recoveryCodes ?? generateRecoveryCodes(1));
    setError("");
    setStep("recovery");
  };

  const handleDone = () => {
    handleOpenChange(false);
    onEnabled();
    toast.success("Two-factor authentication enabled.");
  };

  const copyCodes = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join("\n"));
      toast.success("Recovery codes copied.");
    } catch {
      toast.error("Could not copy recovery codes.");
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      subtitle="Account security"
      title={step === "recovery" ? "Save your recovery codes" : "Set up two-factor authentication"}
      size="lg"
    >
      {step === "setup" && (
        <div className="space-y-5 text-white">
          <p className="text-sm text-[#A3A3A3]">
            Two-factor authentication is powered by Privy. Adding a second step at sign-in means a
            stolen password is not enough to get into your artist account.
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-[#A3A3A3]">
            <li>Open your authenticator app.</li>
            <li>You&apos;ll add the secret shown in the next step.</li>
            <li>Confirm with the 6-digit code it generates.</li>
          </ul>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="rounded-full border border-[#2A2A2A] px-5 py-2 text-sm font-semibold text-[#A3A3A3] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleStart}
              className="rounded-full bg-[#D2045B] px-5 py-2 text-sm font-semibold text-white hover:bg-[#B8043F]"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === "verify" && setup && (
        <div className="space-y-5 text-white">
          <div>
            <label htmlFor="tfa-secret" className="text-sm font-medium">
              Setup secret
            </label>
            <input
              id="tfa-secret"
              readOnly
              value={setup.secret}
              onFocus={(e) => e.target.select()}
              className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#1E1E1E] px-4 py-3 font-mono text-xs text-white focus:outline-none focus:border-[#D2045B]"
            />
            <p className="mt-1 text-xs text-[#A3A3A3]">
              Add this secret to your authenticator app.
            </p>
          </div>

          <div>
            <label htmlFor="tfa-code" className="text-sm font-medium">
              6-digit code
            </label>
            <input
              id="tfa-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              aria-invalid={error ? "true" : "false"}
              aria-describedby={error ? "tfa-code-error" : "tfa-code-hint"}
              placeholder="000000"
              className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#1E1E1E] px-4 py-3 tracking-[0.4em] text-white placeholder-[#A3A3A3] focus:outline-none focus:border-[#D2045B]"
            />
            {error ? (
              <p id="tfa-code-error" role="alert" className="mt-1 text-xs text-red-500">
                {error}
              </p>
            ) : (
              <p id="tfa-code-hint" className="mt-1 text-xs text-[#A3A3A3]">
                Preview build challenge code:{" "}
                <span data-testid="tfa-challenge">{setup.challenge}</span>
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep("setup")}
              className="rounded-full border border-[#2A2A2A] px-5 py-2 text-sm font-semibold text-[#A3A3A3] hover:text-white"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleVerify}
              disabled={code.length !== 6}
              className="rounded-full bg-[#D2045B] px-5 py-2 text-sm font-semibold text-white hover:bg-[#B8043F] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Verify and enable
            </button>
          </div>
        </div>
      )}

      {step === "recovery" && (
        <div className="space-y-5 text-white">
          <p className="text-sm text-[#A3A3A3]">
            Store these recovery codes somewhere safe. Each one can be used once if you lose access
            to your authenticator app.
          </p>
          <ul
            data-testid="recovery-codes"
            className="grid grid-cols-2 gap-2 rounded-2xl border border-[#2A2A2A] bg-[#161616] p-4 font-mono text-sm"
          >
            {recoveryCodes.map((recoveryCode) => (
              <li key={recoveryCode}>{recoveryCode}</li>
            ))}
          </ul>
          <div className="flex justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={copyCodes}
              className="rounded-full border border-[#2A2A2A] px-5 py-2 text-sm font-semibold text-[#A3A3A3] hover:text-white"
            >
              Copy codes
            </button>
            <button
              type="button"
              onClick={handleDone}
              className="rounded-full bg-[#D2045B] px-5 py-2 text-sm font-semibold text-white hover:bg-[#B8043F]"
            >
              I saved them
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export { TwoFactorSetupModal };
