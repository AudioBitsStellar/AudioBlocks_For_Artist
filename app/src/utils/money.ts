/**
 * Shared money and asset formatting helpers (#621).
 *
 * Uses Intl.NumberFormat for consistent currency display, respecting
 * the user's locale and currency preference. Stellar assets (XLM and
 * others) use their own rules to match network precision.
 */

export type CurrencyCode = "USD" | "EUR" | "GBP" | "NGN";
export type DisplayStyle = "symbol" | "code";

export interface FormatMoneyOptions {
  currency?: CurrencyCode;
  locale?: string;
  display?: DisplayStyle;
}

/**
 * Format a monetary amount using Intl.NumberFormat.
 *
 * @example
 * formatMoney(1234.56) // "$1,234.56"
 * formatMoney(1234.56, { currency: "EUR", display: "code" }) // "1,234.56 EUR"
 * formatMoney(-50, { currency: "GBP" }) // "-£50.00"
 */
export function formatMoney(
  amount: number,
  { currency = "USD", locale, display = "symbol" }: FormatMoneyOptions = {}
): string {
  const effectiveLocale = locale ?? (typeof navigator !== "undefined" ? navigator.language : "en-US");
  
  const formatter = new Intl.NumberFormat(effectiveLocale, {
    style: "currency",
    currency,
    currencyDisplay: display,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(amount);
}

/**
 * Format a Stellar asset amount with appropriate precision.
 *
 * XLM uses up to 7 decimal places (stroop precision), trimmed of trailing zeros.
 * Other assets follow the same rule by default.
 *
 * @example
 * formatAsset(123.4567, "XLM") // "123.4567 XLM"
 * formatAsset(10.0, "XLM") // "10 XLM"
 * formatAsset(0.0000001, "XLM") // "0.0000001 XLM"
 */
export function formatAsset(amount: number, assetCode: string): string {
  // Stellar native precision is 7 decimals (1 stroop = 0.0000001 XLM)
  const formatted = amount.toFixed(7).replace(/\.?0+$/, "");
  return `${formatted} ${assetCode}`;
}
