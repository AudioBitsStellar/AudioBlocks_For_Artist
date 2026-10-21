/**
 * Shared CSV export utilities.
 * Implements RFC 4180 CSV escaping: values containing comma, quote, or newline
 * must be quoted, and embedded quotes are doubled.
 */

export function escapeCsvValue(value: string | number): string {
  const stringValue = String(value);
  return /[",\n\r]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
}

export function downloadCsv(content: string, filename: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  // UTF-8 BOM for Excel compatibility
  const blob = new Blob([`\ufeff${content}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
