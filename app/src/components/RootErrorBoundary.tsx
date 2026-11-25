"use client";

import type { ReactNode } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import BrandedErrorPage from "@/components/shared/BrandedErrorPage";

/**
 * The app-wide error boundary. Its fallback is a render function, which a
 * server component (the root layout) cannot pass to a client component, so the
 * function lives here on the client side.
 */
export default function RootErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary fallback={({ reset }) => <BrandedErrorPage kind="error" onRetry={reset} />}>
      {children}
    </ErrorBoundary>
  );
}
