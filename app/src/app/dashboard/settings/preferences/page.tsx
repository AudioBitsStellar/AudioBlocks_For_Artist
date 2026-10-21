"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useCurrencyPreference } from "@/context/CurrencyPreferenceContext";
import type { CurrencyCode, DisplayStyle } from "@/utils/money";

export default function CurrencyPreferencesPage() {
  const { currency: savedCurrency, displayFormat: savedDisplayFormat, savePreference } = useCurrencyPreference();
  const [currency, setCurrency] = useState<CurrencyCode>(savedCurrency);
  const [displayFormat, setDisplayFormat] = useState<DisplayStyle>(savedDisplayFormat);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await savePreference({ currency, displayFormat });
      toast.success("Currency preferences saved");
    } catch (error) {
      toast.error("Failed to save preferences");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold">Currency Display Preferences</h2>
        <p className="text-text-muted text-sm">
          Choose how monetary values are displayed across your dashboard.
        </p>
      </header>

      <div className="space-y-4 max-w-md bg-surface p-6 rounded-xl border border-border">
        <div className="space-y-2">
          <label htmlFor="currency-select" className="text-sm font-medium">
            Preferred Currency
          </label>
          <select
            id="currency-select"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
            className="w-full bg-background border border-border rounded-lg p-2 text-text"
          >
            <option value="USD">USD ($) - US Dollar</option>
            <option value="EUR">EUR (€) - Euro</option>
            <option value="GBP">GBP (£) - British Pound</option>
            <option value="NGN">NGN (₦) - Nigerian Naira</option>
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="format-select" className="text-sm font-medium">
            Display Format
          </label>
          <select
            id="format-select"
            value={displayFormat}
            onChange={(e) => setDisplayFormat(e.target.value as DisplayStyle)}
            className="w-full bg-background border border-border rounded-lg p-2 text-text"
          >
            <option value="symbol">Symbol (e.g., $100)</option>
            <option value="code">Code (e.g., 100 USD)</option>
          </select>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-primary text-primary-contrast rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? "Saving..." : "Save Preferences"}
        </button>

        <p className="text-xs text-text-muted">
          Preferences are saved on this device. Backend sync coming soon.
        </p>
      </div>
    </div>
  );
}
