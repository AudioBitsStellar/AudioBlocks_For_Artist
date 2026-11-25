"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import BrandedErrorPage from "@/components/shared/BrandedErrorPage";

interface AppErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AppError({ error, reset }: AppErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return <BrandedErrorPage kind="error" onRetry={reset} reference={error.digest} />;
}
