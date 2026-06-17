import { AUTH_ENDPOINTS } from "@/api/api-endpoint";
import { usePost } from "@/api/queryClient";
import { useHandleError } from "@/hooks/useToastHandler";
import { AuthResponse, LoginEmailPayload, RegisterEmailPayload } from "@/types";

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
}

const useAuthServices = () => {
  const handleError = useHandleError();

  const useRegisterEmail = () =>
    usePost<ApiEnvelope<never> & AuthResponse, RegisterEmailPayload>(
      AUTH_ENDPOINTS.REGISTER_EMAIL,
      {
        onError: (error) => handleError(error.message || "Failed to register."),
      }
    );

  const useLoginEmail = () =>
    usePost<ApiEnvelope<never> & AuthResponse, LoginEmailPayload>(
      AUTH_ENDPOINTS.LOGIN_EMAIL,
      {
        onError: (error) => handleError(error.message || "Failed to log in."),
      }
    );

  return { useRegisterEmail, useLoginEmail };
};

export default useAuthServices;
