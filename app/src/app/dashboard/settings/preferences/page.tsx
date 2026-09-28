"use client";

import { useState } from "react";

export default function CurrencyPreferencesPage() {
  const [currency, setCurrency] = useState("USD");
  const [displayFormat, setDisplayFormat] = useState("SYMBOL"); // SYMBOL or CODE

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold">Currency Display Preferences</h2>
        <p className="text-text-muted text-sm">Choose how monetary values are displayed across your dashboard.</p>
      </header>

      <div className="space-y-4 max-w-md bg-surface p-6 rounded-xl border border-border">
        <div className="space-y-2">
          <label className="text-sm font-medium">Preferred Currency</label>
          <select 
            value={currency} 
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full bg-background border border-border rounded-lg p-2 text-text"
          >
            <option value="USD">USD ($) - US Dollar</option>
            <option value="EUR">EUR (€) - Euro</option>
            <option value="GBP">GBP (£) - British Pound</option>
            <option value="NGN">NGN (₦) - Nigerian Naira</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Display Format</label>
          <select 
            value={displayFormat} 
            onChange={(e) => setDisplayFormat(e.target.value)}
            className="w-full bg-background border border-border rounded-lg p-2 text-text"
          >
            <option value="SYMBOL">Symbol (e.g., $100)</option>
            <option value="CODE">Code (e.g., 100 USD)</option>
          </select>
        </div>

        <button className="px-4 py-2 bg-primary text-primary-contrast rounded-lg font-medium hover:opacity-90 transition-opacity">
          Save Preferences
        </button>
      </div>
    </div>
  );
}
