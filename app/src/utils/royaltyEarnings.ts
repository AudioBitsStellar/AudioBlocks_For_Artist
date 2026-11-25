/**
 * Earnings from the backend's royalty payout records (#47).
 *
 * The only artist-scoped source of royalty data the backend serves today is
 * `GET /api/royalty-payouts/export`: one CSV row per RoyaltyPayout, written
 * when the Soroban royalty contract records a sale and reconciled against the
 * on-chain event afterwards. These helpers turn that CSV into the monthly
 * series and totals the overview chart renders.
 *
 * Amounts are the payout's `grossAmount`: the sale amount before collaborator
 * splits, in the smallest unit of `currency` (the backend default `stroops`
 * means XLM). They are never converted to fiat, and different assets are
 * never added together.
 */

export type RoyaltyPayoutStatus = "pending" | "reconciled" | "discrepancy";

export interface RoyaltyPayoutRecord {
  id: string;
  saleEventId: string;
  status: RoyaltyPayoutStatus | string;
  /** Asset code the amount is in, e.g. `XLM`. */
  asset: string;
  /** Gross sale amount in whole units of `asset`. */
  amount: number;
  /** ISO timestamp the payout was recorded. */
  createdAt: string;
}

export interface EarningsMonth {
  /** `YYYY-MM`, in UTC. */
  key: string;
  /** Short axis label, e.g. `Mar 2026`. */
  label: string;
  /** Reconciled against the on-chain event: counts as earned. */
  reconciled: number;
  /** Recorded but not reconciled yet. */
  pending: number;
}

export interface EarningsSummary {
  asset: string;
  months: EarningsMonth[];
  /** Reconciled total across `months`. */
  totalReconciled: number;
  /** Pending total across `months`. */
  totalPending: number;
  /** Reconciled this month minus reconciled last month. */
  changeFromLastMonth: number;
  /** Records in this asset, newest first. */
  records: RoyaltyPayoutRecord[];
}

const STROOPS_PER_XLM = 10_000_000;

/** One CSV line, honouring RFC 4180 quoting. */
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

/** Converts a raw `grossAmount` in `currency` to an asset and whole-unit amount. */
export function toAssetAmount(
  grossAmount: string,
  currency: string
): { asset: string; amount: number } | null {
  const raw = Number(grossAmount);
  if (!Number.isFinite(raw)) return null;
  const normalized = currency.trim().toLowerCase();
  if (normalized === "" || normalized === "stroops") {
    return { asset: "XLM", amount: raw / STROOPS_PER_XLM };
  }
  return { asset: currency.trim().toUpperCase(), amount: raw };
}

/**
 * Parses the export CSV. Columns are matched by header name, so a reordered or
 * extended export still parses; a row with a missing amount or an unreadable
 * date is skipped rather than charted as zero.
 */
export function parseRoyaltyPayoutCsv(csv: string): RoyaltyPayoutRecord[] {
  const lines = csv
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");
  if (lines.length < 2) return [];

  const header = splitCsvLine(lines[0]).map((name) => name.toLowerCase());
  const column = (name: string) => header.indexOf(name);
  const idx = {
    id: column("id"),
    saleEventId: column("saleeventid"),
    status: column("status"),
    currency: column("currency"),
    grossAmount: column("grossamount"),
    createdAt: column("createdat"),
  };
  if (idx.grossAmount < 0 || idx.createdAt < 0) return [];

  const records: RoyaltyPayoutRecord[] = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const createdAt = cells[idx.createdAt] ?? "";
    if (Number.isNaN(Date.parse(createdAt))) continue;
    const converted = toAssetAmount(
      cells[idx.grossAmount] ?? "",
      idx.currency >= 0 ? (cells[idx.currency] ?? "") : ""
    );
    if (!converted) continue;
    records.push({
      id: idx.id >= 0 ? (cells[idx.id] ?? "") : "",
      saleEventId: idx.saleEventId >= 0 ? (cells[idx.saleEventId] ?? "") : "",
      status: (idx.status >= 0 ? (cells[idx.status] ?? "") : "").toLowerCase(),
      asset: converted.asset,
      amount: converted.amount,
      createdAt,
    });
  }
  return records;
}

/** Assets present in the records, the one with the most activity first. */
export function assetsIn(records: RoyaltyPayoutRecord[]): string[] {
  const counts = new Map<string, number>();
  for (const record of records) counts.set(record.asset, (counts.get(record.asset) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([asset]) => asset);
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

const MONTH_LABEL = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * The last `monthCount` calendar months (UTC) ending with the month of `now`,
 * every month present even when nothing was recorded, so the axis is
 * continuous. Discrepancy records are left out of both series: the amount the
 * chain recorded disagrees with the expected split, so it is not an earning
 * until it is resolved.
 */
export function summarizeEarnings(
  records: RoyaltyPayoutRecord[],
  asset: string,
  monthCount: number,
  now: Date = new Date()
): EarningsSummary {
  const months: EarningsMonth[] = [];
  const byKey = new Map<string, EarningsMonth>();
  for (let offset = monthCount - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    const month = {
      key: monthKey(date),
      label: MONTH_LABEL.format(date),
      reconciled: 0,
      pending: 0,
    };
    months.push(month);
    byKey.set(month.key, month);
  }

  const inAsset = records
    .filter((record) => record.asset === asset)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  // Month-over-month uses its own buckets so it stays correct for a 1-month window.
  const thisMonth = monthKey(now);
  const lastMonth = monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)));
  let reconciledThisMonth = 0;
  let reconciledLastMonth = 0;

  for (const record of inAsset) {
    const key = monthKey(new Date(record.createdAt));
    if (record.status === "reconciled") {
      if (key === thisMonth) reconciledThisMonth += record.amount;
      if (key === lastMonth) reconciledLastMonth += record.amount;
    }
    const month = byKey.get(key);
    if (!month) continue;
    if (record.status === "reconciled") month.reconciled += record.amount;
    else if (record.status === "pending") month.pending += record.amount;
  }

  return {
    asset,
    months,
    totalReconciled: months.reduce((sum, month) => sum + month.reconciled, 0),
    totalPending: months.reduce((sum, month) => sum + month.pending, 0),
    changeFromLastMonth: reconciledThisMonth - reconciledLastMonth,
    records: inAsset,
  };
}

/** `12.5 XLM`, with up to 7 decimals (one stroop). */
export function formatAssetAmount(amount: number, asset: string): string {
  return `${amount.toLocaleString("en-US", { maximumFractionDigits: 7 })} ${asset}`;
}
