"use client";

import { useCrossfade } from "@/hooks/useCrossfade";

const DURATION_PRESETS = [0, 1, 2, 3, 5, 8, 12];

export function CrossfadeControl() {
  const { crossfadeEnabled, crossfadeDuration, setCrossfadeEnabled, setCrossfadeDuration } =
    useCrossfade();

  return (
    <div className="flex items-center gap-3">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <div className="relative">
          <input
            type="checkbox"
            checked={crossfadeEnabled}
            onChange={(e) => setCrossfadeEnabled(e.target.checked)}
            className="sr-only peer"
          />
          <div className="h-5 w-9 rounded-full bg-[#333] peer-checked:bg-[#D2045B] transition-colors" />
          <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
        </div>
        <span className="text-xs text-[#A3A3A3] font-medium">Crossfade</span>
      </label>

      {crossfadeEnabled && (
        <div className="flex items-center gap-1.5">
          {DURATION_PRESETS.map((d) => (
            <button
              key={d}
              onClick={() => setCrossfadeDuration(d)}
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                crossfadeDuration === d
                  ? "bg-[#D2045B] text-white"
                  : "bg-[#222] text-[#A3A3A3] hover:text-white"
              }`}
              aria-label={`${d} second crossfade`}
            >
              {d}s
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
