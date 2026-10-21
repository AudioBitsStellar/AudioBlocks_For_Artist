"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import MusicLoader from "@/components/MusicLoader";
import { EMAIL_VERIFICATION_QUERY_KEY } from "@/hooks/useEmailVerification";
import { verifyEmailToken } from "@/services/emailVerificationService";

type Phase = "verifying" | "verified" | "invalid_or_expired" | "unavailable";

/**
 * Landing page for the link in the verification email (#519). It consumes the
 * one-time token through the backend and reports the result.
 */
export default function VerifyEmailTokenPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>("verifying");
  const [attempt, setAttempt] = useState(0);
  // The link is single-use. Strict Mode runs effects twice in development, so
  // record which attempt has already been sent.
  const startedAttempt = useRef<string | null>(null);

  useEffect(() => {
    const key = `${token}:${attempt}`;
    if (startedAttempt.current === key) return;
    startedAttempt.current = key;

    // No cleanup: the guard above keeps this request single, and cancelling it
    // here would strand the page on "Verifying" under Strict Mode.
    verifyEmailToken(token).then(async (result) => {
      if (result.ok) {
        await queryClient.invalidateQueries({ queryKey: EMAIL_VERIFICATION_QUERY_KEY });
        setPhase("verified");
      } else {
        setPhase(result.reason);
      }
    });
  }, [token, attempt, queryClient]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div
        className="w-full max-w-md p-8 space-y-6"
        style={{ borderRadius: "16px", background: "#161616", border: "1px solid #2A2A2A" }}
        aria-live="polite"
      >
        {phase === "verifying" && (
          <>
            <h1 className="text-white text-2xl font-bold">Verifying your email</h1>
            <div className="flex justify-center py-4">
              <MusicLoader small />
            </div>
          </>
        )}

        {phase === "verified" && (
          <>
            <h1 className="text-white text-2xl font-bold">Your email is verified</h1>
            <p className="text-sm text-[#A3A3A3]">
              Thanks for confirming your address. Your artist workspace is ready.
            </p>
            <button
              type="button"
              onClick={() => router.replace("/dashboard/overview")}
              className="w-full rounded-lg bg-[#D2045B] hover:bg-[#B8043F] text-white font-semibold px-6 py-3 transition-colors"
            >
              Continue to dashboard
            </button>
          </>
        )}

        {phase === "invalid_or_expired" && (
          <>
            <h1 className="text-white text-2xl font-bold">This link can&apos;t be used</h1>
            <p className="text-sm text-[#A3A3A3]">
              The verification link is invalid, has already been used, or has expired. Log in to
              see your account status.
            </p>
            <Link
              href="/login"
              className="block w-full rounded-lg bg-[#D2045B] hover:bg-[#B8043F] text-white text-center font-semibold px-6 py-3 transition-colors"
            >
              Log in
            </Link>
          </>
        )}

        {phase === "unavailable" && (
          <>
            <h1 className="text-white text-2xl font-bold">We couldn&apos;t verify your email</h1>
            <p className="text-sm text-[#A3A3A3]">
              Something went wrong on our side. Try again in a moment.
            </p>
            <button
              type="button"
              onClick={() => setAttempt((current) => current + 1)}
              className="w-full rounded-lg bg-[#D2045B] hover:bg-[#B8043F] text-white font-semibold px-6 py-3 transition-colors"
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
