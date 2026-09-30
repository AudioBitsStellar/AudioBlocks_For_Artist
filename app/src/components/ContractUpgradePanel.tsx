"use client";

/**
 * ContractUpgradePanel — Artist-facing UI for the Soroban contract upgrade
 * mechanism (#295).
 *
 * Implements the prepare → sign → submit lifecycle defined in
 * docs/SOROBAN_CONTRACT_UPGRADE_DESIGN.md, wiring together:
 *   - `useContractUpgradeService` for API mutations and contract info queries
 *   - `validateUpgradeParams` / `formatWasmHash` / `formatContractAddress` from
 *     `lib/contractUpgrade` for client-side defense-in-depth validation
 *   - Freighter signing (signTransactionXdr) following ADR-0002
 */

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Loader,
  RefreshCw,
  UploadCloud,
} from "lucide-react";
import { useContractUpgradeService } from "@/services/contractUpgradeService";
import {
  formatContractAddress,
  formatWasmHash,
  validateUpgradeParams,
} from "@/lib/contractUpgrade";
import type {
  ContractUpgradeStatus,
  PreparedContractUpgradeResponse,
} from "@/types/contractUpgrade";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ContractUpgradePanelProps {
  /** Stellar contract address (56-char C-address) to be upgraded. */
  contractId: string;
  /** Connected Freighter wallet address — must match the on-chain admin. */
  adminAddress: string;
  /**
   * Called to request a Freighter signature.  Mirrors the Freighter API:
   * `signTransactionXdr(xdr, { networkPassphrase })`.
   */
  onSign: (xdr: string, opts: { networkPassphrase: string }) => Promise<string>;
}

// ---------------------------------------------------------------------------
// Status badge helper
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<ContractUpgradeStatus, string> = {
  idle: "Ready",
  validating: "Validating…",
  preparing: "Preparing transaction…",
  signing: "Waiting for Freighter signature…",
  submitting: "Submitting to Soroban…",
  success: "Upgrade successful",
  error: "Upgrade failed",
};

function StatusBadge({ status }: { status: ContractUpgradeStatus }) {
  const isError = status === "error";
  const isSuccess = status === "success";
  const isActive = status === "preparing" || status === "signing" || status === "submitting";

  return (
    <span
      role="status"
      aria-live="polite"
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        isError && "bg-red-900/30 text-red-400 border border-red-800",
        isSuccess && "bg-emerald-900/30 text-emerald-400 border border-emerald-800",
        isActive && "bg-indigo-900/30 text-indigo-300 border border-indigo-700",
        !isError && !isSuccess && !isActive && "bg-gray-800 text-gray-400 border border-gray-700",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {isActive && <Loader aria-hidden className="h-3 w-3 animate-spin" />}
      {isSuccess && <CheckCircle aria-hidden className="h-3 w-3" />}
      {isError && <AlertTriangle aria-hidden className="h-3 w-3" />}
      {STATUS_LABELS[status]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// ContractUpgradePanel
// ---------------------------------------------------------------------------

export default function ContractUpgradePanel({
  contractId,
  adminAddress,
  onSign,
}: ContractUpgradePanelProps) {
  const [newWasmHash, setNewWasmHash] = useState("");
  const [migrationNote, setMigrationNote] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [status, setStatus] = useState<ContractUpgradeStatus>("idle");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [resultTxHash, setResultTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { usePrepareContractUpgrade, useSubmitContractUpgrade, useGetContractInfo } =
    useContractUpgradeService();

  const prepare = usePrepareContractUpgrade();
  const submit = useSubmitContractUpgrade();
  const { data: contractInfo, isLoading: loadingInfo } = useGetContractInfo(
    contractId,
    !!contractId
  );

  const currentWasmHash = contractInfo?.data?.wasmHash;
  const isWorking =
    status === "validating" ||
    status === "preparing" ||
    status === "signing" ||
    status === "submitting";

  // ── handlers ────────────────────────────────────────────────────────────

  async function handleUpgrade() {
    setValidationErrors([]);
    setErrorMessage(null);
    setResultTxHash(null);
    setStatus("validating");

    // Client-side defense-in-depth validation
    const validation = validateUpgradeParams({
      contractId,
      newWasmHash,
      adminAddress,
      currentWasmHash,
    });

    if (!validation.valid) {
      setValidationErrors(validation.errors);
      setStatus("error");
      return;
    }

    try {
      // Step 1 — prepare
      setStatus("preparing");
      const prepared = await prepare.mutateAsync({
        contractId,
        newWasmHash,
        adminAddress,
        ...(migrationNote ? { migrationData: { note: migrationNote } } : {}),
      });

      const { xdr, networkPassphrase } = prepared.data as PreparedContractUpgradeResponse & {
        xdr: string;
        networkPassphrase: string;
      };

      // Step 2 — sign via Freighter
      setStatus("signing");
      const signedXdr = await onSign(xdr, { networkPassphrase });

      // Step 3 — submit
      setStatus("submitting");
      const result = await submit.mutateAsync({
        contractId,
        signedXdr,
        newWasmHash,
      });

      setResultTxHash(result.data.txHash);
      setStatus("success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(message);
      setStatus("error");
    }
  }

  function handleReset() {
    setNewWasmHash("");
    setMigrationNote("");
    setValidationErrors([]);
    setErrorMessage(null);
    setResultTxHash(null);
    setStatus("idle");
  }

  // ── render ───────────────────────────────────────────────────────────────

  return (
    <section
      aria-labelledby="contract-upgrade-heading"
      className="rounded-xl border border-gray-800 bg-[#0F0F0F] p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2
            id="contract-upgrade-heading"
            className="text-white font-semibold text-base flex items-center gap-2"
          >
            <UploadCloud aria-hidden className="h-5 w-5 text-indigo-400" />
            Soroban Contract Upgrade
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Replace on-chain WASM bytecode in-place while preserving all contract storage and the
            same contract address.
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Contract info strip */}
      <div className="rounded-lg bg-gray-900/60 border border-gray-800 px-4 py-3 text-sm space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-gray-500 shrink-0">Contract</span>
          <code className="text-indigo-300 font-mono text-xs truncate" title={contractId}>
            {formatContractAddress(contractId, 8, 8)}
          </code>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-gray-500 shrink-0">Admin</span>
          <code className="text-gray-300 font-mono text-xs truncate" title={adminAddress}>
            {formatContractAddress(adminAddress, 6, 6)}
          </code>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-gray-500 shrink-0">Current WASM</span>
          {loadingInfo ? (
            <span className="text-gray-600 text-xs">Loading…</span>
          ) : currentWasmHash ? (
            <code className="text-gray-300 font-mono text-xs" title={currentWasmHash}>
              {formatWasmHash(currentWasmHash, 8, 8)}
            </code>
          ) : (
            <span className="text-gray-600 text-xs">Unavailable</span>
          )}
        </div>
      </div>

      {/* Input form */}
      <div className="space-y-4">
        <div>
          <label htmlFor="new-wasm-hash" className="block text-sm font-medium text-gray-300 mb-1">
            New WASM Hash <span className="text-gray-500 font-normal">(64-character hex)</span>
          </label>
          <input
            id="new-wasm-hash"
            type="text"
            value={newWasmHash}
            onChange={(e) => {
              setNewWasmHash(e.target.value.trim());
              if (status === "error") setStatus("idle");
            }}
            disabled={isWorking || status === "success"}
            placeholder="a1b2c3d4…"
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 font-mono text-sm text-white placeholder:text-gray-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
            aria-describedby={validationErrors.length ? "upgrade-errors" : undefined}
          />
        </div>

        {/* Optional: advanced section */}
        <div>
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="text-sm text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
            aria-expanded={showDetails}
          >
            {showDetails ? (
              <ChevronUp aria-hidden className="h-4 w-4" />
            ) : (
              <ChevronDown aria-hidden className="h-4 w-4" />
            )}
            Advanced options
          </button>
          {showDetails && (
            <div className="mt-3">
              <label
                htmlFor="migration-note"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Migration note <span className="text-gray-500 font-normal">(optional)</span>
              </label>
              <textarea
                id="migration-note"
                rows={2}
                value={migrationNote}
                onChange={(e) => setMigrationNote(e.target.value)}
                disabled={isWorking || status === "success"}
                placeholder="Describe what changed in this upgrade…"
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 resize-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Validation / result messages */}
      {validationErrors.length > 0 && (
        <ul
          id="upgrade-errors"
          role="alert"
          aria-label="Validation errors"
          className="rounded-lg bg-red-950/40 border border-red-800 px-4 py-3 space-y-1"
        >
          {validationErrors.map((err) => (
            <li key={err} className="flex items-start gap-2 text-sm text-red-400">
              <AlertTriangle aria-hidden className="h-4 w-4 mt-0.5 shrink-0" />
              {err}
            </li>
          ))}
        </ul>
      )}

      {errorMessage && !validationErrors.length && (
        <div
          role="alert"
          className="rounded-lg bg-red-950/40 border border-red-800 px-4 py-3 flex items-start gap-2 text-sm text-red-400"
        >
          <AlertTriangle aria-hidden className="h-4 w-4 mt-0.5 shrink-0" />
          {errorMessage}
        </div>
      )}

      {status === "success" && resultTxHash && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg bg-emerald-950/40 border border-emerald-800 px-4 py-3 text-sm text-emerald-400 space-y-1"
        >
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle aria-hidden className="h-4 w-4" />
            Contract upgraded successfully
          </div>
          <div>
            Tx: <code className="font-mono text-xs">{resultTxHash}</code>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleUpgrade}
          disabled={isWorking || status === "success" || !newWasmHash}
          aria-busy={isWorking}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-950"
        >
          {isWorking && <Loader aria-hidden className="h-4 w-4 animate-spin" />}
          {isWorking ? STATUS_LABELS[status] : "Upgrade Contract"}
        </button>

        {(status === "success" || status === "error") && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-gray-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            <RefreshCw aria-hidden className="h-4 w-4" />
            Reset
          </button>
        )}
      </div>
    </section>
  );
}

export { ContractUpgradePanel };
