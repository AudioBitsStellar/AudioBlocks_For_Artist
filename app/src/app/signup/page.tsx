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

export default function SignupPage() {
  const router = useRouter();
  const { useRegisterEmail } = useAuthServices();
  const registerMutation = useRegisterEmail();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>();

  // This app is the artist dashboard, so every signup here is an artist account.
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div
        className="w-full max-w-md p-8 space-y-6"
        style={{ borderRadius: "16px", background: "#161616", border: "1px solid #2A2A2A" }}
      >
        <div>
          <h1 className="text-white text-2xl font-bold">Create your artist account</h1>
          <p className="text-sm text-[#A3A3A3] mt-1">Join AudioBlocks to upload and manage your music.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-white mb-2">Display name</label>
            <input
              {...register("name")}
              placeholder="Add Display name"
              className="text-white placeholder:text-[#6F6F6F] focus:outline-none px-4 h-12 rounded-2xl"
              style={{ background: "#FFFFFF0A", border: "none" }}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-white mb-2">Username</label>
            <input
              {...register("username")}
              placeholder="Add a username"
              className="text-white placeholder:text-[#6F6F6F] focus:outline-none px-4 h-12 rounded-2xl"
              style={{ background: "#FFFFFF0A", border: "none" }}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-white mb-2">Email</label>
            <input
              type="email"
              {...register("email", { required: "Email is required" })}
              placeholder="you@example.com"
              className="text-white placeholder:text-[#6F6F6F] focus:outline-none px-4 h-12 rounded-2xl"
              style={{ background: "#FFFFFF0A", border: "none" }}
            />
            {errors.email && (
              <span className="text-xs text-red-500 mt-1">{errors.email.message}</span>
            )}
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-white mb-2">Password</label>
            <input
              type="password"
              {...register("password", {
                required: "Password is required",
                minLength: { value: 8, message: "Password must be at least 8 characters" },
              })}
              placeholder="At least 8 characters"
              className="text-white placeholder:text-[#6F6F6F] focus:outline-none px-4 h-12 rounded-2xl"
              style={{ background: "#FFFFFF0A", border: "none" }}
            />
            {errors.password && (
              <span className="text-xs text-red-500 mt-1">{errors.password.message}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={isBusy}
            className={`${isBusy ? "opacity-70 cursor-not-allowed" : ""} w-full rounded-lg cursor-pointer bg-[#D2045B] hover:bg-[#B8043F] text-white font-semibold px-6 py-3 transition-colors`}
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
