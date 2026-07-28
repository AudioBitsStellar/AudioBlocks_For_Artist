"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { toast } from "sonner";
import MusicLoader from "@/components/MusicLoader";
import useAuthServices from "@/services/authService";
import { LoginEmailPayload } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const { useLoginEmail } = useAuthServices();
  const loginMutation = useLoginEmail();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginEmailPayload>();

  const onSubmit = async (data: LoginEmailPayload) => {
    try {
      const result = await loginMutation.mutateAsync(data);
      Cookies.set("audioblocks_jwt", result.token);
      toast.success("Logged in successfully!");
      router.push("/dashboard");
    } catch (err) {
      // onError on the mutation already toasts the message
    }
  };

  const isBusy = isSubmitting || loginMutation.isPending;

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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex flex-col">
            <label htmlFor="login-email" className="text-sm font-medium text-white mb-2">Email</label>
            <input
              id="login-email"
              type="email"
              {...register("email", { required: "Email is required" })}
              placeholder="you@example.com"
              maxLength={254}
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby={errors.email ? 'login-email-error' : undefined}
              className="text-white placeholder:text-[#6F6F6F] focus:outline-none px-4 h-12 rounded-2xl"
              style={{ background: "#FFFFFF0A", border: "none" }}
            />
            {errors.email && (
              <span id="login-email-error" role="alert" className="text-xs text-red-500 mt-1">{errors.email.message}</span>
            )}
          </div>

          <div className="flex flex-col">
            <label htmlFor="login-password" className="text-sm font-medium text-white mb-2">Password</label>
            <input
              id="login-password"
              type="password"
              {...register("password", { required: "Password is required" })}
              placeholder="••••••••"
              aria-invalid={errors.password ? 'true' : 'false'}
              aria-describedby={errors.password ? 'login-password-error' : undefined}
              className="text-white placeholder:text-[#6F6F6F] focus:outline-none px-4 h-12 rounded-2xl"
              style={{ background: "#FFFFFF0A", border: "none" }}
            />
            {errors.password && (
              <span id="login-password-error" role="alert" className="text-xs text-red-500 mt-1">{errors.password.message}</span>
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
      </div>
    </div>
  );
}
