"use client";

import React from "react";
import { Users, Smartphone, PieChart } from "lucide-react";
import type { DemographicsData } from "@/services/analyticsService";

interface AnalyticsDemographicsProps {
  data?: DemographicsData;
}

export default function AnalyticsDemographics({ data }: AnalyticsDemographicsProps) {
  if (!data) return null;

  const { age = [], gender = [], device = [] } = data;

  return (
    <div
      className="bg-[#1f2622] border border-[#2d3d2d] rounded-lg p-6 space-y-6 mb-8"
      role="region"
      aria-label="Listener Demographics Breakdown"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white text-xl font-bold flex items-center gap-2">
            <Users size={20} className="text-emerald-400" aria-hidden="true" />
            Listener Demographics Breakdown
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Audience age ranges, gender identity, and playback devices.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Age Demographics */}
        <div className="bg-[#161b18] border border-[#2A2A2A] rounded-lg p-4 space-y-3">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <PieChart size={16} className="text-emerald-400" aria-hidden="true" />
            Age Distribution
          </h3>
          <div className="space-y-2.5">
            {age.map((item) => (
              <div key={item.range} className="space-y-1">
                <div className="flex justify-between text-xs text-gray-300">
                  <span>{item.range} years</span>
                  <span className="font-mono font-medium">{item.percentage}%</span>
                </div>
                <div className="w-full bg-[#2A2A2A] rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
                    role="progressbar"
                    aria-valuenow={item.percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Age ${item.range}: ${item.percentage}%`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gender Breakdown */}
        <div className="bg-[#161b18] border border-[#2A2A2A] rounded-lg p-4 space-y-3">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <Users size={16} className="text-emerald-400" aria-hidden="true" />
            Gender Breakdown
          </h3>
          <div className="space-y-2.5">
            {gender.map((item) => (
              <div key={item.category} className="space-y-1">
                <div className="flex justify-between text-xs text-gray-300">
                  <span>{item.category}</span>
                  <span className="font-mono font-medium">{item.percentage}%</span>
                </div>
                <div className="w-full bg-[#2A2A2A] rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-teal-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
                    role="progressbar"
                    aria-valuenow={item.percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${item.category}: ${item.percentage}%`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Device Breakdown */}
        <div className="bg-[#161b18] border border-[#2A2A2A] rounded-lg p-4 space-y-3">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <Smartphone size={16} className="text-emerald-400" aria-hidden="true" />
            Listening Devices
          </h3>
          <div className="space-y-2.5">
            {device.map((item) => (
              <div key={item.device} className="space-y-1">
                <div className="flex justify-between text-xs text-gray-300">
                  <span>{item.device}</span>
                  <span className="font-mono font-medium">{item.percentage}%</span>
                </div>
                <div className="w-full bg-[#2A2A2A] rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-cyan-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
                    role="progressbar"
                    aria-valuenow={item.percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${item.device}: ${item.percentage}%`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
