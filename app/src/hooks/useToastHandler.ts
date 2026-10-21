import { createElement, useCallback } from "react";
import { toast } from "sonner";
import Toast, { type ToastVariant } from "@/components/shared/Toast";

interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export interface ToastOptions {
  /**
   * Stable id for the async action. A toast with an id that's already on
   * screen replaces it instead of stacking a duplicate, so a service-level
   * toast and a component-level one for the same action collapse into one,
   * and `loading(...)` can be turned into the final success/error.
   * Shared ids live in `@/lib/toastIds`.
   */
  id?: string | number;
  description?: string;
  duration?: number;
}

export const TOAST_DURATIONS: Record<ToastVariant, number> = {
  success: 4000,
  info: 4000,
  // Errors stay up longer so there's time to read them.
  error: 6000,
  // Loading toasts stay until replaced or dismissed.
  loading: Infinity,
};

/**
 * Renders a `<Toast />` through the global sonner `<Toaster />` and returns
 * its id.
 */
export function showToast(
  variant: ToastVariant,
  message: string,
  options: ToastOptions = {}
): string | number {
  const { id, description, duration = TOAST_DURATIONS[variant] } = options;
  return toast.custom(
    (toastId) =>
      createElement(Toast, {
        variant,
        message,
        description,
        onDismiss: variant === "loading" ? undefined : () => toast.dismiss(toastId),
      }),
    { id, duration, dismissible: variant !== "loading" }
  );
}

export const useHandleSuccess = () => {
  return useCallback((message?: string, options?: ToastOptions) => {
    showToast("success", message || "Operation completed successfully", options);
  }, []);
};

export const useHandleError = () => {
  return useCallback((error: ApiError | string, customMessage?: string, options?: ToastOptions) => {
    let message: string;

    if (typeof error === "string") {
      message = customMessage || error;
    } else {
      message = customMessage || error.message || "An error occurred";

      if (!customMessage && error.status) {
        switch (error.status) {
          case 400:
            message = "Invalid request. Please check your input.";
            break;
          case 401:
            message = "Authentication required. Please log in.";
            break;
          case 403:
            message = "Access denied. You don't have permission.";
            break;
          case 404:
            message = "Resource not found.";
            break;
          case 422:
            message = "Validation failed. Please check your input.";
            break;
          case 500:
            message = "Server error. Please try again later.";
            break;
          default:
            message = error.message || "An unexpected error occurred";
        }
      }
    }

    showToast("error", message, options);
  }, []);
};

export const useToast = () => {
  const handleSuccess = useHandleSuccess();
  const handleError = useHandleError();

  const showInfo = useCallback((message: string, options?: ToastOptions) => {
    showToast("info", message, options);
  }, []);

  const showLoading = useCallback((message: string, options?: ToastOptions) => {
    return showToast("loading", message, options);
  }, []);

  const dismiss = useCallback((toastId?: string | number) => {
    toast.dismiss(toastId);
  }, []);

  return {
    success: handleSuccess,
    error: handleError,
    info: showInfo,
    loading: showLoading,
    dismiss,
  };
};
