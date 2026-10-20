/**
 * Tests for artist Privy signup page (#625)
 *
 * Verifies that:
 * - Privy authentication exchanges access token for backend session
 * - Backend token is stored correctly (audioblocks_jwt cookie + localStorage)
 * - React Query cache is cleared on login
 * - Routing is correct (onboarding for new, dashboard for returning)
 * - Error handling for non-artist accounts (403) works
 */

import { render, screen, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import Cookies from "js-cookie";
import ArtistSignupPage from "@/app/artist-portal/signup/page";
import * as authService from "@/services/authService";
import * as queryClientInstance from "@/api/queryClientInstance";
import { usePost } from "@/api/queryClient";

// Mock dependencies
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@privy-io/react-auth", () => ({
  usePrivy: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("js-cookie", () => ({
  set: jest.fn(),
  get: jest.fn(),
  remove: jest.fn(),
}));

jest.mock("@/services/authService", () => ({
  storeToken: jest.fn(),
}));

jest.mock("@/api/queryClientInstance", () => ({
  clearQueryCache: jest.fn(),
}));

jest.mock("@/api/queryClient", () => ({
  usePost: jest.fn(),
}));

describe("Artist Portal Signup Page - Privy Integration", () => {
  let mockRouter: any;
  let mockPrivy: any;
  let mockMutation: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup router mock
    mockRouter = { push: jest.fn() };
    (useRouter as jest.Mock).mockReturnValue(mockRouter);

    // Setup mutation mock
    mockMutation = {
      mutate: jest.fn(),
    };
    (usePost as jest.Mock).mockReturnValue(mockMutation);
  });

  it("renders signup form when Privy is not authenticated", () => {
    mockPrivy = {
      ready: true,
      authenticated: false,
      login: jest.fn(),
      user: null,
      getAccessToken: jest.fn(),
      logout: jest.fn(),
    };
    (usePrivy as jest.Mock).mockReturnValue(mockPrivy);

    render(<ArtistSignupPage />);

    expect(screen.getByText("Join AudioBlocks")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign up as Artist/i })).toBeInTheDocument();
  });

  it("shows loading state when Privy is not ready", () => {
    mockPrivy = {
      ready: false,
      authenticated: false,
      login: jest.fn(),
      user: null,
      getAccessToken: jest.fn(),
      logout: jest.fn(),
    };
    (usePrivy as jest.Mock).mockReturnValue(mockPrivy);

    render(<ArtistSignupPage />);

    // Should render loader component (or at least the loader container)
    expect(screen.getByRole("presentation", { hidden: true })).toBeInTheDocument();
  });

  it("exchanges Privy access token for backend session when authenticated", async () => {
    const mockAccessToken = "privy_access_token_123";
    const mockBackendToken = "backend_jwt_token_456";

    mockPrivy = {
      ready: true,
      authenticated: true,
      login: jest.fn(),
      user: { id: "privy_user_123" },
      getAccessToken: jest.fn().mockResolvedValue(mockAccessToken),
      logout: jest.fn(),
    };
    (usePrivy as jest.Mock).mockReturnValue(mockPrivy);

    // Mock the mutation to call onSuccess
    mockMutation.mutate.mockImplementation((data: any, options: any) => {
      expect(data.accessToken).toBe(mockAccessToken);
      // Simulate success
      options?.onSuccess?.(
        { user: { id: "artist_123", username: "testartist" }, token: mockBackendToken },
        data
      );
    });

    render(<ArtistSignupPage />);

    await waitFor(() => {
      expect(mockMutation.mutate).toHaveBeenCalledWith(
        { accessToken: mockAccessToken },
        expect.any(Object)
      );
    });

    // Verify token storage
    expect(Cookies.set).toHaveBeenCalledWith("audioblocks_jwt", mockBackendToken);
    expect(authService.storeToken).toHaveBeenCalledWith(mockBackendToken);

    // Verify cache cleared
    expect(queryClientInstance.clearQueryCache).toHaveBeenCalled();

    // Verify routing to dashboard (existing artist)
    expect(mockRouter.push).toHaveBeenCalledWith("/dashboard");
  });

  it("routes to onboarding for new artists", async () => {
    const mockAccessToken = "privy_access_token_123";
    const mockBackendToken = "backend_jwt_token_456";

    mockPrivy = {
      ready: true,
      authenticated: true,
      login: jest.fn(),
      user: { id: "privy_user_123" },
      getAccessToken: jest.fn().mockResolvedValue(mockAccessToken),
      logout: jest.fn(),
    };
    (usePrivy as jest.Mock).mockReturnValue(mockPrivy);

    mockMutation.mutate.mockImplementation((data: any, options: any) => {
      // Simulate success for new artist (no username)
      options?.onSuccess?.(
        { user: { id: "artist_new", username: undefined }, token: mockBackendToken },
        data
      );
    });

    render(<ArtistSignupPage />);

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith("/onboarding");
    });
  });

  it("handles 403 error for non-artist accounts", async () => {
    const mockAccessToken = "privy_access_token_123";

    mockPrivy = {
      ready: true,
      authenticated: true,
      login: jest.fn(),
      user: { id: "privy_user_123" },
      getAccessToken: jest.fn().mockResolvedValue(mockAccessToken),
      logout: jest.fn(),
    };
    (usePrivy as jest.Mock).mockReturnValue(mockPrivy);

    mockMutation.mutate.mockImplementation((data: any, options: any) => {
      const error = new Error("Forbidden");
      (error as any).status = 403;
      options?.onError?.(error);
    });

    render(<ArtistSignupPage />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Your Privy account is not registered as an artist. Please sign up as an artist."
      );
      expect(mockPrivy.logout).toHaveBeenCalled();
    });
  });

  it("handles general errors with fallback message", async () => {
    const mockAccessToken = "privy_access_token_123";

    mockPrivy = {
      ready: true,
      authenticated: true,
      login: jest.fn(),
      user: { id: "privy_user_123" },
      getAccessToken: jest.fn().mockResolvedValue(mockAccessToken),
      logout: jest.fn(),
    };
    (usePrivy as jest.Mock).mockReturnValue(mockPrivy);

    mockMutation.mutate.mockImplementation((data: any, options: any) => {
      const error = new Error("Network error");
      (error as any).status = 500;
      options?.onError?.(error);
    });

    render(<ArtistSignupPage />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to complete artist signup. Please try again."
      );
      expect(mockPrivy.logout).toHaveBeenCalled();
    });
  });

  it("disables button while exchanging token", async () => {
    const mockAccessToken = "privy_access_token_123";

    mockPrivy = {
      ready: true,
      authenticated: true,
      login: jest.fn(),
      user: { id: "privy_user_123" },
      getAccessToken: jest.fn().mockResolvedValue(mockAccessToken),
      logout: jest.fn(),
    };
    (usePrivy as jest.Mock).mockReturnValue(mockPrivy);

    // Mutation resolves after a delay
    mockMutation.mutate.mockImplementation((data: any, options: any) => {
      setTimeout(() => {
        options?.onSuccess?.({ user: { id: "artist_123" }, token: "token" }, data);
      }, 100);
    });

    render(<ArtistSignupPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Signing up/i })).toBeDisabled();
    });
  });

  it("handles missing Privy access token", async () => {
    mockPrivy = {
      ready: true,
      authenticated: true,
      login: jest.fn(),
      user: { id: "privy_user_123" },
      getAccessToken: jest.fn().mockResolvedValue(null),
      logout: jest.fn(),
    };
    (usePrivy as jest.Mock).mockReturnValue(mockPrivy);

    render(<ArtistSignupPage />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to get Privy access token");
      expect(mockPrivy.logout).toHaveBeenCalled();
    });
  });
});
