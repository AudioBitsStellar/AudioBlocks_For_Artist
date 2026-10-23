"use client";

import { CheckCircle2, Info, Loader2, X, XCircle } from "lucide-react";

export type ToastVariant = "success" | "error" | "info" | "loading";

interface ToastProps {
  variant: ToastVariant;
  message: string;
  description?: string;
  /** Omit to hide the close button (e.g. while an action is still loading). */
  onDismiss?: () => void;
}

const VARIANT_STYLES: Record<ToastVariant, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: "border-[#3DDC84]/40 text-[#3DDC84]" },
  error: { icon: XCircle, className: "border-[#FF5252]/40 text-[#FF5252]" },
  info: { icon: Info, className: "border-[#4F8DFF]/40 text-[#4F8DFF]" },
  loading: { icon: Loader2, className: "border-[#2A2A2A] text-[#A3A3A3]" },
};

/**
 * Snackbar body rendered by the global sonner `<Toaster />` via `useToast()`
 * (see hooks/useToastHandler.ts). Sonner handles stacking, auto-dismiss and
 * swipe; this component owns the look and the announcement semantics:
 * errors are `role="alert"` (assertive), everything else `role="status"`.
 */
export default function Toast({ variant, message, description, onDismiss }: ToastProps) {
  const { icon: Icon, className } = VARIANT_STYLES[variant];
  const isError = variant === "error";

  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      aria-atomic="true"
      data-variant={variant}
      className={`flex w-full items-start gap-3 rounded-xl border bg-[#161616] px-4 py-3 shadow-lg sm:w-[356px] ${className}`}
    >
      <Icon
        aria-hidden="true"
        className={`mt-0.5 h-5 w-5 shrink-0 ${variant === "loading" ? "animate-spin" : ""}`}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white break-words">{message}</p>
        {description && <p className="mt-0.5 text-xs text-[#A3A3A3] break-words">{description}</p>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="-m-1 rounded-md p-1 text-[#A3A3A3] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export { Toast };
