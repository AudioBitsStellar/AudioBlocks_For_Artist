import indexedActivityResponse from "./openapi/indexed-activity.json";
import type { IndexedActivityResponse } from "@/lib/onchainIndexer";
import {
  summarizeIndexedActivity,
  type OnChainActivitySummary,
} from "@/services/onchainStatsService";

export const MOCK_INDEXED_ACTIVITY_RESPONSE = indexedActivityResponse as IndexedActivityResponse;
export const MOCK_ONCHAIN_ADDRESS = "GBQXKZDJN5RGY33DNNZS243BNVYGYZJNMFZHI2LTOQWTAMBQGAYDAOCF";
export const MOCK_ONCHAIN_SUMMARY: OnChainActivitySummary = summarizeIndexedActivity(
  MOCK_ONCHAIN_ADDRESS,
  MOCK_INDEXED_ACTIVITY_RESPONSE.data
);
