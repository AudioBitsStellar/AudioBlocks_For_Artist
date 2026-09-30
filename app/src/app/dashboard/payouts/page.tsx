"use client";

import PayoutHistory from "@/components/PayoutHistory";
import WithdrawFunds from "@/components/WithdrawFunds";
import { EARNINGS_ENDPOINTS } from "@/api/api-endpoint";
import { usePost } from "@/api/queryClient";
import { DASHBOARD_QUERY_KEYS } from "@/api/cachePolicy";
import type { PayoutRecord, WithdrawInput } from "@/utils/artistPortal";

// Placeholder data until GET /artist/earnings/payouts is served by the backend.
const SAMPLE_PAYOUTS: PayoutRecord[] = [
  {
    id: "p-4",
    date: "2026-05-01",
    amount: "125.4",
    source: "royalties",
    status: "completed",
    txHash: "a1b2c3",
  },
  { id: "p-3", date: "2026-04-24", amount: "80", source: "merch", status: "pending" },
  { id: "p-2", date: "2026-04-17", amount: "42.1234567", source: "withdrawal", status: "failed" },
  {
    id: "p-1",
    date: "2026-04-10",
    amount: "98.75",
    source: "royalties",
    status: "completed",
    txHash: "d4e5f6",
  },
];
const SAMPLE_BALANCE = "250.5";

export default function PayoutsPage() {
  const withdraw = usePost<{ txHash: string }, WithdrawInput>(EARNINGS_ENDPOINTS.WITHDRAW, {
    invalidateQueries: [DASHBOARD_QUERY_KEYS.earnings],
  });

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-white text-2xl font-bold">Royalties &amp; Payouts</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PayoutHistory payouts={SAMPLE_PAYOUTS} />
        </div>
        <WithdrawFunds
          availableBalance={SAMPLE_BALANCE}
          onWithdraw={async (input) => (await withdraw.mutateAsync(input)).txHash}
        />
      </div>
    </main>
  );
}
