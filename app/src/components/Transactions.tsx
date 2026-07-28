'use client';

import { Calendar, ChevronDown, ArrowUpDown } from 'lucide-react';
import { formatDate } from '@/utils/date';
import EmptyState from './shared/EmptyState';

export default function Transactions() {
  // Dates are real Date objects so we exercise Intl.DateTimeFormat end-to-end.
  // They render with the user's locale via the date utility (issue #177).
  const transactions = [
    { type: 'Royalty', song: 'Midnight Vibes', value: '$2,340.32', date: new Date('2025-06-03T00:00:00Z') },
    { type: 'Royalty', song: 'Midnight Vibes', value: '$2,340.32', date: new Date('2025-06-03T00:00:00Z') },
    { type: 'Royalty', song: 'Midnight Vibes', value: '$2,340.32', date: new Date('2025-06-03T00:00:00Z') },
    { type: 'Royalty', song: 'Midnight Vibes', value: '$2,340.32', date: new Date('2025-06-03T00:00:00Z') },
  ];

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
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted pointer-events-none" size={16} aria-hidden="true" />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" size={16} aria-hidden="true" />
            <select
              aria-label="Select date range"
              className="bg-surface-sunken border border-border rounded-lg pl-10 pr-8 py-2 text-text text-sm appearance-none cursor-pointer hover:border-border-subtle transition-colors"
            >
              <option>11 Nov - 11 Dec, 2026</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted pointer-events-none" size={16} aria-hidden="true" />
          </div>
        </div>
      </div>

      {transactions.length === 0 ? (
        <EmptyState
          icon={ArrowUpDown}
          title="No transactions yet"
          description="Your royalty payments and earnings will appear here once your music starts generating revenue."
        />
      ) : (
        <>
          {/* Mobile card layout — hidden on md and above */}
          <ul className="flex flex-col gap-3 md:hidden" aria-label="Transactions list">
            {transactions.map((transaction, index) => (
              <li
                key={index}
                className="bg-surface-sunken border border-border-subtle rounded-lg p-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-text text-sm font-semibold">{transaction.type}</span>
                  <span className="text-text text-sm font-semibold">{transaction.value}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-muted text-sm">{transaction.song}</span>
                  <span className="text-text-muted text-sm">
                    {formatDate(transaction.date, 'short')}
                  </span>
                </div>
                <button className="text-primary hover:text-primary-hover text-sm underline transition-colors self-start">
                  view
                </button>
              </li>
            ))}
          </ul>

          {/* Desktop table layout — hidden below md */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full" role="table" aria-label="Transactions list">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left text-text-muted text-sm font-semibold pb-3" scope="col">Type</th>
                  <th className="text-left text-text-muted text-sm font-semibold pb-3" scope="col">Song</th>
                  <th className="text-left text-text-muted text-sm font-semibold pb-3" scope="col">Value</th>
                  <th className="text-left text-text-muted text-sm font-semibold pb-3" scope="col">Date</th>
                  <th className="text-left text-text-muted text-sm font-semibold pb-3" scope="col">View</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction, index) => (
                  <tr key={index} className="border-b border-border-subtle">
                    <td className="text-text py-3 text-sm">{transaction.type}</td>
                    <td className="text-text py-3 text-sm">{transaction.song}</td>
                    <td className="text-text py-3 text-sm">{transaction.value}</td>
                    <td className="text-text-muted py-3 text-sm">
                      {/* Issue #177: shared locale-aware date util. */}
                      {formatDate(transaction.date, 'short')}
                    </td>
                    <td className="py-3">
                      <button className="text-primary hover:text-primary-hover text-sm underline transition-colors">
                        view
                      </button>
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
