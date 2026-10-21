"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import MusicLoader from "@/components/MusicLoader";
import { endSession } from "@/api/session";
import { readEmailVerified, useEmailVerification } from "@/hooks/useEmailVerification";
import { useHasHydrated } from "@/hooks/useHasHydrated";
import { getEmailFromToken } from "@/utils/jwt";

/**
 * "Check your inbox" step (#519). The backend emails a verification link, which
 * opens `/verify-email/<token>`. This page waits for that link to be used and
 * re-checks the backend when the artist asks.
 */
export default function VerifyEmailPage() {
  const router = useRouter();
  const hydrated = useHasHydrated();
  const { emailVerified, refetch } = useEmailVerification();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (emailVerified === true) router.replace("/dashboard/overview");
  }, [emailVerified, router]);

  // The address comes from the session's claims cookie, which only the browser can read.
  const email = hydrated ? (getEmailFromToken() ?? "") : "";

  const handleCheck = async () => {
    setChecking(true);
    const result = await refetch();
    setChecking(false);

    if (result.isError) {
      toast.error("We couldn't check your account just now. Try again in a moment.");
    } else if (readEmailVerified(result.data) !== true) {
      toast.info("Not verified yet. Open the link in the email we sent you first.");
    }
  };

  const handleUseDifferentAccount = async () => {
    await endSession();
    router.replace("/login");
  };

  // The session is only known after hydration, so the server render stays empty.
  if (!hydrated) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div
        className="w-full max-w-md p-8 space-y-6"
        style={{ borderRadius: "16px", background: "#161616", border: "1px solid #2A2A2A" }}
      >
        <div>
          <h1 className="text-white text-2xl font-bold">Check your inbox</h1>
          <p className="text-sm text-[#A3A3A3] mt-1">
            {email ? (
              <>
                We sent a verification link to <span className="font-semibold text-white">{email}</span>.
              </>
            ) : (
              "We sent a verification link to the email on your artist account."
            )}{" "}
            Open it to confirm your address and finish setting up your workspace.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCheck}
          disabled={checking}
          className={`${
            checking ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-[#B8043F]"
          } w-full rounded-lg bg-[#D2045B] text-white font-semibold px-6 py-3 transition-colors`}
        >
          {checking ? <MusicLoader small /> : "I've verified my email"}
        </button>

        <p className="text-xs text-[#6F6F6F]">
          Didn&apos;t get it? Check your spam folder. The link works once and expires after a
          while.
        </p>

        <button
          type="button"
          onClick={handleUseDifferentAccount}
          className="text-sm text-[#A3A3A3] hover:text-white cursor-pointer"
        >
          Log in with a different account
        </button>
      </div>
    </div>
  );
}
