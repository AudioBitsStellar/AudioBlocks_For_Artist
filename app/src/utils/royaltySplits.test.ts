import { describe, expect, it } from "vitest";
import {
  basisPointsToPercent,
  formatPercent,
  isSplitDraftValid,
  MAX_COLLABORATORS,
  parsePercent,
  percentToBasisPoints,
  rebalanceToTotal,
  toBasisPointEntries,
  totalPercent,
  validateSplitDraft,
  type SplitParticipant,
} from "./royaltySplits";

const ADDRESS_A = "GAB2CDEFGHIJKLMNOPQRSTUVWXYZ34567AB2CDEFGHIJKLMNOPQRSTUV";
const ADDRESS_B = "G76543ZYXWVUTSRQPONMLKJIHGFEDC2BAAB2CDEFGHIJKLMNOPQRSTUV";

const rows = (...percents: number[]): SplitParticipant[] =>
  percents.map((percent, index) => ({
    id: `row_${index}`,
    name: `Collaborator ${index}`,
    address: index === 0 ? ADDRESS_A : ADDRESS_B,
    percent,
  }));

describe("percent <-> basis points", () => {
  it("parses user input, treating blanks as zero and junk as NaN", () => {
    expect(parsePercent("")).toBe(0);
    expect(parsePercent("  ")).toBe(0);
    expect(parsePercent("12.5")).toBe(12.5);
    expect(parsePercent(30)).toBe(30);
    expect(Number.isNaN(parsePercent("abc"))).toBe(true);
  });

  it("round-trips through integer basis points", () => {
    expect(percentToBasisPoints(50)).toBe(5000);
    expect(percentToBasisPoints(33.33)).toBe(3333);
    expect(basisPointsToPercent(2500)).toBe(25);
  });

  it("formats without trailing zero noise", () => {
    expect(formatPercent(50)).toBe("50");
    expect(formatPercent(33.33)).toBe("33.33");
    expect(formatPercent(NaN)).toBe("0");
  });
});

describe("totalPercent", () => {
  it("ignores unparseable rows instead of producing NaN", () => {
    expect(totalPercent([...rows(50, 50), { ...rows(0)[0], percent: NaN }])).toBe(100);
  });
});

describe("rebalanceToTotal", () => {
  it("keeps the total at exactly 100% after an edit", () => {
    const result = rebalanceToTotal(rows(50, 50), "row_0", 60);
    expect(result[0].percent).toBe(60);
    expect(totalPercent(result)).toBe(100);
  });

  it("honours an uneven remainder without losing basis points", () => {
    const result = rebalanceToTotal(rows(34, 33, 33), "row_0", 10);
    expect(result[0].percent).toBe(10);
    expect(percentToBasisPoints(10)).toBe(1000);
    expect(result.reduce((sum, row) => sum + percentToBasisPoints(row.percent), 0)).toBe(10_000);
    expect(totalPercent(result)).toBe(100);
  });

  it("clamps out-of-range input", () => {
    expect(rebalanceToTotal(rows(50, 50), "row_0", 150)[0].percent).toBe(100);
    expect(rebalanceToTotal(rows(50, 50), "row_0", -20)[0].percent).toBe(0);
  });

  it("distributes across empty rows rather than losing the remainder", () => {
    const result = rebalanceToTotal(rows(0, 0, 0), "row_0", 40);
    expect(totalPercent(result)).toBe(100);
  });

  it("is a no-op for an unknown row id", () => {
    const input = rows(50, 50);
    expect(rebalanceToTotal(input, "nope", 10)).toBe(input);
  });
});

describe("validateSplitDraft", () => {
  it("accepts a balanced, well-formed split", () => {
    expect(validateSplitDraft(rows(50, 50))).toEqual({ rows: {} });
    expect(isSplitDraftValid(rows(60, 40))).toBe(true);
  });

  it("requires at least one collaborator and caps the list", () => {
    expect(validateSplitDraft([]).total).toMatch(/at least one/i);
    const many = Array.from({ length: MAX_COLLABORATORS + 1 }, (_, i) => ({
      id: `r${i}`,
      name: `N${i}`,
      address: `${ADDRESS_A.slice(0, -1)}${i % 10}`,
      percent: 100 / (MAX_COLLABORATORS + 1),
    }));
    expect(validateSplitDraft(many).total).toMatch(new RegExp(`${MAX_COLLABORATORS}`));
  });

  it("flags missing names, missing or malformed addresses", () => {
    const draft: SplitParticipant[] = [
      { id: "a", name: "  ", address: ADDRESS_A, percent: 50 },
      { id: "b", name: "B", address: "", percent: 50 },
      { id: "c", name: "C", address: "GABC", percent: 0 },
    ];
    const errors = validateSplitDraft(draft);
    expect(errors.rows.a).toMatch(/name/i);
    expect(errors.rows.b).toMatch(/Stellar address/i);
    expect(errors.rows.c).toMatch(/valid Stellar address/i);
  });

  it("rejects duplicate recipients", () => {
    const draft: SplitParticipant[] = [
      { id: "a", name: "A", address: ADDRESS_A, percent: 50 },
      { id: "b", name: "B", address: ADDRESS_A, percent: 50 },
    ];
    expect(validateSplitDraft(draft).rows.b).toMatch(/Same address/i);
  });

  it("requires the shares to add up to 100%", () => {
    expect(validateSplitDraft(rows(50, 40)).total).toMatch(/100%/);
    expect(isSplitDraftValid(rows(50, 40))).toBe(false);
  });

  it("rejects a zero or oversized share", () => {
    const zero = validateSplitDraft([
      { id: "a", name: "A", address: ADDRESS_A, percent: 0 },
      { id: "b", name: "B", address: ADDRESS_B, percent: 100 },
    ]);
    expect(zero.rows.a).toMatch(/greater than 0/i);

    const huge = validateSplitDraft([
      { id: "a", name: "A", address: ADDRESS_A, percent: 120 },
      { id: "b", name: "B", address: ADDRESS_B, percent: 0 },
    ]);
    expect(huge.rows.a).toMatch(/more than 100/i);
  });
});

describe("toBasisPointEntries", () => {
  it("hands the contract trimmed addresses and integer shares", () => {
    const entries = toBasisPointEntries([
      { id: "a", name: "A", address: ` ${ADDRESS_A} `, percent: 62.5 },
      { id: "b", name: "B", address: ADDRESS_B, percent: 37.5 },
    ]);
    expect(entries).toEqual([
      { recipient: ADDRESS_A, basisPoints: 6250 },
      { recipient: ADDRESS_B, basisPoints: 3750 },
    ]);
    expect(entries.reduce((sum, e) => sum + e.basisPoints, 0)).toBe(10_000);
  });
});
