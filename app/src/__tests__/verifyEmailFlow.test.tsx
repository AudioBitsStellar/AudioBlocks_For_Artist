import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VerifyEmailPage from "@/app/verify-email/page";
import EmailVerificationGate from "@/components/EmailVerificationGate";
import {
  getEmailVerificationStatus,
  startVerification,
  verifyEmailCode,
} from "@/services/emailVerificationService";

const replace = vi.fn();
const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace, prefetch: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

/** Issues a code and fails loudly if the service refused. */
function issue(email = "artist@example.com"): string {
  const result = startVerification(email);
  if (!result.ok) throw new Error(`issuance failed: ${result.error}`);
  return result.code;
}

/** Types a code into the split boxes one digit at a time. */
async function typeCode(code: string, via: "user" | "event") {
  const boxes = Array.from(
    document.querySelectorAll<HTMLInputElement>('input[inputmode="numeric"]')
  );
  if (boxes.length !== code.length) throw new Error(`expected ${code.length} boxes`);
  for (let index = 0; index < code.length; index += 1) {
    if (via === "user") await userEvent.type(boxes[index], code[index]);
    else fireEvent.change(boxes[index], { target: { value: code[index] } });
  }
}

function codeBoxes(): HTMLElement[] {
  return Array.from(document.querySelectorAll('input[inputmode="numeric"]'));
}

describe("Verify email step (#459)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("asks for an address when no code has been issued", () => {
    render(<VerifyEmailPage />);

    expect(screen.getByRole("heading", { name: /verify your email/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send code/i })).toBeInTheDocument();
  });

  it("refuses an invalid address without issuing a code", async () => {
    render(<VerifyEmailPage />);

    await userEvent.type(screen.getByLabelText(/^email/i), "not-an-email");
    await userEvent.click(screen.getByRole("button", { name: /send code/i }));

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(getEmailVerificationStatus()).toBe("unverified");
  });

  it("issues a code, shows the pending step, and reveals it for mocked delivery", async () => {
    render(<VerifyEmailPage />);

    await userEvent.type(screen.getByLabelText(/^email/i), "artist@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send code/i }));

    expect(await screen.findByRole("heading", { name: /confirm your email/i })).toBeInTheDocument();
    expect(codeBoxes()).toHaveLength(6);
    expect(screen.getByText("artist@example.com")).toBeInTheDocument();
    expect(screen.getByText(/no email backend yet/i).textContent).toMatch(/\d{6}/);
  });

  it("verifies the correct code and sends the artist to the dashboard", async () => {
    const code = issue();
    render(<VerifyEmailPage />);

    await typeCode(code, "user");

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard/overview"));
    expect(getEmailVerificationStatus()).toBe("verified");
  });

  it("reports a wrong code and counts the attempt down", async () => {
    const code = issue();
    render(<VerifyEmailPage />);

    await typeCode(code === "111111" ? "222222" : "111111", "event");
    fireEvent.click(screen.getByRole("button", { name: /verify email/i }));

    expect(await screen.findByText(/that code isn/i)).toBeInTheDocument();
    expect(screen.getByTestId("attempts-left")).toHaveTextContent("4 attempts left");
    expect(getEmailVerificationStatus()).toBe("pending");
    expect(replace).not.toHaveBeenCalled();
  });

  it("holds the resend button until the cooldown has run out", () => {
    issue();
    render(<VerifyEmailPage />);

    expect(screen.getByRole("button", { name: /resend code in \d+s/i })).toBeDisabled();
  });

  it("returns to the address step without abandoning the outstanding code", async () => {
    issue();
    render(<VerifyEmailPage />);

    await userEvent.click(screen.getByRole("button", { name: /use another address/i }));

    expect(screen.getByRole("button", { name: /send code/i })).toBeInTheDocument();
    expect(getEmailVerificationStatus()).toBe("pending");
  });

  it("redirects an already-verified artist away from the step", async () => {
    verifyEmailCode(issue());
    expect(getEmailVerificationStatus()).toBe("verified");

    render(<VerifyEmailPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard/overview"));
    expect(codeBoxes()).toHaveLength(0);
  });
});

describe("Dashboard gate (#459)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders the dashboard for an account with no verification record", async () => {
    render(
      <EmailVerificationGate>
        <p>dashboard content</p>
      </EmailVerificationGate>
    );

    expect(await screen.findByText("dashboard content")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("renders the dashboard once the address is verified", async () => {
    verifyEmailCode(issue());

    render(
      <EmailVerificationGate>
        <p>dashboard content</p>
      </EmailVerificationGate>
    );

    expect(await screen.findByText("dashboard content")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("withholds the dashboard and redirects while a code is outstanding", () => {
    issue();

    const { container } = render(
      <EmailVerificationGate>
        <p>dashboard content</p>
      </EmailVerificationGate>
    );

    expect(container).toBeEmptyDOMElement();
    expect(replace).toHaveBeenCalledWith("/verify-email");
  });
});
