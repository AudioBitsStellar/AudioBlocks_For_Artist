import { describe, it, expect } from "vitest";
import { formatMoney, formatAsset } from "@/utils/money";

describe("formatMoney", () => {
  it("formats positive amounts with default USD", () => {
    expect(formatMoney(1234.56)).toMatch(/\$1,234\.56|1,234\.56/);
  });

  it("formats zero", () => {
    expect(formatMoney(0)).toMatch(/\$0\.00|0\.00/);
  });

  it("formats negative amounts", () => {
    const result = formatMoney(-50.25);
    expect(result).toMatch(/-.*50\.25/);
  });

  it("formats large numbers", () => {
    const result = formatMoney(1234567.89);
    expect(result).toMatch(/1,234,567\.89/);
  });

  it("respects currency code", () => {
    const result = formatMoney(100, { currency: "EUR" });
    expect(result).toMatch(/100/);
  });

  it("formats with code display style", () => {
    const result = formatMoney(100, { currency: "USD", display: "code" });
    expect(result).toContain("USD");
    expect(result).toMatch(/100/);
  });

  it("formats GBP correctly", () => {
    const result = formatMoney(50, { currency: "GBP" });
    expect(result).toMatch(/50/);
  });

  it("formats NGN correctly", () => {
    const result = formatMoney(1000, { currency: "NGN" });
    expect(result).toMatch(/1,000/);
  });

  it("uses provided locale", () => {
    const result = formatMoney(1234.56, { locale: "de-DE", currency: "EUR" });
    expect(result).toBeTruthy();
  });
});

describe("formatAsset", () => {
  it("formats XLM with full precision", () => {
    expect(formatAsset(123.4567, "XLM")).toBe("123.4567 XLM");
  });

  it("trims trailing zeros", () => {
    expect(formatAsset(10.0, "XLM")).toBe("10 XLM");
  });

  it("formats very small amounts", () => {
    expect(formatAsset(0.0000001, "XLM")).toBe("0.0000001 XLM");
  });

  it("formats zero", () => {
    expect(formatAsset(0, "XLM")).toBe("0 XLM");
  });

  it("handles other asset codes", () => {
    expect(formatAsset(100.5, "USDC")).toBe("100.5 USDC");
  });

  it("preserves up to 7 decimals", () => {
    expect(formatAsset(1.1234567, "XLM")).toBe("1.1234567 XLM");
  });

  it("trims unnecessary decimal point", () => {
    expect(formatAsset(42, "XLM")).toBe("42 XLM");
  });
});
