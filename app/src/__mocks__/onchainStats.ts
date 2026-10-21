import type { HorizonOperation, HorizonTransaction } from "@/lib/horizon";
import {
  summarizeOnChainActivity,
  type HeldAsset,
  type OnChainActivitySummary,
} from "@/services/onchainStatsService";

const transaction = (hash: string, createdAt: string, successful = true): HorizonTransaction => ({
  id: hash,
  hash,
  created_at: createdAt,
  source_account: "GAUTHOR",
  successful,
  operation_count: 1,
  fee_charged: "100",
});

const operation = (
  id: string,
  type: string,
  createdAt: string,
  extras: Partial<HorizonOperation> = {}
): HorizonOperation => ({
  id,
  transaction_hash: `hash_${id}`,
  transaction_successful: true,
  source_account: "GAUTHOR",
  type,
  type_i: 0,
  created_at: createdAt,
  ...extras,
});

/**
 * A week of plausible artist activity: mints through the Soroban contract,
 * royalty payments arriving, and one failed transaction the artist retried.
 */
export const MOCK_ONCHAIN_TRANSACTIONS: HorizonTransaction[] = [
  transaction("tx_mock_5", "2026-09-26T18:04:00Z"),
  transaction("tx_mock_4", "2026-09-25T09:12:00Z"),
  transaction("tx_mock_3", "2026-09-21T20:41:00Z", false),
  transaction("tx_mock_2", "2026-09-21T20:43:00Z"),
  transaction("tx_mock_1", "2026-09-20T11:00:00Z"),
];

export const MOCK_ONCHAIN_OPERATIONS: HorizonOperation[] = [
  operation("op_10", "invoke_host_function", "2026-09-26T18:04:00Z"),
  operation("op_9", "payment", "2026-09-25T09:12:00Z", {
    asset_type: "credit_alphanum4",
    asset_code: "sUSDC",
    amount: "24.5000000",
  }),
  operation("op_8", "payment", "2026-09-25T09:12:00Z", {
    asset_type: "credit_alphanum4",
    asset_code: "sUSDC",
    amount: "11.7500000",
  }),
  operation("op_7", "revoke_sponsorship", "2026-09-21T20:41:00Z"),
  operation("op_6", "invoke_host_function", "2026-09-21T20:43:00Z"),
  operation("op_5", "create_claimable_balance", "2026-09-20T11:00:00Z"),
  operation("op_4", "payment", "2026-09-20T11:00:00Z", {
    asset_type: "native",
    amount: "150.0000000",
  }),
];

export const MOCK_ONCHAIN_ASSETS: HeldAsset[] = [
  { code: "sUSDC", balance: "1842.2500000" },
  { code: "ABX", balance: "37.0000000" },
];

/** A checksum-valid account ID, so the sample's explorer link isn't a dead end. */
export const MOCK_ONCHAIN_ADDRESS = "GBQXKZDJN5RGY33DNNZS243BNVYGYZJNMFZHI2LTOQWTAMBQGAYDAOCF";

/** Demo summary for `NEXT_PUBLIC_USE_MOCK_DATA=true` and for signed-out artists. */
export const MOCK_ONCHAIN_SUMMARY: OnChainActivitySummary = summarizeOnChainActivity({
  address: MOCK_ONCHAIN_ADDRESS,
  xlmBalance: "11984.5000000",
  assets: MOCK_ONCHAIN_ASSETS,
  transactions: MOCK_ONCHAIN_TRANSACTIONS,
  operations: MOCK_ONCHAIN_OPERATIONS,
});
