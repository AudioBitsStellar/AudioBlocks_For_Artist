"use client";

import { useState, useEffect } from "react";
import { DollarSign, CheckCircle, AlertCircle } from "lucide-react";
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
    if (!newMethod.address.trim()) {
      toast.error("Please enter a payout address");
      return;
    }
    const method: PayoutMethod = {
      id: Date.now().toString(),
      type: newMethod.type,
      label: newMethod.label || (newMethod.type === "stellar" ? "Stellar Wallet" : "Bank Account"),
      address: newMethod.address.trim(),
      isDefault: methods.length === 0,
    };
    saveMethods([...methods, method]);
    setNewMethod({ type: "stellar", address: "", label: "" });
    setIsEditing(false);
    toast.success("Payout method added");
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
    toast.success("Default payout method updated");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-text">Payout Methods</h2>
        <p className="text-sm text-text-muted">
          Configure how you receive royalty payments and earnings from your music.
        </p>
      </div>

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
                      onClick={() => handleSetDefault(method.id)}
                      className="text-xs text-text-muted hover:text-primary transition-colors"
                    >
                      Set as default
                    </button>
                  )}
                  <button
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
              No payout methods configured. Add one below to receive payments.
            </p>
          </div>
        )}

        {/* Add New Method */}
        {isEditing ? (
          <div className="border-t border-border-subtle pt-6 space-y-4">
            <h3 className="text-sm font-semibold text-text">Add Payout Method</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <button
                  onClick={() => setNewMethod({ ...newMethod, type: "stellar" })}
                  className={`flex-1 p-3 rounded-xl border text-sm font-medium transition-colors ${
                    newMethod.type === "stellar"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border-subtle text-text-muted hover:border-secondary"
                  }`}
                >
                  Stellar Wallet
                </button>
                <button
                  onClick={() => setNewMethod({ ...newMethod, type: "bank" })}
                  className={`flex-1 p-3 rounded-xl border text-sm font-medium transition-colors ${
                    newMethod.type === "bank"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border-subtle text-text-muted hover:border-secondary"
                  }`}
                >
                  Bank Account
                </button>
              </div>
              <input
                type="text"
                placeholder="Label (optional)"
                value={newMethod.label}
                onChange={(e) => setNewMethod({ ...newMethod, label: e.target.value })}
                className="w-full rounded-lg border border-border-subtle bg-surface-raised px-4 py-3 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
              <input
                type="text"
                placeholder={
                  newMethod.type === "stellar" ? "Stellar address (G...)" : "Account details"
                }
                value={newMethod.address}
                onChange={(e) => setNewMethod({ ...newMethod, address: e.target.value })}
                className="w-full rounded-lg border border-border-subtle bg-surface-raised px-4 py-3 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 rounded-full border border-border px-4 py-2 text-sm font-semibold text-text-muted hover:text-text transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  className="flex-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-contrast hover:bg-primary-hover transition-colors"
                >
                  Add Method
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="w-full rounded-xl border border-dashed border-border-subtle p-4 text-sm font-semibold text-text-muted hover:text-text hover:border-secondary transition-colors"
          >
            + Add Payout Method
          </button>
        )}
      </div>
    </div>
  );
}
