"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import MusicLoader from "@/components/MusicLoader";
import { usePost } from "@/api/queryClient";
import { AUTH_ENDPOINTS } from "@/api/api-endpoint";
import { AuthResponse } from "@/types";
import { storeToken } from "@/services/authService";
import { clearQueryCache } from "@/api/queryClientInstance";
import Cookies from "js-cookie";
import { toast } from "sonner";

interface PrivyLoginRequest {
  accessToken: string;
}

export default function ArtistSignupPage() {
  const router = useRouter();
  const { ready, authenticated, login, user, getAccessToken, logout } = usePrivy();
  const [isExchangingToken, setIsExchangingToken] = useState(false);

  const privyLoginMutation = usePost<AuthResponse, PrivyLoginRequest>(
    AUTH_ENDPOINTS.PRIVY_LOGIN,
    {
      onSuccess: (data) => {
        // Store the backend token
        Cookies.set("audioblocks_jwt", data.token);
        storeToken(data.token);

        // Clear React Query cache to ensure fresh data for new session
        clearQueryCache();

        // Route based on verification status or user setup status
        // For now, we'll check if it's a new artist (no profile data yet)
        const isNewArtist = !data.user.username;

        if (isNewArtist) {
          router.push("/onboarding");
        } else {
          router.push("/dashboard");
        }
      },
      onError: (error) => {
        setIsExchangingToken(false);
        // Check if it's a 403 (non-artist account)
        const apiError = error as any;
        if (apiError?.status === 403) {
          toast.error(
            "Your Privy account is not registered as an artist. Please sign up as an artist."
          );
          logout();
        } else {
          toast.error("Failed to complete artist signup. Please try again.");
          logout();
        }
      },
    }
  );

  useEffect(() => {
    // If already authenticated and ready, exchange the Privy token for backend session
    if (ready && authenticated && user && !isExchangingToken) {
      const exchangeToken = async () => {
        setIsExchangingToken(true);
        try {
          const accessToken = await getAccessToken();
          if (accessToken) {
            privyLoginMutation.mutate({ accessToken });
          } else {
            toast.error("Failed to get Privy access token");
            logout();
          }
        } catch (err) {
          toast.error("Failed to authenticate with Privy");
          logout();
        } finally {
          setIsExchangingToken(false);
        }
      };

      exchangeToken();
    }
  }, [ready, authenticated, user, isExchangingToken, getAccessToken, logout, privyLoginMutation]);

  const handleLogin = () => {
    login();
  };

  if (!ready || (authenticated && isExchangingToken)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <MusicLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4 py-8">
      <div className="w-full max-w-lg">
        <Link
          href="/artist-portal"
          className="inline-flex items-center gap-2 text-[#A3A3A3] hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Artist Portal
        </Link>

        <div
          className="w-full p-8 space-y-6"
          style={{ borderRadius: "16px", background: "#161616", border: "1px solid #2A2A2A" }}
        >
          <div className="text-center space-y-2">
            <h1 className="text-white text-3xl font-bold">Join AudioBlocks</h1>
            <p className="text-sm text-[#A3A3A3]">
              Sign up with your email, wallet, or social account to get started
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleLogin}
              type="button"
              disabled={isExchangingToken}
              className="w-full rounded-lg bg-[#D2045B] hover:bg-[#B8043F] text-white font-semibold px-6 py-4 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExchangingToken ? "Signing up..." : "Sign up as Artist"}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#2A2A2A]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#161616] text-[#6F6F6F]">
                  Secure authentication powered by Privy
                </span>
              </div>
            </div>

            <div className="space-y-3 text-sm text-[#A3A3A3]">
              <p className="flex items-start gap-2">
                <span className="text-[#D2045B] mt-1">✓</span>
                <span>Connect with email, wallet, or social login</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-[#D2045B] mt-1">✓</span>
                <span>Automatic embedded wallet creation</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-[#D2045B] mt-1">✓</span>
                <span>Start minting and earning immediately</span>
              </p>
            </div>
          </div>

          <p className="text-sm text-[#A3A3A3] text-center">
            Already have an account?{" "}
            <button onClick={handleLogin} className="text-[#D2045B] hover:underline cursor-pointer">
              Log in
            </button>
          </p>
        </div>

        <div className="mt-6 text-center text-xs text-[#6F6F6F]">
          By signing up, you agree to our Terms of Service and Privacy Policy
        </div>
      </div>
    </div>
  );
}
