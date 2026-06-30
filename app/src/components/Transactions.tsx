'use client';

import { Calendar, ChevronDown } from 'lucide-react';

export default function Transactions() {
  const transactions = [
    { type: 'Royalty', song: 'Midnight Vibes', value: '$2,340.32', date: 'Jun 3, 2025' },
    { type: 'Royalty', song: 'Midnight Vibes', value: '$2,340.32', date: 'Jun 3, 2025' },
    { type: 'Royalty', song: 'Midnight Vibes', value: '$2,340.32', date: 'Jun 3, 2025' },
    { type: 'Royalty', song: 'Midnight Vibes', value: '$2,340.32', date: 'Jun 3, 2025' },
  ];

  return (
    <div className="bg-[#1E1E1E] rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white text-xl font-semibold">Transactions</h2>
        <div className="flex gap-2">
          <div className="relative">
            <select 
              aria-label="Filter transactions by time range"
              className="bg-[#161616] border border-gray-700 rounded-lg px-4 pr-8 py-2 text-white text-sm appearance-none cursor-pointer hover:border-gray-600 transition-colors"
            >
              <option>Last Week</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} aria-hidden="true" />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} aria-hidden="true" />
            <select 
              aria-label="Select date range"
              className="bg-[#161616] border border-gray-700 rounded-lg pl-10 pr-8 py-2 text-white text-sm appearance-none cursor-pointer hover:border-gray-600 transition-colors"
            >
              <option>11 Nov - 11 Dec, 2026</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full" role="table" aria-label="Transactions list">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left text-gray-400 text-sm font-semibold pb-3" scope="col">Type</th>
              <th className="text-left text-gray-400 text-sm font-semibold pb-3" scope="col">Song</th>
              <th className="text-left text-gray-400 text-sm font-semibold pb-3" scope="col">Value</th>
              <th className="text-left text-gray-400 text-sm font-semibold pb-3" scope="col">Date</th>
              <th className="text-left text-gray-400 text-sm font-semibold pb-3" scope="col">View</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction, index) => (
              <tr key={index} className="border-b border-gray-800">
                <td className="text-white py-3 text-sm">{transaction.type}</td>
                <td className="text-white py-3 text-sm">{transaction.song}</td>
                <td className="text-white py-3 text-sm">{transaction.value}</td>
                <td className="text-gray-400 py-3 text-sm">{transaction.date}</td>
                <td className="py-3">
                  <button className="text-purple-600 hover:text-purple-400 text-sm underline transition-colors">
                    view
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

