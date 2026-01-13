import { useCallback } from 'react';
import { toast } from 'sonner';

// Types for API responses
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

// Success handler hook
export const useHandleSuccess = () => {
  return useCallback((message?: string) => {
    const successMessage = message || 'Operation completed successfully';
    
    toast.success(successMessage, {
      duration: 4000,
      position: 'top-right',
    });
  }, []);
};

// Error handler hook
export const useHandleError = () => {
  return useCallback((error: ApiError | string, customMessage?: string) => {
    let message: string;
    
    if (typeof error === 'string') {
      message = customMessage || error;
    } else {
      message = customMessage || error.message || 'An error occurred';
      
      // Handle different error types if no custom message provided
      if (!customMessage && error.status) {
        switch (error.status) {
          case 400:
            message = 'Invalid request. Please check your input.';
            break;
          case 401:
            message = 'Authentication required. Please log in.';
            break;
          case 403:
            message = 'Access denied. You don\'t have permission.';
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
    
    toast.error(message, {
      duration: 5000,
      position: 'top-right',
    });
  }, []);
};
