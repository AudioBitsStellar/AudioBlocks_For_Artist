/**
 * Soroban Contract Upgrade Service (#295).
 *
 * Implements the prepare-sign-submit lifecycle for upgrading Soroban smart
 * contracts in-place via WASM hash updates.
 *
 * See docs/SOROBAN_CONTRACT_UPGRADE_DESIGN.md for architectural details.
 */

import { CONTRACT_UPGRADE_ENDPOINTS } from "@/api/api-endpoint";
import { useGet, usePost } from "@/api/queryClient";
import { useHandleError, useHandleSuccess } from "@/hooks/useToastHandler";
import type {
  ContractInfo,
  PrepareContractUpgradeRequest,
  PreparedContractUpgradeResponse,
  SubmitContractUpgradeRequest,
  SubmitContractUpgradeResponse,
} from "@/types/contractUpgrade";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const CONTRACT_INFO_QUERY_KEY = (contractId?: string) => [
  "contract-info",
  contractId || "default",
];

/**
 * Service hook providing contract upgrade mutations and contract queries.
 *
 * @example
 * ```tsx
 * const { usePrepareContractUpgrade, useSubmitContractUpgrade, useGetContractInfo } = useContractUpgradeService();
 * const prepareMutation = usePrepareContractUpgrade();
 * const submitMutation = useSubmitContractUpgrade();
 *
 * // 1. Prepare transaction
 * const prepared = await prepareMutation.mutateAsync({
 *   contractId: "CA3D...",
 *   newWasmHash: "a1b2...",
 *   adminAddress: "GB..."
 * });
 *
 * // 2. Sign via Freighter
 * const signed = await signTransactionXdr(prepared.data.xdr, { networkPassphrase: prepared.data.networkPassphrase });
 *
 * // 3. Submit to Soroban
 * await submitMutation.mutateAsync({
 *   contractId: "CA3D...",
 *   signedXdr: signed,
 *   newWasmHash: "a1b2..."
 * });
 * ```
 */
export const useContractUpgradeService = () => {
  const handleSuccess = useHandleSuccess();
  const handleError = useHandleError();

  /**
   * Prepares the `upgrade(new_wasm_hash)` Soroban invocation transaction.
   *
   * The backend validates admin authorization, resolves current contract state,
   * constructs the Soroban invocation XDR, and returns the unsigned envelope.
   */
  const usePrepareContractUpgrade = () =>
    usePost<ApiEnvelope<PreparedContractUpgradeResponse>, PrepareContractUpgradeRequest>(
      CONTRACT_UPGRADE_ENDPOINTS.PREPARE_UPGRADE,
      {
        onError: (error: Error) =>
          handleError(error.message || "Failed to prepare contract upgrade transaction."),
      }
    );

  /**
   * Submits the signed upgrade transaction envelope to the Soroban RPC.
   *
   * Relays the transaction to the Stellar network and verifies on-chain execution.
   */
  const useSubmitContractUpgrade = () =>
    usePost<ApiEnvelope<SubmitContractUpgradeResponse>, SubmitContractUpgradeRequest>(
      CONTRACT_UPGRADE_ENDPOINTS.SUBMIT_UPGRADE,
      {
        onSuccess: (response: ApiEnvelope<SubmitContractUpgradeResponse>) =>
          handleSuccess(response.message || "Soroban contract successfully upgraded!"),
        onError: (error: Error) =>
          handleError(error.message || "Failed to submit contract upgrade transaction."),
      }
    );

  /**
   * Queries metadata and currently deployed WASM hash for a given contract.
   */
  const useGetContractInfo = (contractId?: string, enabled: boolean = true) => {
    return useGet<ApiEnvelope<ContractInfo>>(
      CONTRACT_INFO_QUERY_KEY(contractId),
      contractId ? CONTRACT_UPGRADE_ENDPOINTS.GET_CONTRACT_INFO(contractId) : "",
      {
        enabled: enabled && !!contractId,
        staleTime: 1000 * 60 * 5, // 5 minutes
      }
    );
  };

  return {
    usePrepareContractUpgrade,
    useSubmitContractUpgrade,
    useGetContractInfo,
  };
};

export default useContractUpgradeService;
