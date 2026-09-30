"use client";

import { GeographicData } from "@/services/analyticsService";
import { Globe } from "lucide-react";

interface AnalyticsGeographicProps {
  data: GeographicData[];
}

export default function AnalyticsGeographic({ data }: AnalyticsGeographicProps) {
  const maxPlays = Math.max(...data.map((d) => d.plays));
  const sortedData = [...data].sort((a, b) => b.plays - a.plays);

  if (data.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <Globe size={20} className="text-primary" aria-hidden="true" />
          <h2 className="text-text text-lg font-semibold">Geographic Distribution (Top 10)</h2>
        </div>
        <p className="text-text-muted text-sm">No geographic data available yet.</p>
      </div>
    );
  }

  const totalPlays = sortedData.reduce((sum, d) => sum + d.plays, 0);

  return (
    <div className="bg-surface border border-border rounded-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <Globe size={20} className="text-primary" aria-hidden="true" />
        <h2 className="text-text text-lg font-semibold">Geographic Distribution (Top 10)</h2>
      </div>

      <div className="space-y-4" role="region" aria-label="Geographic play distribution">
        {sortedData.map((item, index) => {
          const percentage = (item.plays / maxPlays) * 100;

          return (
            <div key={`${item.country}-${index}`} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text font-medium">{item.country}</p>
                  <p className="text-text-subtle text-sm">{item.region}</p>
                </div>
                <p
                  className="text-primary font-semibold"
                  aria-label={`${item.plays.toLocaleString()} plays`}
                >
                  {item.plays.toLocaleString()}
                </p>
              </div>
              <div
                className="w-full bg-surface-sunken rounded-full h-2 overflow-hidden"
                role="progressbar"
                aria-valuenow={Math.round(percentage)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${item.country} play distribution: ${percentage.toFixed(0)}%`}
              >
                <div
                  className="bg-gradient-to-r from-primary to-secondary h-full rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                  aria-hidden="true"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-surface-sunken rounded-lg border border-border">
        <p className="text-text-muted text-sm">
          Total Plays from Top 10:{" "}
          <span className="text-primary font-semibold">{totalPlays.toLocaleString()}</span>
        </p>
      </div>
    </div>
  );
}

export { AnalyticsGeographic };
