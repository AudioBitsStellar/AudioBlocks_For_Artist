"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import MusicLoader from "@/components/MusicLoader";
import OtpInput from "@/components/shared/OtpInput";
import { useEmailVerification } from "@/hooks/useEmailVerification";
import { useHasHydrated } from "@/hooks/useHasHydrated";
import { featureFlags } from "@/lib/featureFlags";
import {
  CODE_LENGTH,
  CODE_TTL_MS,
  MAX_ATTEMPTS,
  RESEND_COOLDOWN_MS,
  msUntilResend,
  resendVerificationCode,
  startVerification,
  verifyEmailCode,
  type IssuedCode,
} from "@/services/emailVerificationService";
import { getEmailFromToken } from "@/utils/jwt";

const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const TICK_MS = 1000;

/** Error copy keyed off the service's failure codes. */
const ERROR_COPY: Record<string, string> = {
  expired: "That code has expired. Send yourself a new one.",
  invalid_code: "That code isn't right. Check the digits and try again.",
  too_many_attempts: "Too many wrong attempts. Request a fresh code to continue.",
  no_active_code: "We don't have a code on file for you. Send a new one.",
  cooldown_active: "Please wait before requesting another code.",
};

export default function VerifyEmailPage() {
  const router = useRouter();
  const hydrated = useHasHydrated();
  const { state, status } = useEmailVerification();

  const [emailDraft, setEmailDraft] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Lets the artist swap address mid-flow: the pending step stays reachable
  // from storage alone, so switching needs its own transient flag.
  const [changeAddress, setChangeAddress] = useState(false);
  // Bumped once a second while a code is outstanding so the cooldown label and
  // the expiry stay live; the value itself is derived, never stored.
  const [, setTick] = useState(0);

  const pending = status === "pending" && Boolean(state.email) && !changeAddress;

  useEffect(() => {
    if (status === "verified") router.replace("/dashboard/overview");
  }, [status, router]);

  useEffect(() => {
    if (!pending) return;
    const id = setInterval(() => setTick((current) => current + 1), TICK_MS);
    return () => clearInterval(id);
  }, [pending]);

  const resendWaitMs = pending ? msUntilResend() : 0;
  const email = emailDraft || state.email || (hydrated ? (getEmailFromToken() ?? "") : "");
  const attemptsLeft = Math.max(MAX_ATTEMPTS - state.attempts, 0);

  const handleIssued = (result: IssuedCode) => {
    setBusy(false);
    if (!result.ok) {
      setError(ERROR_COPY[result.error] ?? "Couldn't send a code just now.");
      return;
    }
    setError(null);
    setCode("");
    setIssuedCode(result.code);
    setChangeAddress(false);
    toast.success("Verification code sent");
  };

  const handleStart = (event: FormEvent) => {
    event.preventDefault();
    if (!EMAIL_REGEX.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    handleIssued(startVerification(email));
  };

  const handleResend = () => {
    setBusy(true);
    handleIssued(resendVerificationCode());
  };

  const handleVerify = (submitted: string) => {
    setBusy(true);
    const result = verifyEmailCode(submitted);
    setBusy(false);
    if (result.ok) {
      setError(null);
      toast.success("Email verified");
      router.replace("/dashboard/overview");
      return;
    }
    setError(ERROR_COPY[result.error] ?? "That code wasn't accepted.");
    setCode("");
  };

  // The record comes from storage, which the server render can't see.
  if (!hydrated) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div
        className="w-full max-w-md p-8 space-y-6"
        style={{ borderRadius: "16px", background: "#161616", border: "1px solid #2A2A2A" }}
      >
        <div>
          <h1 className="text-white text-2xl font-bold">
            {pending ? "Confirm your email" : "Verify your email"}
          </h1>
          <p className="text-sm text-[#A3A3A3] mt-1">
            {pending
              ? "Enter the 6-digit code we sent to keep your artist account secure."
              : "We'll send a 6-digit code to confirm the address on your artist account."}
          </p>
        </div>

        {pending ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (code.length === CODE_LENGTH) handleVerify(code);
            }}
            className="space-y-4"
            noValidate
          >
            <p className="text-sm text-white">
              Sent to <span className="font-semibold">{state.email}</span>{" "}
              <button
                type="button"
                onClick={() => {
                  setIssuedCode(null);
                  setError(null);
                  setCode("");
                  setEmailDraft(state.email ?? "");
                  setChangeAddress(true);
                }}
                className="text-[#D2045B] hover:underline text-sm cursor-pointer"
              >
                Use another address
              </button>
            </p>

            <OtpInput value={code} onChange={setCode} onComplete={handleVerify} disabled={busy} />

            {featureFlags.useMockEmailVerification && issuedCode ? (
              <p
                className="text-xs text-[#A3A3A3]"
                style={{
                  borderRadius: "12px",
                  background: "#FFFFFF0A",
                  border: "1px dashed #2A2A2A",
                  padding: "8px 12px",
                }}
              >
                No email backend yet, so your code is shown here:{" "}
                <span className="font-mono text-white">{issuedCode}</span>
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy || code.length < CODE_LENGTH}
              className={`${
                busy || code.length < CODE_LENGTH
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer hover:bg-[#B8043F]"
              } w-full rounded-lg bg-[#D2045B] text-white font-semibold px-6 py-3 transition-colors`}
            >
              {busy ? <MusicLoader small /> : "Verify email"}
            </button>

            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={handleResend}
                disabled={busy || resendWaitMs > 0}
                className={`text-sm text-[#A3A3A3] ${
                  resendWaitMs > 0 ? "cursor-not-allowed" : "hover:text-white cursor-pointer"
                }`}
              >
                {resendWaitMs > 0
                  ? `Resend code in ${Math.ceil(resendWaitMs / 1000)}s`
                  : "Resend code"}
              </button>
              <span data-testid="attempts-left" className="text-xs text-[#A3A3A3]">
                {`${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left`}
              </span>
            </div>
          </form>
        ) : (
          <form onSubmit={handleStart} className="space-y-4" noValidate>
            <div className="flex flex-col">
              <label htmlFor="verify-email" className="text-sm font-medium text-white mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="verify-email"
                type="email"
                value={email}
                onChange={(event) => setEmailDraft(event.target.value)}
                placeholder="you@example.com"
                maxLength={254}
                autoComplete="email"
                aria-invalid={error ? "true" : "false"}
                aria-describedby="verify-email-error"
                className="text-white placeholder:text-[#6F6F6F] focus:outline-none px-4 h-12 rounded-2xl"
                style={{ background: "#FFFFFF0A" }}
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className={`${
                busy ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-[#B8043F]"
              } w-full rounded-lg bg-[#D2045B] text-white font-semibold px-6 py-3 transition-colors`}
            >
              {busy ? <MusicLoader small /> : "Send code"}
            </button>

            <p className="text-sm text-[#A3A3A3] text-center">
              Already verified?{" "}
              <Link href="/login" className="text-[#D2045B] hover:underline">
                Log in
              </Link>
            </p>
          </form>
        )}

        <p id="verify-email-error" role="alert" aria-live="polite" className="text-xs text-red-500">
          {error ?? ""}
        </p>

        <p className="text-xs text-[#6F6F6F]">
          Codes expire after {Math.round(CODE_TTL_MS / 60000)} minutes. Resends are limited to one
          every {Math.round(RESEND_COOLDOWN_MS / 1000)} seconds.
        </p>
      </div>
    </div>
  );
}
