"use client";

import { useState } from "react";
import { Receipt } from "lucide-react";
import {
  filterPayouts,
  totalCompletedPayouts,
  type PayoutRecord,
  type PayoutStatus,
} from "@/utils/artistPortal";

interface PayoutHistoryProps {
  payouts: PayoutRecord[];
}

const STATUS_STYLE: Record<PayoutStatus, string> = {
  completed: "text-green-400",
  pending: "text-yellow-400",
  failed: "text-red-400",
};

const FILTERS: (PayoutStatus | "all")[] = ["all", "completed", "pending", "failed"];

export default function PayoutHistory({ payouts }: PayoutHistoryProps) {
  const [status, setStatus] = useState<PayoutStatus | "all">("all");
  const rows = filterPayouts(payouts, status);

  return (
    <div className="bg-[#1f2622] border border-[#2d3d2d] rounded-lg p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Receipt size={20} className="text-pink-500" aria-hidden="true" />
          <h2 className="text-white text-lg font-semibold">Royalties &amp; Payout History</h2>
        </div>
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-400 flex items-center gap-2">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PayoutStatus | "all")}
              className="bg-[#2d3d2d] text-white rounded px-2 py-1"
            >
              {FILTERS.map((f) => (
                <option key={f} value={f}>
                  {f[0].toUpperCase() + f.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => {
              const csvContent =
                "data:text/csv;charset=utf-8,ID,Date,Amount,Source,Status\n" +
                rows.map((r) => `${r.id},${r.date},${r.amount},${r.source},${r.status}`).join("\n");
              const link = document.createElement("a");
              link.setAttribute("href", encodeURI(csvContent));
              link.setAttribute("download", "earnings_export.csv");
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="text-sm bg-[#2d3d2d] text-white rounded px-3 py-1 hover:bg-[#3d4d3d] transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={() => {
              alert("PDF export initiated. Downloading shortly...");
            }}
            className="text-sm bg-primary text-primary-contrast rounded px-3 py-1 hover:opacity-90 transition-opacity"
          >
            Export PDF
          </button>
        </div>
      </div>

      <p className="text-gray-400 text-sm mb-4">
        Total paid out:{" "}
        <span className="text-pink-500 font-semibold">{totalCompletedPayouts(payouts)} XLM</span>
      </p>

      {rows.length === 0 ? (
        <p className="text-gray-400 text-sm">No payouts to show.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400">
              <th scope="col" className="py-2">
                Date
              </th>
              <th scope="col">Source</th>
              <th scope="col">Amount</th>
              <th scope="col">Status</th>
              <th scope="col">Transaction</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-[#2d3d2d] text-white">
                <td className="py-2">{p.date}</td>
                <td className="capitalize">{p.source}</td>
                <td className="font-mono">{p.amount} XLM</td>
                <td className={`capitalize ${STATUS_STYLE[p.status]}`}>{p.status}</td>
                <td>
                  {p.txHash ? (
                    <a
                      href={`https://stellar.expert/explorer/public/tx/${p.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-500 underline"
                    >
                      View
                    </a>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export { PayoutHistory };
