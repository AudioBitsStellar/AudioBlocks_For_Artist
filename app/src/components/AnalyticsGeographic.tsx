'use client';

import { GeographicData } from '@/services/analyticsService';
import { Globe } from 'lucide-react';

interface AnalyticsGeographicProps {
  data: GeographicData[];
}

export default function AnalyticsGeographic({ data }: AnalyticsGeographicProps) {
  const maxPlays = Math.max(...data.map((d) => d.plays));
  const sortedData = [...data].sort((a, b) => b.plays - a.plays);

  return (
    <div className="bg-[#1f2622] border border-[#2d3d2d] rounded-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <Globe size={20} className="text-pink-500" />
        <h3 className="text-white text-lg font-semibold">Geographic Distribution (Top 10)</h3>
      </div>

      <div className="space-y-4">
        {sortedData.map((item, index) => {
          const percentage = (item.plays / maxPlays) * 100;

          return (
            <div key={`${item.country}-${index}`} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{item.country}</p>
                  <p className="text-gray-500 text-sm">{item.region}</p>
                </div>
                <p className="text-pink-500 font-semibold">
                  {item.plays.toLocaleString()}
                </p>
              </div>
              <div className="w-full bg-[#2d3d2d] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-pink-500 to-pink-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                  aria-label={`${item.country}: ${percentage.toFixed(0)}%`}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-[#2d3d2d] rounded-lg border border-[#3d4d3d]">
        <p className="text-gray-400 text-sm">
          Total Plays from Top 10: {sortedData.reduce((sum, d) => sum + d.plays, 0).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
