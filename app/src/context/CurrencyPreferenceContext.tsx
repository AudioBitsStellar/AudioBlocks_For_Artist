/**
 * Currency preference context (#620).
 *
 * Stores the user's preferred currency and display format (symbol vs code),
 * consumed by the money formatter so all amounts render consistently.
 *
 * Falls back to localStorage when backend persistence isn't available yet.
 */

"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import type { CurrencyCode, DisplayStyle } from "@/utils/money";

const STORAGE_KEY = "audioblocks:currency-preference:v1";

interface CurrencyPreference {
  currency: CurrencyCode;
  displayFormat: DisplayStyle;
}

interface CurrencyPreferenceContextValue extends CurrencyPreference {
  setCurrency: (currency: CurrencyCode) => void;
  setDisplayFormat: (format: DisplayStyle) => void;
  savePreference: (preference: CurrencyPreference) => Promise<void>;
}

const CurrencyPreferenceContext = createContext<CurrencyPreferenceContextValue | null>(null);

const DEFAULT_PREFERENCE: CurrencyPreference = {
  currency: "USD",
  displayFormat: "symbol",
};

function loadPreference(): CurrencyPreference {
  if (typeof window === "undefined") return DEFAULT_PREFERENCE;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_PREFERENCE;

    const parsed = JSON.parse(stored) as CurrencyPreference;
    return {
      currency: parsed.currency ?? DEFAULT_PREFERENCE.currency,
      displayFormat: parsed.displayFormat ?? DEFAULT_PREFERENCE.displayFormat,
    };
  } catch {
    return DEFAULT_PREFERENCE;
  }
}

function persistPreference(preference: CurrencyPreference): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
  } catch {
    // Storage blocked — preference lives for this session only
  }
}

interface CurrencyPreferenceProviderProps {
  children: ReactNode;
}

export function CurrencyPreferenceProvider({ children }: CurrencyPreferenceProviderProps) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(DEFAULT_PREFERENCE.currency);
  const [displayFormat, setDisplayFormatState] = useState<DisplayStyle>(DEFAULT_PREFERENCE.displayFormat);

  useEffect(() => {
    const loaded = loadPreference();
    setCurrencyState(loaded.currency);
    setDisplayFormatState(loaded.displayFormat);
  }, []);

  const setCurrency = useCallback((newCurrency: CurrencyCode) => {
    setCurrencyState(newCurrency);
  }, []);

  const setDisplayFormat = useCallback((newFormat: DisplayStyle) => {
    setDisplayFormatState(newFormat);
  }, []);

  const savePreference = useCallback(
    async (preference: CurrencyPreference) => {
      setCurrencyState(preference.currency);
      setDisplayFormatState(preference.displayFormat);
      persistPreference(preference);

      // TODO: When backend profile API supports currency preference,
      // send a PATCH here and handle errors with a toast.
    },
    []
  );

  return (
    <CurrencyPreferenceContext.Provider
      value={{
        currency,
        displayFormat,
        setCurrency,
        setDisplayFormat,
        savePreference,
      }}
    >
      {children}
    </CurrencyPreferenceContext.Provider>
  );
}

export function useCurrencyPreference(): CurrencyPreferenceContextValue {
  const context = useContext(CurrencyPreferenceContext);
  if (!context) {
    throw new Error("useCurrencyPreference must be used within CurrencyPreferenceProvider");
  }
  return context;
}
