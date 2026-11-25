import { describe, expect, it } from "vitest";
import {
  assetsIn,
  formatAssetAmount,
  parseRoyaltyPayoutCsv,
  summarizeEarnings,
  toAssetAmount,
  type RoyaltyPayoutRecord,
} from "./royaltyEarnings";

const HEADER = "ID,SaleEventId,Status,Currency,GrossAmount,CreatedAt";

function record(overrides: Partial<RoyaltyPayoutRecord>): RoyaltyPayoutRecord {
  return {
    id: "p",
    saleEventId: "s",
    status: "reconciled",
    asset: "XLM",
    amount: 1,
    createdAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("toAssetAmount", () => {
  it("converts the backend's stroops default to XLM", () => {
    expect(toAssetAmount("25000000", "stroops")).toEqual({ asset: "XLM", amount: 2.5 });
    expect(toAssetAmount("10000000", "")).toEqual({ asset: "XLM", amount: 1 });
  });

  it("keeps any other currency as-is", () => {
    expect(toAssetAmount("12.5", "usdc")).toEqual({ asset: "USDC", amount: 12.5 });
  });

  it("rejects an amount that is not a number", () => {
    expect(toAssetAmount("abc", "stroops")).toBeNull();
  });
});

describe("parseRoyaltyPayoutCsv", () => {
  it("returns nothing for the header-only export of an artist with no payouts", () => {
    expect(parseRoyaltyPayoutCsv(`${HEADER}\n`)).toEqual([]);
    expect(parseRoyaltyPayoutCsv("")).toEqual([]);
  });

  it("matches columns by header name, whatever their order", () => {
    const csv =
      "CreatedAt,GrossAmount,Status,ID,Currency\n2026-06-01T00:00:00Z,30000000,RECONCILED,p1,stroops";
    expect(parseRoyaltyPayoutCsv(csv)).toEqual([
      {
        id: "p1",
        saleEventId: "",
        status: "reconciled",
        asset: "XLM",
        amount: 3,
        createdAt: "2026-06-01T00:00:00Z",
      },
    ]);
  });

  it("handles a BOM, CRLF line endings and quoted cells", () => {
    const csv = `﻿${HEADER}\r\n"p,1","s ""a""",pending,stroops,10000000,2026-06-01T00:00:00Z\r\n`;
    const [parsed] = parseRoyaltyPayoutCsv(csv);
    expect(parsed.id).toBe("p,1");
    expect(parsed.saleEventId).toBe('s "a"');
    expect(parsed.status).toBe("pending");
  });

  it("skips rows it cannot chart rather than counting them as zero", () => {
    const csv = [
      HEADER,
      "ok,s,reconciled,stroops,10000000,2026-06-01T00:00:00Z",
      "bad-date,s,reconciled,stroops,10000000,not-a-date",
      "bad-amount,s,reconciled,stroops,lots,2026-06-01T00:00:00Z",
    ].join("\n");
    expect(parseRoyaltyPayoutCsv(csv).map((r) => r.id)).toEqual(["ok"]);
  });

  it("returns nothing when the amount or date column is missing", () => {
    expect(parseRoyaltyPayoutCsv("ID,Status\np1,reconciled")).toEqual([]);
  });
});

describe("assetsIn", () => {
  it("lists each asset once, the most active first", () => {
    const records = [record({ asset: "USDC" }), record({ asset: "XLM" }), record({ asset: "XLM" })];
    expect(assetsIn(records)).toEqual(["XLM", "USDC"]);
    expect(assetsIn([])).toEqual([]);
  });
});

describe("summarizeEarnings", () => {
  const NOW = new Date("2026-06-15T12:00:00.000Z");

  it("returns one bucket per month, in order, even for empty months", () => {
    const summary = summarizeEarnings([], "XLM", 3, NOW);
    expect(summary.months.map((m) => m.key)).toEqual(["2026-04", "2026-05", "2026-06"]);
    expect(summary.months.map((m) => m.label)).toEqual(["Apr 2026", "May 2026", "Jun 2026"]);
    expect(summary.totalReconciled).toBe(0);
    expect(summary.changeFromLastMonth).toBe(0);
  });

  it("crosses a year boundary", () => {
    const summary = summarizeEarnings([], "XLM", 3, new Date("2026-01-10T00:00:00Z"));
    expect(summary.months.map((m) => m.key)).toEqual(["2025-11", "2025-12", "2026-01"]);
  });

  it("splits reconciled from pending and leaves discrepancies out", () => {
    const summary = summarizeEarnings(
      [
        record({ status: "reconciled", amount: 5, createdAt: "2026-06-03T00:00:00Z" }),
        record({ status: "pending", amount: 2, createdAt: "2026-06-04T00:00:00Z" }),
        record({ status: "discrepancy", amount: 7, createdAt: "2026-06-05T00:00:00Z" }),
      ],
      "XLM",
      3,
      NOW
    );
    expect(summary.months[2]).toMatchObject({ reconciled: 5, pending: 2 });
    expect(summary.totalReconciled).toBe(5);
    expect(summary.totalPending).toBe(2);
  });

  it("never adds different assets together", () => {
    const records = [record({ asset: "XLM", amount: 5 }), record({ asset: "USDC", amount: 100 })];
    expect(summarizeEarnings(records, "XLM", 1, NOW).totalReconciled).toBe(5);
    expect(summarizeEarnings(records, "USDC", 1, NOW).totalReconciled).toBe(100);
  });

  it("drops records outside the window from the totals", () => {
    const summary = summarizeEarnings(
      [
        record({ amount: 5, createdAt: "2026-06-01T00:00:00Z" }),
        record({ amount: 10, createdAt: "2026-01-01T00:00:00Z" }),
      ],
      "XLM",
      3,
      NOW
    );
    expect(summary.totalReconciled).toBe(5);
    // Still listed: the recent-payouts list is not windowed.
    expect(summary.records).toHaveLength(2);
  });

  it("compares this month with last month, even for a one-month window", () => {
    const records = [
      record({ amount: 5, createdAt: "2026-06-01T00:00:00Z" }),
      record({ amount: 8, createdAt: "2026-05-01T00:00:00Z" }),
    ];
    expect(summarizeEarnings(records, "XLM", 1, NOW).changeFromLastMonth).toBe(-3);
  });

  it("buckets by UTC month", () => {
    const summary = summarizeEarnings(
      [record({ amount: 1, createdAt: "2026-05-31T23:30:00-02:00" })],
      "XLM",
      2,
      NOW
    );
    // 2026-06-01T01:30Z — June in UTC, whatever the seller's offset was.
    expect(summary.months[1].reconciled).toBe(1);
  });

  it("orders records newest first", () => {
    const summary = summarizeEarnings(
      [
        record({ id: "old", createdAt: "2026-05-01T00:00:00Z" }),
        record({ id: "new", createdAt: "2026-06-01T00:00:00Z" }),
      ],
      "XLM",
      3,
      NOW
    );
    expect(summary.records.map((r) => r.id)).toEqual(["new", "old"]);
  });
});

describe("formatAssetAmount", () => {
  it("keeps stroop precision and names the asset", () => {
    expect(formatAssetAmount(1.2345678, "XLM")).toBe("1.2345678 XLM");
    expect(formatAssetAmount(12500, "XLM")).toBe("12,500 XLM");
  });
});
