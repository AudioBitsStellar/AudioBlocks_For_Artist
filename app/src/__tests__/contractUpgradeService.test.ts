import { describe, it, expect, vi, beforeEach } from "vitest";
import { CONTRACT_UPGRADE_ENDPOINTS } from "../api/api-endpoint";
import {
  useContractUpgradeService,
  CONTRACT_INFO_QUERY_KEY,
} from "../services/contractUpgradeService";

const { mockUsePost, mockUseGet, mockHandleSuccess, mockHandleError } =
  vi.hoisted(() => ({
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

describe("useContractUpgradeService (#295)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates correct query keys for contract info", () => {
    expect(CONTRACT_INFO_QUERY_KEY("CDLZFC")).toEqual(["contract-info", "CDLZFC"]);
    expect(CONTRACT_INFO_QUERY_KEY(undefined)).toEqual(["contract-info", "default"]);
  });

  it("configures PREPARE_UPGRADE endpoint correctly", () => {
    mockUsePost.mockReturnValue({ mutateAsync: vi.fn() });

    const service = useContractUpgradeService();
    service.usePrepareContractUpgrade();

    expect(mockUsePost).toHaveBeenCalledWith(
      CONTRACT_UPGRADE_ENDPOINTS.PREPARE_UPGRADE,
      expect.objectContaining({
        onError: expect.any(Function),
      })
    );
  });

  it("configures SUBMIT_UPGRADE endpoint with success and error handlers", () => {
    mockUsePost.mockReturnValue({ mutateAsync: vi.fn() });

    const service = useContractUpgradeService();
    service.useSubmitContractUpgrade();

    expect(mockUsePost).toHaveBeenCalledWith(
      CONTRACT_UPGRADE_ENDPOINTS.SUBMIT_UPGRADE,
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      })
    );
  });

  it("configures GET_CONTRACT_INFO query with enabled check and staleTime", () => {
    mockUseGet.mockReturnValue({ data: null, isLoading: false });

    const service = useContractUpgradeService();
    service.useGetContractInfo("CDLZFC_SAMPLE_ID", true);

    expect(mockUseGet).toHaveBeenCalledWith(
      ["contract-info", "CDLZFC_SAMPLE_ID"],
      CONTRACT_UPGRADE_ENDPOINTS.GET_CONTRACT_INFO("CDLZFC_SAMPLE_ID"),
      expect.objectContaining({
        enabled: true,
        staleTime: 300000,
      })
    );
  });

  it("disables GET_CONTRACT_INFO when contractId is not provided", () => {
    mockUseGet.mockReturnValue({ data: null, isLoading: false });

    const service = useContractUpgradeService();
    service.useGetContractInfo(undefined);

    expect(mockUseGet).toHaveBeenCalledWith(
      ["contract-info", "default"],
      "",
      expect.objectContaining({
        enabled: false,
      })
    );
  });
});
