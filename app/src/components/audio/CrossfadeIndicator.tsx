"use client";

import { useCrossfade } from "@/hooks/useCrossfade";

/**
 * Visual indicator shown during an active crossfade transition.
 * Displays two bars: one fading out (current track) and one fading in (next track).
 */
export function CrossfadeIndicator() {
  const { isCrossfading, fadeOutVolume, fadeInVolume } = useCrossfade();

  if (!isCrossfading) return null;

  return (
    <div className="flex items-center gap-2 px-2" aria-label="Crossfading between tracks">
      <div className="flex-1 h-1.5 rounded-full bg-[#222] overflow-hidden">
        <div
          className="h-full bg-[#D2045B] rounded-full transition-all duration-100"
          style={{ width: `${fadeOutVolume * 100}%` }}
          aria-label={`Outgoing track volume: ${Math.round(fadeOutVolume * 100)}%`}
        />
      </div>
      <span className="text-[9px] text-[#A3A3A3] font-medium tabular-nums">
        {Math.round(fadeInVolume * 100)}%
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-[#222] overflow-hidden">
        <div
          className="h-full bg-[#885FA8] rounded-full transition-all duration-100"
          style={{ width: `${fadeInVolume * 100}%` }}
          aria-label={`Incoming track volume: ${Math.round(fadeInVolume * 100)}%`}
        />
      </div>
    </div>
  );
}
