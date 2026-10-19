import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const { replace, push, verifyEmailTokenMock, invalidateQueries, emailState, refetch } = vi.hoisted(
  () => ({
    replace: vi.fn(),
    push: vi.fn(),
    verifyEmailTokenMock: vi.fn(),
    invalidateQueries: vi.fn(async () => undefined),
    emailState: { emailVerified: false as boolean | undefined },
    refetch: vi.fn(async () => ({ isError: false, data: undefined })),
  })
);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push }),
  useParams: () => ({ token: "link-token" }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries }),
}));

vi.mock("@/services/emailVerificationService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/emailVerificationService")>();
  return { ...actual, verifyEmailToken: verifyEmailTokenMock };
});

vi.mock("@/hooks/useEmailVerification", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useEmailVerification")>();
  return {
    ...actual,
    useEmailVerification: () => ({
      emailVerified: emailState.emailVerified,
      requiresVerification: emailState.emailVerified === false,
      isLoading: false,
      isError: false,
      refetch,
    }),
  };
});

vi.mock("@/hooks/useHasHydrated", () => ({ useHasHydrated: () => true }));

vi.mock("@/utils/jwt", () => ({ getEmailFromToken: () => "artist@example.com" }));

vi.mock("@/api/session", () => ({ endSession: vi.fn(async () => undefined) }));

import VerifyEmailPage from "@/app/verify-email/page";
import VerifyEmailTokenPage from "@/app/verify-email/[token]/page";
import EmailVerificationGate from "@/components/EmailVerificationGate";

describe("verify-email check-inbox step (#519)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    emailState.emailVerified = false;
  });

  it("tells the artist which address the link went to", () => {
    render(<VerifyEmailPage />);

    expect(screen.getByRole("heading", { name: /check your inbox/i })).toBeInTheDocument();
    expect(screen.getByText("artist@example.com")).toBeInTheDocument();
  });

  it("sends the artist on once the backend reports the email as verified", () => {
    emailState.emailVerified = true;
    render(<VerifyEmailPage />);

    expect(replace).toHaveBeenCalledWith("/dashboard/overview");
  });
});

describe("verify-email link step (#519)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("consumes the token and shows success", async () => {
    verifyEmailTokenMock.mockResolvedValueOnce({ ok: true });
    render(<VerifyEmailTokenPage />);

    expect(
      await screen.findByRole("heading", { name: /your email is verified/i })
    ).toBeInTheDocument();
    expect(verifyEmailTokenMock).toHaveBeenCalledTimes(1);
    expect(verifyEmailTokenMock).toHaveBeenCalledWith("link-token");
    expect(invalidateQueries).toHaveBeenCalled();
  });

  it("explains an invalid or expired link", async () => {
    verifyEmailTokenMock.mockResolvedValueOnce({ ok: false, reason: "invalid_or_expired" });
    render(<VerifyEmailTokenPage />);

    expect(
      await screen.findByRole("heading", { name: /this link can.t be used/i })
    ).toBeInTheDocument();
  });

  it("offers a retry when the backend is unavailable", async () => {
    verifyEmailTokenMock.mockResolvedValueOnce({ ok: false, reason: "unavailable" });
    render(<VerifyEmailTokenPage />);

    expect(await screen.findByRole("button", { name: /try again/i })).toBeInTheDocument();
  });
});

describe("EmailVerificationGate (#519)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("holds an unverified artist off the dashboard", async () => {
    emailState.emailVerified = false;
    render(
      <EmailVerificationGate>
        <p>dashboard content</p>
      </EmailVerificationGate>
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/verify-email"));
    expect(screen.queryByText("dashboard content")).not.toBeInTheDocument();
  });

  it("lets a verified artist through", () => {
    emailState.emailVerified = true;
    render(
      <EmailVerificationGate>
        <p>dashboard content</p>
      </EmailVerificationGate>
    );

    expect(screen.getByText("dashboard content")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
