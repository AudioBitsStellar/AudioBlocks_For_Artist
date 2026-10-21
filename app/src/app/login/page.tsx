"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import MusicLoader from "@/components/MusicLoader";
import OtpInput from "@/components/shared/OtpInput";
import { clearQueryCache } from "@/api/queryClientInstance";
import { establishSession } from "@/api/session";
import useAuthServices from "@/services/authService";
import { isEmailUnverified } from "@/services/emailVerificationService";
import { completeTwoFactorLogin } from "@/services/securitySettingsService";
import { AuthUser, LoginEmailPayload } from "@/types";
import { loginFormSchema } from "@/types/formValidation";

/** A login that reached the second factor. The credentials are kept to retry with a recovery code. */
interface TwoFactorChallenge {
  partialToken: string;
  credentials: LoginEmailPayload;
}

const TOTP_LENGTH = 6;

export default function LoginPage() {
  const router = useRouter();
  const { useLoginEmail } = useAuthServices();
  const loginMutation = useLoginEmail();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginEmailPayload>({ resolver: zodResolver(loginFormSchema) });

  const [challenge, setChallenge] = useState<TwoFactorChallenge | null>(null);
  const [useRecovery, setUseRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  /**
   * Moves the session into httpOnly cookies, then sends the artist on. An
   * account whose email is still unverified goes to the check-inbox step (#519).
   */
  const finishLogin = async (
    session: { token: string; refreshToken?: string },
    user: AuthUser | undefined,
    hasTwoFactor: boolean
  ) => {
    // Never let a previous artist's cached dashboard data outlive their session.
    clearQueryCache();
    const stored = await establishSession({
      token: session.token,
      refreshToken: session.refreshToken,
      twoFactorEnabled: hasTwoFactor,
    });
    if (!stored) {
      toast.error("We couldn't start your session. Please try again.");
      return;
    }
    toast.success("Logged in successfully!");
    router.push(isEmailUnverified(user?.emailVerified) ? "/verify-email" : "/dashboard");
  };

  const onSubmit = async (data: LoginEmailPayload) => {
    try {
      const result = await loginMutation.mutateAsync(data);
      if (result.twoFactorRequired && result.partialToken) {
        setChallenge({ partialToken: result.partialToken, credentials: data });
        setUseRecovery(false);
        setOtp("");
        setRecoveryCode("");
        return;
      }
      if (!result.token) return;
      await finishLogin(
        { token: result.token, refreshToken: result.refreshToken },
        result.user,
        Boolean(result.user?.twoFactorEnabled)
      );
    } catch (err) {
      // onError on the mutation already toasts the message
    }
  };

  /** Completes a challenge with an authenticator code (#518). */
  const submitAuthenticatorCode = async (code: string) => {
    if (!challenge || isVerifying) return;
    setIsVerifying(true);
    try {
      const session = await completeTwoFactorLogin(challenge.partialToken, code);
      await finishLogin(session, undefined, true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That code wasn't accepted.");
      setOtp("");
    } finally {
      setIsVerifying(false);
    }
  };

  /**
   * Completes a challenge with a recovery code. The backend takes it on the
   * login request itself, so the credentials are sent again.
   */
  const submitRecoveryCode = async (event: FormEvent) => {
    event.preventDefault();
    if (!challenge || isVerifying || !recoveryCode.trim()) return;
    setIsVerifying(true);
    try {
      const result = await loginMutation.mutateAsync({
        ...challenge.credentials,
        recoveryCode: recoveryCode.trim(),
      });
      if (result.token) {
        await finishLogin(
          { token: result.token, refreshToken: result.refreshToken },
          result.user,
          true
        );
      }
    } catch (err) {
      // onError on the mutation already toasts the message
      setRecoveryCode("");
    } finally {
      setIsVerifying(false);
    }
  };

  const isBusy = isSubmitting || loginMutation.isPending || isVerifying;

  if (challenge) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <div
          className="w-full max-w-md p-8 space-y-6"
          style={{ borderRadius: "16px", background: "#161616", border: "1px solid #2A2A2A" }}
        >
          <div>
            <h1 className="text-white text-2xl font-bold">Two-factor authentication</h1>
            <p className="text-sm text-[#A3A3A3] mt-1">
              {useRecovery
                ? "Enter one of the recovery codes you saved. Each code works once."
                : "Enter the 6-digit code from your authenticator app."}
            </p>
          </div>

          {useRecovery ? (
            <form onSubmit={submitRecoveryCode} className="space-y-4" noValidate>
              <div className="flex flex-col">
                <label htmlFor="login-recovery-code" className="text-sm font-medium text-white mb-2">
                  Recovery code
                </label>
                <input
                  id="login-recovery-code"
                  value={recoveryCode}
                  onChange={(event) => setRecoveryCode(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono text-white placeholder:text-[#6F6F6F] focus:outline-none px-4 h-12 rounded-2xl"
                  style={{ background: "#FFFFFF0A", border: "none" }}
                />
              </div>
              <button
                type="submit"
                disabled={isBusy || !recoveryCode.trim()}
                className="w-full rounded-lg bg-[#D2045B] hover:bg-[#B8043F] text-white font-semibold px-6 py-3 transition-colors disabled:opacity-60"
              >
                {isBusy ? <MusicLoader small /> : "Verify and log in"}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <OtpInput
                name="login-otp"
                value={otp}
                onChange={setOtp}
                onComplete={submitAuthenticatorCode}
                disabled={isBusy}
                length={TOTP_LENGTH}
                autoFocus
              />
              <button
                type="button"
                onClick={() => submitAuthenticatorCode(otp)}
                disabled={isBusy || otp.length !== TOTP_LENGTH}
                className="w-full rounded-lg bg-[#D2045B] hover:bg-[#B8043F] text-white font-semibold px-6 py-3 transition-colors disabled:opacity-60"
              >
                {isBusy ? <MusicLoader small /> : "Verify and log in"}
              </button>
            </div>
          )}

          <div className="flex flex-col items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => {
                setUseRecovery((current) => !current);
                setOtp("");
                setRecoveryCode("");
              }}
              className="text-[#D2045B] hover:underline"
            >
              {useRecovery ? "Use an authenticator code" : "Use a recovery code instead"}
            </button>
            <button
              type="button"
              onClick={() => setChallenge(null)}
              className="text-[#A3A3A3] hover:text-white"
            >
              Back to log in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div
        className="w-full max-w-md p-8 space-y-6"
        style={{ borderRadius: "16px", background: "#161616", border: "1px solid #2A2A2A" }}
      >
        <div>
          <h1 className="text-white text-2xl font-bold">Log in</h1>
          <p className="text-sm text-[#A3A3A3] mt-1">Welcome back to AudioBlocks.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="flex flex-col">
            <label htmlFor="login-email" className="text-sm font-medium text-white mb-2">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              {...register("email")}
              placeholder="you@example.com"
              maxLength={254}
              aria-invalid={errors.email ? "true" : "false"}
              aria-describedby={errors.email ? "login-email-error" : undefined}
              className="text-white placeholder:text-[#6F6F6F] focus:outline-none px-4 h-12 rounded-2xl"
              style={{ background: "#FFFFFF0A", border: "none" }}
            />
            {errors.email && (
              <span id="login-email-error" role="alert" className="text-xs text-red-500 mt-1">
                {errors.email.message}
              </span>
            )}
          </div>

          <div className="flex flex-col">
            <label htmlFor="login-password" className="text-sm font-medium text-white mb-2">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              {...register("password")}
              placeholder="••••••••"
              aria-invalid={errors.password ? "true" : "false"}
              aria-describedby={errors.password ? "login-password-error" : undefined}
              className="text-white placeholder:text-[#6F6F6F] focus:outline-none px-4 h-12 rounded-2xl"
              style={{ background: "#FFFFFF0A", border: "none" }}
            />
            {errors.password && (
              <span id="login-password-error" role="alert" className="text-xs text-red-500 mt-1">
                {errors.password.message}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isBusy}
            className={`${isBusy ? "opacity-70 cursor-not-allowed" : ""} w-full rounded-lg cursor-pointer bg-[#D2045B] hover:bg-[#B8043F] text-white font-semibold px-6 py-3 transition-colors`}
          >
            {isBusy ? <MusicLoader small /> : "Log in"}
          </button>
        </form>

        <p className="text-sm text-[#A3A3A3] text-center">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-[#D2045B] hover:underline">
            Sign up
          </Link>
        </p>

        <p className="text-xs text-[#6F6F6F] text-center pt-2">
          Artists?{" "}
          <Link href="/artist-portal" className="text-[#885FA8] hover:underline">
            Check out our Artist Portal
          </Link>
        </p>
      </div>
    </div>
  );
}
