import { describe, expect, it } from "vitest";
import {
  aggregateListenersByRegion,
  filterPayouts,
  rankTopTracks,
  totalCompletedPayouts,
  validateWithdrawal,
  type PayoutRecord,
} from "./artistPortal";

const ADDRESS = "G" + "A".repeat(55);

describe("rankTopTracks", () => {
  it("ranks by plays with shared ranks for ties and applies the limit", () => {
    const ranked = rankTopTracks(
      [
        { id: "a", title: "A", plays: 10 },
        { id: "b", title: "B", plays: 30 },
        { id: "c", title: "C", plays: 30 },
        { id: "d", title: "D", plays: 5 },
      ],
      3,
    );
    expect(ranked.map((t) => [t.id, t.rank])).toEqual([["b", 1], ["c", 1], ["a", 3]]);
  });

  it("computes change only when a baseline exists", () => {
    const [up, none] = rankTopTracks([
      { id: "u", title: "U", plays: 150, previousPlays: 100 },
      { id: "n", title: "N", plays: 50, previousPlays: 0 },
    ]);
    expect(up.changePercent).toBe(50);
    expect(none.changePercent).toBeNull();
  });

  it("handles empty input", () => {
    expect(rankTopTracks([])).toEqual([]);
  });
});

describe("aggregateListenersByRegion", () => {
  it("sums plays per region with shares and intensity buckets", () => {
    const regions = aggregateListenersByRegion([
      { country: "US", region: "North America", plays: 300 },
      { country: "CA", region: "North America", plays: 100 },
      { country: "DE", region: "Europe", plays: 100 },
      { country: "??", region: "Atlantis", plays: 999 },
    ]);
    const na = regions.find((r) => r.region === "North America")!;
    const eu = regions.find((r) => r.region === "Europe")!;
    const af = regions.find((r) => r.region === "Africa")!;
    expect(na).toMatchObject({ plays: 400, share: 80, intensity: 4, countries: ["US", "CA"] });
    expect(eu).toMatchObject({ plays: 100, share: 20, intensity: 1 });
    expect(af).toMatchObject({ plays: 0, share: 0, intensity: 0 });
  });

  it("returns every region at zero for no data", () => {
    expect(aggregateListenersByRegion([]).every((r) => r.plays === 0 && r.intensity === 0)).toBe(true);
  });
});

describe("payout history helpers", () => {
  const payouts: PayoutRecord[] = [
    { id: "1", date: "2026-04-01", amount: "0.1", source: "royalties", status: "completed" },
    { id: "2", date: "2026-05-01", amount: "0.2", source: "merch", status: "completed" },
    { id: "3", date: "2026-04-15", amount: "5", source: "withdrawal", status: "failed" },
  ];

  it("sorts newest first and filters by status", () => {
    expect(filterPayouts(payouts).map((p) => p.id)).toEqual(["2", "3", "1"]);
    expect(filterPayouts(payouts, "failed").map((p) => p.id)).toEqual(["3"]);
  });

  it("sums completed payouts exactly (no floating point drift)", () => {
    expect(totalCompletedPayouts(payouts)).toBe("0.3");
    expect(totalCompletedPayouts([])).toBe("0");
  });
});

describe("validateWithdrawal", () => {
  it("accepts a valid request up to the full balance", () => {
    expect(validateWithdrawal({ amount: "250.5", destination: ADDRESS }, "250.5")).toEqual({});
  });

  it.each([
    ["", /Enter an amount/],
    ["0", /greater than 0/],
    ["1.12345678", /7 decimal places/],
    ["-1", /7 decimal places/],
    ["250.5000001", /exceeds your available balance/],
  ])("rejects amount %j", (amount, message) => {
    expect(validateWithdrawal({ amount, destination: ADDRESS }, "250.5").amount).toMatch(message);
  });

  it("rejects missing, malformed and secret-key destinations", () => {
    expect(validateWithdrawal({ amount: "1", destination: "" }, "10").destination).toMatch(/Enter a Stellar address/);
    expect(validateWithdrawal({ amount: "1", destination: "GABC" }, "10").destination).toMatch(/valid Stellar/);
    expect(validateWithdrawal({ amount: "1", destination: "S" + "A".repeat(55) }, "10").destination).toMatch(/secret key/);
  });
});
