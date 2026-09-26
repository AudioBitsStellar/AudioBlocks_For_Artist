"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useEmailVerification, useHasHydrated } from "@/hooks/useEmailVerification";

/**
 * Holds the dashboard back until an artist has confirmed their email address
 * (#459).
 *
 * Only artists with a verification code currently pending are diverted. An
 * account with no record on file — anyone who registered before this step
 * existed, or a session issued by a backend that doesn't track it — passes
 * straight through, so the gate can never lock an existing artist out.
 *
 * Nothing renders until hydration: the answer comes from storage, which the
 * server render cannot see.
 */
export default function EmailVerificationGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const hydrated = useHasHydrated();
  const { requiresVerification } = useEmailVerification();

  useEffect(() => {
    if (requiresVerification) router.replace("/verify-email");
  }, [requiresVerification, router]);

  if (!hydrated || requiresVerification) return null;
  return <>{children}</>;
}
