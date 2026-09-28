import type { GeographicData } from "@/services/analyticsService";

// ── Top tracks leaderboard (#405) ─────────────────────────────────────────────

export interface TrackStat {
  id: string;
  title: string;
  plays: number;
  /** Plays in the previous period, for the trend indicator. */
  previousPlays?: number;
}

export interface RankedTrack extends TrackStat {
  /** 1-based rank; tracks with equal plays share a rank ("1, 1, 3"). */
  rank: number;
  /** Percent change vs previous period, or null when there is no baseline. */
  changePercent: number | null;
}

export function rankTopTracks(tracks: TrackStat[], limit = 10): RankedTrack[] {
  const sorted = [...tracks].sort((a, b) => b.plays - a.plays || a.title.localeCompare(b.title));
  let rank = 0;
  return sorted.slice(0, Math.max(0, limit)).map((track, index) => {
    if (index === 0 || track.plays !== sorted[index - 1].plays) rank = index + 1;
    const changePercent =
      track.previousPlays && track.previousPlays > 0
        ? ((track.plays - track.previousPlays) / track.previousPlays) * 100
        : null;
    return { ...track, rank, changePercent };
  });
}

// ── Geographic listener map (#406) ────────────────────────────────────────────

export const MAP_REGIONS = [
  "North America",
  "South America",
  "Europe",
  "Africa",
  "Asia",
  "Oceania",
] as const;

export type MapRegion = (typeof MAP_REGIONS)[number];

export interface RegionTotal {
  region: MapRegion;
  plays: number;
  /** Share of all plays, 0–100. */
  share: number;
  /** Colour intensity bucket 0 (none) – 4 (highest). */
  intensity: 0 | 1 | 2 | 3 | 4;
  countries: string[];
}

export function aggregateListenersByRegion(data: GeographicData[]): RegionTotal[] {
  const totals = new Map<MapRegion, { plays: number; countries: string[] }>(
    MAP_REGIONS.map((r) => [r, { plays: 0, countries: [] }]),
  );
  for (const row of data) {
    const bucket = totals.get(row.region as MapRegion);
    if (!bucket || row.plays <= 0) continue; // unknown regions / bad rows are ignored
    bucket.plays += row.plays;
    bucket.countries.push(row.country);
  }
  const all = [...totals.values()].reduce((sum, t) => sum + t.plays, 0);
  const max = Math.max(0, ...[...totals.values()].map((t) => t.plays));

  return MAP_REGIONS.map((region) => {
    const { plays, countries } = totals.get(region)!;
    const intensity = (plays === 0 ? 0 : Math.max(1, Math.ceil((plays / max) * 4))) as RegionTotal["intensity"];
    return { region, plays, share: all ? (plays / all) * 100 : 0, intensity, countries };
  });
}

// ── Payout history (#407) ─────────────────────────────────────────────────────

export type PayoutStatus = "completed" | "pending" | "failed";

export interface PayoutRecord {
  id: string;
  /** ISO date. */
  date: string;
  /** Amount in XLM as a decimal string (never a float). */
  amount: string;
  source: "royalties" | "withdrawal" | "merch" | "events";
  status: PayoutStatus;
  txHash?: string;
}

/** Newest first, optionally filtered by status. */
export function filterPayouts(records: PayoutRecord[], status: PayoutStatus | "all" = "all"): PayoutRecord[] {
  return records
    .filter((r) => status === "all" || r.status === status)
    .sort((a, b) => b.date.localeCompare(a.date));
}

const STROOPS = 10_000_000n;

function toStroops(amount: string): bigint {
  const [whole, fraction = ""] = amount.split(".");
  return BigInt(whole || "0") * STROOPS + BigInt(fraction.padEnd(7, "0").slice(0, 7));
}

function fromStroops(stroops: bigint): string {
  const fraction = (stroops % STROOPS).toString().padStart(7, "0").replace(/0+$/, "");
  return `${stroops / STROOPS}${fraction ? `.${fraction}` : ""}`;
}

/** Exact sum of completed payouts (no floating point). */
export function totalCompletedPayouts(records: PayoutRecord[]): string {
  return fromStroops(
    records.filter((r) => r.status === "completed").reduce((sum, r) => sum + toStroops(r.amount), 0n),
  );
}

// ── Withdraw funds (#408) ─────────────────────────────────────────────────────

const STELLAR_ADDRESS = /^G[A-Z2-7]{55}$/;
const AMOUNT = /^\d+(\.\d{1,7})?$/;

export interface WithdrawInput {
  amount: string;
  destination: string;
}

export type WithdrawErrors = Partial<Record<keyof WithdrawInput, string>>;

export function validateWithdrawal(input: WithdrawInput, availableBalance: string): WithdrawErrors {
  const errors: WithdrawErrors = {};
  const amount = input.amount.trim();

  if (!amount) errors.amount = "Enter an amount to withdraw.";
  else if (!AMOUNT.test(amount)) errors.amount = "Use a number with at most 7 decimal places.";
  else if (toStroops(amount) === 0n) errors.amount = "Amount must be greater than 0.";
  else if (toStroops(amount) > toStroops(availableBalance)) errors.amount = "Amount exceeds your available balance.";

  const destination = input.destination.trim();
  if (!destination) errors.destination = "Enter a Stellar address.";
  else if (destination.startsWith("S")) errors.destination = "That looks like a secret key. Never share it — enter your public G… address.";
  else if (!STELLAR_ADDRESS.test(destination)) errors.destination = "Enter a valid Stellar public address (starts with G, 56 characters).";

  return errors;
}
