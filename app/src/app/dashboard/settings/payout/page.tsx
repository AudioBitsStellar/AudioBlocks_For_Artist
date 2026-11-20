"use client";

import { useState, useEffect } from "react";
import { DollarSign, CheckCircle, AlertCircle, AlertTriangle, ShieldCheck, Info } from "lucide-react";
import { toast } from "sonner";

interface PayoutMethod {
  id: string;
  type: "stellar" | "bank";
  label: string;
  address: string;
  isDefault: boolean;
}

const STORAGE_KEY = "audioblocks:payout-methods:v1";
const DEFAULT_METHODS: PayoutMethod[] = [];

// Feature flag: set to true when backend endpoint is ready
const BACKEND_PERSISTENCE_ENABLED = false;

// Stellar public key validation: Starts with 'G', 56 characters, alphanumeric
const STELLAR_PUBLIC_KEY_REGEX = /^G[A-Z0-9]{55}$/;

export default function PayoutSettingsPage() {
  const [methods, setMethods] = useState<PayoutMethod[]>(DEFAULT_METHODS);
  const [isEditing, setIsEditing] = useState(false);
  const [newMethod, setNewMethod] = useState<{
    type: "stellar" | "bank";
    address: string;
    label: string;
  }>({
    type: "stellar",
    address: "",
    label: "",
  });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setMethods(JSON.parse(raw));
      }
    } catch {
      // ignore
    }
  }, []);

  const saveMethods = (updated: PayoutMethod[]) => {
    setMethods(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleAdd = () => {
    const trimmedAddress = newMethod.address.trim();
    if (!trimmedAddress) {
      toast.error("Please enter a payout address");
      return;
    }

    if (newMethod.type === "stellar" && !STELLAR_PUBLIC_KEY_REGEX.test(trimmedAddress)) {
      toast.error("Invalid Stellar address. A valid address begins with 'G' and contains 56 characters.");
      return;
    }

    const method: PayoutMethod = {
      id: Date.now().toString(),
      type: newMethod.type,
      label: newMethod.label.trim() || (newMethod.type === "stellar" ? "Stellar Wallet" : "Bank Account"),
      address: trimmedAddress,
      isDefault: methods.length === 0,
    };
    saveMethods([...methods, method]);
    setNewMethod({ type: "stellar", address: "", label: "" });
    setIsEditing(false);
    toast.success("Payout method added successfully");
  };

  const handleRemove = (id: string) => {
    const updated = methods.filter((m) => m.id !== id);
    if (updated.length > 0 && !updated.some((m) => m.isDefault)) {
      updated[0].isDefault = true;
    }
    saveMethods(updated);
    toast.success("Payout method removed");
  };

  const handleSetDefault = (id: string) => {
    const updated = methods.map((m) => ({ ...m, isDefault: m.id === id }));
    saveMethods(updated);
    toast.success("Default payout destination updated");
  };

  const hasConfiguredPayout = methods.length > 0;
  const defaultMethod = methods.find((m) => m.isDefault) || methods[0];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-text">Payout Setup &amp; Status</h2>
        <p className="text-sm text-text-muted">
          Configure how and where you receive automated streaming royalties and collectible earnings.
        </p>
      </div>

      {/* Payout Status UX Card (#780) */}
      <div
        data-testid="payout-status-card"
        className={`rounded-2xl border p-5 flex flex-wrap items-center justify-between gap-4 ${
          hasConfiguredPayout
            ? "border-success/30 bg-success/5"
            : "border-amber-500/30 bg-amber-500/5"
        }`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
              hasConfiguredPayout ? "bg-success/15 text-success" : "bg-amber-500/15 text-amber-500"
            }`}
          >
            {hasConfiguredPayout ? (
              <ShieldCheck size={22} aria-hidden="true" />
            ) : (
              <AlertCircle size={22} aria-hidden="true" />
            )}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-text">Payout Status:</span>
              <span
                data-testid="payout-status-badge"
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                  hasConfiguredPayout
                    ? "bg-success/20 text-success"
                    : "bg-amber-500/20 text-amber-400"
                }`}
              >
                {hasConfiguredPayout ? "Active & Verified" : "Action Required"}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-1">
              {hasConfiguredPayout
                ? `Ready to receive payouts directly to your default ${
                    defaultMethod?.type === "stellar" ? "Stellar wallet" : "account"
                  }. Minimum payout threshold: $25.00 USDC.`
                : "No payout destination is configured. Earnings will accrue safely in smart contract escrow until you add a payout method."}
            </p>
          </div>
        </div>

        {!hasConfiguredPayout && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-contrast hover:bg-primary-hover transition-colors"
          >
            Set Up Payout Method
          </button>
        )}
      </div>

      {/* Guidance Card (#780) */}
      <div className="rounded-xl border border-border-subtle bg-surface p-4 text-xs text-text-muted space-y-2">
        <div className="flex items-center gap-2 font-semibold text-text">
          <Info size={16} className="text-primary" />
          <span>Payout &amp; Settlement Guidance</span>
        </div>
        <ul className="list-disc list-inside space-y-1 pl-1">
          <li>
            <strong>Stellar Network:</strong> Payouts in USDC or XLM settle near-instantaneously with negligible transaction fees. Ensure your wallet supports trustlines for USDC.
          </li>
          <li>
            <strong>Settlement Cadence:</strong> Automated distributions execute bi-weekly on the 1st and 15th of each month for balances exceeding $25.00.
          </li>
          <li>
            <strong>Tax &amp; Identity:</strong> Payouts exceeding regulatory thresholds may require identity confirmation through our verified partner gateway.
          </li>
        </ul>
      </div>

      {/* Warning Banner - Backend not ready */}
      {!BACKEND_PERSISTENCE_ENABLED && (
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-yellow-500 mb-1">Local Browser Persistence Active</p>
            <p className="text-text-muted text-xs">
              Payout destination settings are cached locally. Backend sync endpoint integration will be finalized with the smart contract escrow bridge in the upcoming release.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border-subtle bg-surface p-6 space-y-6">
        {/* Existing Methods */}
        {methods.length > 0 ? (
          <div className="space-y-3">
            {methods.map((method) => (
              <div
                key={method.id}
                className={`flex items-center justify-between p-4 rounded-xl border ${
                  method.isDefault ? "border-primary bg-primary/5" : "border-border-subtle"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      method.type === "stellar" ? "bg-primary/10" : "bg-blue-500/10"
                    }`}
                  >
                    <DollarSign
                      size={20}
                      className={method.type === "stellar" ? "text-primary" : "text-blue-500"}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text">{method.label}</p>
                    <p className="text-xs text-text-muted font-mono">
                      {method.type === "stellar"
                        ? `${method.address.slice(0, 8)}...${method.address.slice(-8)}`
                        : method.address}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {method.isDefault ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      <CheckCircle size={12} />
                      Default
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(method.id)}
                      className="text-xs text-text-muted hover:text-primary transition-colors"
                    >
                      Set as default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(method.id)}
                    className="text-xs text-red-500 hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertCircle size={32} className="mx-auto text-text-muted mb-3" />
            <p className="text-sm text-text-muted">
              No payout methods configured. Add one below to receive automated payments.
            </p>
          </div>
        )}

        {/* Add New Method */}
        {isEditing ? (
          <div className="border-t border-border-subtle pt-6 space-y-4">
            <h3 className="text-sm font-semibold text-text">Add Payout Destination</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setNewMethod({ ...newMethod, type: "stellar" })}
                  className={`flex-1 p-3 rounded-xl border text-sm font-medium transition-colors ${
                    newMethod.type === "stellar"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border-subtle text-text-muted hover:border-secondary"
                  }`}
                >
                  Stellar Wallet (USDC/XLM)
                </button>
                <button
                  type="button"
                  onClick={() => setNewMethod({ ...newMethod, type: "bank" })}
                  className={`flex-1 p-3 rounded-xl border text-sm font-medium transition-colors ${
                    newMethod.type === "bank"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border-subtle text-text-muted hover:border-secondary"
                  }`}
                >
                  Bank Account (ACH/SEPA)
                </button>
              </div>
              <input
                type="text"
                placeholder="Label (e.g., Primary Ledger, Business Account)"
                value={newMethod.label}
                onChange={(e) => setNewMethod({ ...newMethod, label: e.target.value })}
                className="w-full rounded-lg border border-border-subtle bg-surface-raised px-4 py-3 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
              <input
                type="text"
                placeholder={
                  newMethod.type === "stellar"
                    ? "Stellar public key (starts with G, 56 characters)"
                    : "IBAN or routing/account details"
                }
                value={newMethod.address}
                onChange={(e) => setNewMethod({ ...newMethod, address: e.target.value })}
                className="w-full rounded-lg border border-border-subtle bg-surface-raised px-4 py-3 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none font-mono"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 rounded-full border border-border px-4 py-2 text-sm font-semibold text-text-muted hover:text-text transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAdd}
                  className="flex-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-contrast hover:bg-primary-hover transition-colors"
                >
                  Save Method
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="w-full rounded-xl border border-dashed border-border-subtle p-4 text-sm font-semibold text-text-muted hover:text-text hover:border-secondary transition-colors"
          >
            + Add Payout Method
          </button>
        )}
      </div>

      {/* Legal copy disclaimer per #783 / COMP-01 */}
      <p className="text-xs text-text-muted leading-relaxed">
        * Payouts represent distributions of contractual streaming royalties and collectible primary/secondary sales. Payout amounts are calculated strictly based on verified platform activity and do not constitute financial returns or dividend yields.
      </p>
    </div>
  );
}
