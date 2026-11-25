"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import "./globals.css";
import BrandedErrorPage from "@/components/shared/BrandedErrorPage";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <BrandedErrorPage kind="error" onRetry={reset} reference={error.digest} />
      </body>
    </html>
  );
}
