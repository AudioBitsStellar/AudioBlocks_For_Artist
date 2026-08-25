"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { toast } from "sonner";
import MusicLoader from "@/components/MusicLoader";
import useAuthServices from "@/services/authService";
import { RegisterEmailPayload } from "@/types";

type SignupFormValues = Omit<RegisterEmailPayload, "role">;

const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export default function SignupPage() {
  const router = useRouter();
  const { useRegisterEmail } = useAuthServices();
  const registerMutation = useRegisterEmail();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<SignupFormValues>({
    mode: "onChange",
  });

  const onSubmit = async (data: SignupFormValues) => {
    try {
      const result = await registerMutation.mutateAsync({ ...data, role: "artist" });
      Cookies.set("audioblocks_jwt", result.token);
      toast.success("Account created successfully!");
      router.push("/dashboard");
    } catch (err) {
      // onError on the mutation already toasts the message
    }
  };

  const isBusy = isSubmitting || registerMutation.isPending;
  const isSubmitDisabled = !isValid || isBusy;

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div
        className="w-full max-w-md p-8 space-y-6"
        style={{ borderRadius: "16px", background: "#161616", border: "1px solid #2A2A2A" }}
      >
        <div>
          <h1 className="text-white text-2xl font-bold">Create your artist account</h1>
          <p className="text-sm text-[#A3A3A3] mt-1">
            Join AudioBlocks to upload and manage your music.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="flex flex-col">
            <label htmlFor="signup-name" className="text-sm font-medium text-white mb-2">
              Display name <span className="text-red-500">*</span>
            </label>
            <input
              id="signup-name"
              {...register("name", {
                required: "Display name is required",
                minLength: { value: 2, message: "Display name must be at least 2 characters" },
              })}
              placeholder="Add Display name"
              maxLength={100}
              aria-invalid={errors.name ? "true" : "false"}
              aria-describedby={errors.name ? "signup-name-error" : undefined}
              className="text-white placeholder:text-[#6F6F6F] focus:outline-none px-4 h-12 rounded-2xl"
              style={{
                background: "#FFFFFF0A",
                border: errors.name ? "1px solid #EF4444" : "none",
              }}
            />
            {errors.name && (
              <span id="signup-name-error" role="alert" className="text-xs text-red-500 mt-1">
                {errors.name.message}
              </span>
            )}
          </div>

          <div className="flex flex-col">
            <label htmlFor="signup-username" className="text-sm font-medium text-white mb-2">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              id="signup-username"
              {...register("username", {
                required: "Username is required",
                minLength: { value: 3, message: "Username must be at least 3 characters" },
                pattern: {
                  value: /^[a-zA-Z0-9._-]+$/,
                  message:
                    "Username can only contain letters, numbers, dots, underscores, and hyphens",
                },
              })}
              placeholder="Add a username"
              maxLength={50}
              aria-invalid={errors.username ? "true" : "false"}
              aria-describedby={errors.username ? "signup-username-error" : undefined}
              className="text-white placeholder:text-[#6F6F6F] focus:outline-none px-4 h-12 rounded-2xl"
              style={{
                background: "#FFFFFF0A",
                border: errors.username ? "1px solid #EF4444" : "none",
              }}
            />
            {errors.username && (
              <span id="signup-username-error" role="alert" className="text-xs text-red-500 mt-1">
                {errors.username.message}
              </span>
            )}
          </div>

          <div className="flex flex-col">
            <label htmlFor="signup-email" className="text-sm font-medium text-white mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="signup-email"
              type="email"
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: EMAIL_REGEX,
                  message: "Please enter a valid email address",
                },
              })}
              placeholder="you@example.com"
              maxLength={254}
              aria-invalid={errors.email ? "true" : "false"}
              aria-describedby={errors.email ? "signup-email-error" : undefined}
              className="text-white placeholder:text-[#6F6F6F] focus:outline-none px-4 h-12 rounded-2xl"
              style={{
                background: "#FFFFFF0A",
                border: errors.email ? "1px solid #EF4444" : "none",
              }}
            />
            {errors.email && (
              <span id="signup-email-error" role="alert" className="text-xs text-red-500 mt-1">
                {errors.email.message}
              </span>
            )}
          </div>

          <div className="flex flex-col">
            <label htmlFor="signup-password" className="text-sm font-medium text-white mb-2">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              id="signup-password"
              type="password"
              {...register("password", {
                required: "Password is required",
                minLength: { value: 8, message: "Password must be at least 8 characters" },
                validate: {
                  hasLetter: (value) =>
                    /[a-zA-Z]/.test(value) || "Password must contain at least one letter",
                  hasNumberOrSpecial: (value) =>
                    /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value) ||
                    "Password must contain at least one number or special character",
                },
              })}
              placeholder="At least 8 characters with letters & numbers"
              aria-invalid={errors.password ? "true" : "false"}
              aria-describedby={errors.password ? "signup-password-error" : undefined}
              className="text-white placeholder:text-[#6F6F6F] focus:outline-none px-4 h-12 rounded-2xl"
              style={{
                background: "#FFFFFF0A",
                border: errors.password ? "1px solid #EF4444" : "none",
              }}
            />
            {errors.password && (
              <span id="signup-password-error" role="alert" className="text-xs text-red-500 mt-1">
                {errors.password.message}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitDisabled}
            className={`${
              isSubmitDisabled
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer hover:bg-[#B8043F]"
            } w-full rounded-lg bg-[#D2045B] text-white font-semibold px-6 py-3 transition-colors`}
          >
            {isBusy ? <MusicLoader small /> : "Sign up"}
          </button>
        </form>

        <p className="text-sm text-[#A3A3A3] text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-[#D2045B] hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
