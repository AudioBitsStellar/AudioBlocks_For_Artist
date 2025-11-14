'use client';

import { Area, AreaChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Calendar, ChevronDown } from 'lucide-react';

const earningsData = [
  { month: 'Jan', earnings: 3500, royalties: 4200 },
  { month: 'Feb', earnings: 3200, royalties: 4800 },
  { month: 'Mar', earnings: 4700, royalties: 3200 },
  { month: 'Apr', earnings: 4600, royalties: 5700 },
  { month: 'May', earnings: 4400, royalties: 2100 },
  { month: 'Jun', earnings: 4892, royalties: 6400 },
  { month: 'Jul', earnings: 4700, royalties: 5900 },
  { month: 'Aug', earnings: 5000, royalties: 6500 },
  { month: 'Sep', earnings: 4800, royalties: 6700 },
  { month: 'Oct', earnings: 5300, royalties: 7000 },
];

const CustomTooltip = ({ active, payload, coordinate }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    if (data.month === 'Jun') {
      // Show royalties value for June since the dot is on the royalties line
      const displayValue = data.royalties;
      return (
        <g>
          <rect
            x={coordinate.x - 30}
            y={coordinate.y - 35}
            width={60}
            height={28}
            rx={8}
            fill="#EC4899"
          />
          <text
            x={coordinate.x}
            y={coordinate.y - 18}
            textAnchor="middle"
            fill="white"
            fontSize={14}
            fontWeight="600"
          >
            ${displayValue.toLocaleString()}
          </text>
        </g>
      );
    }
  }
  return null;
};

const CustomDot = ({ cx, cy, payload }: any) => {
  if (payload.month === 'Jun') {
    return (
      <g>
        <circle cx={cx} cy={cy} r={6} fill="#EC4899" />
      </g>
    );
  }
  return null;
};

export default function EarningsRoyalties() {
  return (
    <div className="bg-[#151918] rounded-lg p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <h2 className="text-white text-xl font-bold mb-4">Earnings & Royalties</h2>
          <div className="flex items-baseline gap-4">
            <p className="text-white text-3xl font-bold">$34,742.00</p>
            <p className="text-gray-400 text-sm">This is $54.00 less than last month</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <select className="bg-[#161616] border border-gray-700 rounded-lg px-4 pr-8 py-2 text-white text-sm appearance-none cursor-pointer hover:border-gray-600 transition-colors">
              <option>Royalties</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <select className="bg-[#161616] border border-gray-700 rounded-lg pl-10 pr-8 py-2 text-white text-sm appearance-none cursor-pointer hover:border-gray-600 transition-colors">
              <option>11 Nov - 11 Dec, 2026</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={earningsData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorValue" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#D2045B" stopOpacity={0.35} />
                <stop offset="97.33%" stopColor="#D2045B" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#885FA8" stopOpacity={0.35} />
              </linearGradient>
              <linearGradient id="colorValueVerticalFade" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopOpacity={1} />
                <stop offset="100%" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="transparent" vertical={false} />
            <XAxis 
              dataKey="month" 
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#9CA3AF' }}
              axisLine={{ stroke: '#374151' }}
            />
            <YAxis 
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#9CA3AF' }}
              tickFormatter={(value) => `$${value}`}
              axisLine={{ stroke: '#374151' }}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Earnings: filled background WITHOUT line */}
            <Area
              type="monotone"
              dataKey="earnings"
              stroke="transparent"
              strokeWidth={0}
              fill="url(#colorValue)"
              dot={false}
            />
            {/* Royalties: line WITHOUT fill (runs above earnings) */}
            <Line
              type="monotone"
              dataKey="royalties"
              stroke="#885FA8"
              strokeWidth={1.4}
              dot={<CustomDot />}
              activeDot={false}
            />
            <ReferenceLine 
              x="Jun" 
              stroke="white" 
              strokeWidth={1} 
              strokeDasharray="2 2"
              opacity={0.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

