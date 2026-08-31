"use client";

import { Calendar, ChevronDown, ArrowUpDown } from "lucide-react";
import { formatDate } from "@/utils/date";
import EmptyState from "./shared/EmptyState";
import useTransactionServices from "@/services/transactionService";

export default function Transactions() {
  const { data, isLoading, isError, refetch } = useTransactionServices().useGetTransactions();
  const transactions = data?.data ?? [];

  return (
    <div className="bg-surface-raised rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-text text-xl font-semibold">Transactions</h2>
        <div className="flex gap-2">
          <div className="relative">
            <select
              aria-label="Filter transactions by time range"
              className="bg-surface-sunken border border-border rounded-lg px-4 pr-8 py-2 text-text text-sm appearance-none cursor-pointer hover:border-border-subtle transition-colors"
            >
              <option>Last Week</option>
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted pointer-events-none"
              size={16}
              aria-hidden="true"
            />
          </div>
          <div className="relative">
            <Calendar
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted"
              size={16}
              aria-hidden="true"
            />
            <select
              aria-label="Select date range"
              className="bg-surface-sunken border border-border rounded-lg pl-10 pr-8 py-2 text-text text-sm appearance-none cursor-pointer hover:border-border-subtle transition-colors"
            >
              <option>11 Nov - 11 Dec, 2026</option>
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted pointer-events-none"
              size={16}
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-text-muted" role="status">
          Loading transactions...
        </div>
      ) : isError ? (
        <EmptyState
          icon={ArrowUpDown}
          title="Unable to load transactions"
          description="We could not fetch your latest royalty payments and earnings."
          ctaLabel="Retry"
          onCta={() => refetch()}
        />
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={ArrowUpDown}
          title="No transactions yet"
          description="Your royalty payments and earnings will appear here once your music starts generating revenue."
        />
      ) : (
        <>
          {/* Mobile card layout — hidden on md and above */}
          <ul className="flex flex-col gap-3 md:hidden" aria-label="Transactions list">
            {transactions.map((transaction) => (
              <li
                key={transaction.id}
                className="bg-surface-sunken border border-border-subtle rounded-lg p-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-text text-sm font-semibold">{transaction.type}</span>
                  <span className="text-text text-sm font-semibold">{transaction.value}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-muted text-sm">{transaction.song}</span>
                  <span className="text-text-muted text-sm">
                    {formatDate(new Date(transaction.date), "short")}
                  </span>
                </div>
                {transaction.receiptUrl ? (
                  <a
                    href={transaction.receiptUrl}
                    className="text-primary hover:text-primary-hover text-sm underline transition-colors self-start"
                  >
                    view
                  </a>
                ) : null}
              </li>
            ))}
          </ul>

          {/* Desktop table layout — hidden below md */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full" role="table" aria-label="Transactions list">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left text-text-muted text-sm font-semibold pb-3" scope="col">
                    Type
                  </th>
                  <th className="text-left text-text-muted text-sm font-semibold pb-3" scope="col">
                    Song
                  </th>
                  <th className="text-left text-text-muted text-sm font-semibold pb-3" scope="col">
                    Value
                  </th>
                  <th className="text-left text-text-muted text-sm font-semibold pb-3" scope="col">
                    Date
                  </th>
                  <th className="text-left text-text-muted text-sm font-semibold pb-3" scope="col">
                    View
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-border-subtle">
                    <td className="text-text py-3 text-sm">{transaction.type}</td>
                    <td className="text-text py-3 text-sm">{transaction.song}</td>
                    <td className="text-text py-3 text-sm">{transaction.value}</td>
                    <td className="text-text-muted py-3 text-sm">
                      {/* Issue #177: shared locale-aware date util. */}
                      {formatDate(new Date(transaction.date), "short")}
                    </td>
                    <td className="py-3">
                      {transaction.receiptUrl ? (
                        <a
                          href={transaction.receiptUrl}
                          className="text-primary hover:text-primary-hover text-sm underline transition-colors"
                        >
                          view
                        </a>
                      ) : (
                        <span className="text-text-muted text-sm">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export { Transactions };
