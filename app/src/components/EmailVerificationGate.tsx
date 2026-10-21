"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useEmailVerification } from "@/hooks/useEmailVerification";

/**
 * Holds the dashboard back until the backend reports the artist's email as
 * verified (#459, #519).
 *
 * Only an explicit `emailVerified: false` is diverted. An account without that
 * field passes straight through, and so does a failed profile request, so the
 * gate can never lock an existing artist out.
 *
 * Nothing renders while the profile loads, because the answer is not known yet.
 */
export default function EmailVerificationGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { requiresVerification, isLoading } = useEmailVerification();

  useEffect(() => {
    if (requiresVerification) router.replace("/verify-email");
  }, [requiresVerification, router]);

  if (isLoading || requiresVerification) return null;
  return <>{children}</>;
}
