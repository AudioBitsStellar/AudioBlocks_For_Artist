import { useCallback } from 'react';
import { toast } from 'sonner';

interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export const useHandleSuccess = () => {
  return useCallback((message?: string) => {
    // Announce for screen readers
    try {
      if (typeof window !== 'undefined') {
        const el = document.getElementById('sr-toast');
        if (el) {
          el.textContent = message || 'Operation completed successfully';
          setTimeout(() => {
            if (el.textContent === (message || 'Operation completed successfully')) el.textContent = '';
          }, 4000);
        }
      }
    } catch (e) {
      // ignore DOM errors
    }
    toast.success(message || 'Operation completed successfully', {
      duration: 4000,
    });
  }, []);
};

export const useHandleError = () => {
  return useCallback((error: ApiError | string, customMessage?: string) => {
    let message: string;

    if (typeof error === 'string') {
      message = customMessage || error;
    } else {
      message = customMessage || error.message || 'An error occurred';

      if (!customMessage && error.status) {
        switch (error.status) {
          case 400:
            message = 'Invalid request. Please check your input.';
            break;
          case 401:
            message = 'Authentication required. Please log in.';
            break;
          case 403:
            message = "Access denied. You don't have permission.";
            break;
          case 404:
            message = 'Resource not found.';
            break;
          case 422:
            message = 'Validation failed. Please check your input.';
            break;
          case 500:
            message = 'Server error. Please try again later.';
            break;
          default:
            message = error.message || 'An unexpected error occurred';
        }
      }
    }

    try {
      if (typeof window !== 'undefined') {
        const el = document.getElementById('sr-toast');
        if (el) {
          el.textContent = message;
          setTimeout(() => {
            if (el.textContent === message) el.textContent = '';
          }, 5000);
        }
      }
    } catch (e) {
      // ignore
    }

    toast.error(message, {
      duration: 5000,
    });
  }, []);
};

export const useToast = () => {
  const handleSuccess = useHandleSuccess();
  const handleError = useHandleError();

  const showInfo = useCallback((message: string) => {
    try {
      if (typeof window !== 'undefined') {
        const el = document.getElementById('sr-toast');
        if (el) {
          el.textContent = message;
          setTimeout(() => {
            if (el.textContent === message) el.textContent = '';
          }, 4000);
        }
      }
    } catch (e) {
      // ignore
    }

    toast(message, { duration: 4000 });
  }, []);

  const showLoading = useCallback((message: string) => {
    try {
      if (typeof window !== 'undefined') {
        const el = document.getElementById('sr-toast');
        if (el) {
          el.textContent = message;
        }
      }
    } catch (e) {
      // ignore
    }

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
