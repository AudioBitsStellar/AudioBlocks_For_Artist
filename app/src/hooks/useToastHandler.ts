import { useCallback } from "react";
import { toast } from "sonner";

interface ApiError {
  message: string;
  status?: number;
  code?: string;
  /** Correlated with the backend log line; shown so support can find the call (OBS-04). */
  requestId?: string;
}

export const useHandleSuccess = () => {
  return useCallback((message?: string) => {
    toast.success(message || "Operation completed successfully", {
      duration: 4000,
    });
  }, []);
};

export const useHandleError = () => {
  return useCallback((error: ApiError | string, customMessage?: string) => {
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

    // A support engineer can only act on "the save failed" if the message
    // carries something to search for. The id is the one the request was sent
    // with, so it matches the backend's log entry even when the response was
    // lost.
    const reference = typeof error === "string" ? undefined : error.requestId;
    const withReference = reference ? `${message} (reference: ${reference})` : message;

    toast.error(withReference, {
      duration: 5000,
    });
  }, []);
};

export const useToast = () => {
  const handleSuccess = useHandleSuccess();
  const handleError = useHandleError();

  const showInfo = useCallback((message: string) => {
    toast(message, { duration: 4000 });
  }, []);

  const showLoading = useCallback((message: string) => {
    return toast.loading(message);
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
