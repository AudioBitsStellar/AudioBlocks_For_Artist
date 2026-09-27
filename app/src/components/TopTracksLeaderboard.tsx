"use client";

import { Trophy, TrendingDown, TrendingUp } from "lucide-react";
import { rankTopTracks, type TrackStat } from "@/utils/artistPortal";

interface TopTracksLeaderboardProps {
  tracks: TrackStat[];
  limit?: number;
}

export default function TopTracksLeaderboard({ tracks, limit = 10 }: TopTracksLeaderboardProps) {
  const ranked = rankTopTracks(tracks, limit);

  return (
    <div className="bg-[#1f2622] border border-[#2d3d2d] rounded-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <Trophy size={20} className="text-pink-500" aria-hidden="true" />
        <h2 className="text-white text-lg font-semibold">Top Tracks</h2>
      </div>

      {ranked.length === 0 ? (
        <p className="text-gray-400 text-sm">No plays recorded yet.</p>
      ) : (
        <ol className="space-y-3" aria-label="Top tracks leaderboard">
          {ranked.map((track) => (
            <li key={track.id} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-6 text-right text-gray-400 font-semibold" aria-label={`Rank ${track.rank}`}>
                  {track.rank}
                </span>
                <span className="text-white truncate">{track.title}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-pink-500 font-semibold">{track.plays.toLocaleString()} plays</span>
                {track.changePercent !== null && (
                  <span
                    className={`flex items-center gap-1 text-xs ${track.changePercent >= 0 ? "text-green-400" : "text-red-400"}`}
                    aria-label={`${track.changePercent >= 0 ? "Up" : "Down"} ${Math.abs(track.changePercent).toFixed(1)}%`}
                  >
                    {track.changePercent >= 0 ? (
                      <TrendingUp size={14} aria-hidden="true" />
                    ) : (
                      <TrendingDown size={14} aria-hidden="true" />
                    )}
                    {Math.abs(track.changePercent).toFixed(1)}%
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export { TopTracksLeaderboard };
