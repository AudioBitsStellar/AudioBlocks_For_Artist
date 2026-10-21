import { AUTH_ENDPOINTS } from "@/api/api-endpoint";
import { usePost } from "@/api/queryClient";
import { useHandleError, useHandleSuccess } from "@/hooks/useToastHandler";
import { AuthResponse, LoginEmailPayload, LoginEmailResponse, RegisterEmailPayload } from "@/types";

interface ApiEnvelope {
  success: boolean;
  message?: string;
}

// Session tokens are never handled here. Login hands them to `establishSession`
// (src/api/session.ts), which moves them into httpOnly cookies (#521).

const useAuthServices = () => {
  const handleError = useHandleError();
  const handleSuccess = useHandleSuccess();

  /**
   * Registers a new artist account by email.
   *
   * @returns A React Query mutation: call `.mutate(payload)` or `.mutateAsync(payload)` with a `RegisterEmailPayload`.
   * @throws Never throws directly — failures surface via the `onError` toast and the mutation's `error`/`isError` fields.
   */
  const useRegisterEmail = () =>
    usePost<ApiEnvelope & AuthResponse, RegisterEmailPayload>(
      AUTH_ENDPOINTS.REGISTER_EMAIL,
      {
        onSuccess: () => handleSuccess("Registered successfully!"),
        onError: (error) => handleError(error.message || "Failed to register."),
      }
    );

  /**
   * Logs an artist in by email/password. When the account has two-factor
   * authentication on, the response is a challenge (`twoFactorRequired`), not a
   * session. The caller stores the session and shows the success message.
   *
   * @returns A React Query mutation: call `.mutate(payload)` or `.mutateAsync(payload)` with a `LoginEmailPayload`.
   * @throws Never throws directly — failures surface via the `onError` toast and the mutation's `error`/`isError` fields.
   */
  const useLoginEmail = () =>
    usePost<ApiEnvelope & LoginEmailResponse, LoginEmailPayload>(AUTH_ENDPOINTS.LOGIN_EMAIL, {
      onError: (error) => handleError(error.message || "Failed to log in."),
    });

  return { useRegisterEmail, useLoginEmail };
};

export default useAuthServices;
