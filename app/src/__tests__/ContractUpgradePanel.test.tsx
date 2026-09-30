import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ContractUpgradePanel from "@/components/ContractUpgradePanel";

// ── Module mocks ─────────────────────────────────────────────────────────────

const { mockUsePost, mockUseGet, mockHandleSuccess, mockHandleError } = vi.hoisted(() => ({
  mockUsePost: vi.fn(),
  mockUseGet: vi.fn(),
  mockHandleSuccess: vi.fn(),
  mockHandleError: vi.fn(),
}));

vi.mock("@/api/queryClient", () => ({
  usePost: mockUsePost,
  useGet: mockUseGet,
}));

vi.mock("@/hooks/useToastHandler", () => ({
  useHandleSuccess: () => mockHandleSuccess,
  useHandleError: () => mockHandleError,
}));

// ── Constants ────────────────────────────────────────────────────────────────

const VALID_CONTRACT_ID = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const VALID_ADMIN = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const VALID_WASM_HASH = "a1b2c3d4e5f67890123456789012345678901234567890123456789012345678";

function buildDefaultMocks() {
  mockUsePost.mockReturnValue({ mutateAsync: vi.fn() });
  mockUseGet.mockReturnValue({ data: null, isLoading: false });
}

function renderPanel(onSign = vi.fn()) {
  return render(
    <ContractUpgradePanel
      contractId={VALID_CONTRACT_ID}
      adminAddress={VALID_ADMIN}
      onSign={onSign}
    />
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ContractUpgradePanel (#295)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildDefaultMocks();
  });

  it("renders the heading and WASM hash input", () => {
    renderPanel();

    expect(screen.getByRole("heading", { name: /soroban contract upgrade/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/new wasm hash/i)).toBeInTheDocument();
  });

  it("disables the Upgrade button when the WASM hash field is empty", () => {
    renderPanel();

    const button = screen.getByRole("button", { name: /upgrade contract/i });
    expect(button).toBeDisabled();
  });

  it("enables the Upgrade button once a non-empty WASM hash is entered", () => {
    renderPanel();

    fireEvent.change(screen.getByLabelText(/new wasm hash/i), {
      target: { value: VALID_WASM_HASH },
    });

    expect(screen.getByRole("button", { name: /upgrade contract/i })).not.toBeDisabled();
  });

  it("shows validation errors for an invalid WASM hash on submit", async () => {
    renderPanel();

    fireEvent.change(screen.getByLabelText(/new wasm hash/i), {
      target: { value: "not-a-valid-hash" },
    });
    fireEvent.click(screen.getByRole("button", { name: /upgrade contract/i }));

    const errors = await screen.findByRole("alert");
    expect(errors.textContent).toMatch(/invalid wasm hash/i);
  });

  it("shows validation error when WASM hash matches current deployed hash", async () => {
    // Simulate contract info returning a current WASM hash
    mockUseGet.mockReturnValue({
      data: { data: { wasmHash: VALID_WASM_HASH } },
      isLoading: false,
    });

    renderPanel();

    fireEvent.change(screen.getByLabelText(/new wasm hash/i), {
      target: { value: VALID_WASM_HASH },
    });
    fireEvent.click(screen.getByRole("button", { name: /upgrade contract/i }));

    const errors = await screen.findByRole("alert");
    expect(errors.textContent).toMatch(/identical/i);
  });

  it("calls prepare → onSign → submit in sequence on a valid submission", async () => {
    const mockPrepareMutate = vi.fn().mockResolvedValue({
      data: { xdr: "stub_xdr", networkPassphrase: "Test SDF Network ; September 2015" },
    });
    const mockSubmitMutate = vi.fn().mockResolvedValue({
      data: { txHash: "abc123txhash" },
    });

    mockUsePost.mockImplementation((endpoint: string) => {
      if (endpoint?.includes("prepare")) {
        return { mutateAsync: mockPrepareMutate };
      }
      return { mutateAsync: mockSubmitMutate };
    });

    const onSign = vi.fn().mockResolvedValue("signed_stub_xdr");
    renderPanel(onSign);

    fireEvent.change(screen.getByLabelText(/new wasm hash/i), {
      target: { value: VALID_WASM_HASH },
    });
    fireEvent.click(screen.getByRole("button", { name: /upgrade contract/i }));

    // Both mutateAsync calls should have fired (prepare + submit)
    await vi.waitFor(() => {
      expect(mockPrepareMutate).toHaveBeenCalledTimes(1);
      expect(mockSubmitMutate).toHaveBeenCalledTimes(1);
    });
    expect(onSign).toHaveBeenCalledWith(
      "stub_xdr",
      expect.objectContaining({ networkPassphrase: expect.any(String) })
    );
  });

  it("shows a Reset button after an error and resets state on click", async () => {
    renderPanel();

    fireEvent.change(screen.getByLabelText(/new wasm hash/i), {
      target: { value: "too-short" },
    });
    fireEvent.click(screen.getByRole("button", { name: /upgrade contract/i }));

    const reset = await screen.findByRole("button", { name: /reset/i });
    fireEvent.click(reset);

    expect(screen.getByRole("button", { name: /upgrade contract/i })).toBeDisabled();
    expect(screen.getByLabelText(/new wasm hash/i)).toHaveValue("");
  });

  it("toggles advanced options section visibility", () => {
    renderPanel();

    expect(screen.queryByLabelText(/migration note/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /advanced options/i }));
    expect(screen.getByLabelText(/migration note/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /advanced options/i }));
    expect(screen.queryByLabelText(/migration note/i)).not.toBeInTheDocument();
  });

  it("renders truncated contract and admin addresses in the info strip", () => {
    renderPanel();

    // CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC → CDLZFC3S...VU2HHGCYSC is 10+10 but we use 8,8
    expect(screen.getByTitle(VALID_CONTRACT_ID)).toBeInTheDocument();
    expect(screen.getByTitle(VALID_ADMIN)).toBeInTheDocument();
  });
});
