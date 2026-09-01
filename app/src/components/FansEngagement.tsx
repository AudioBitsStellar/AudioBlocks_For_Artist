"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { ChevronDown } from "lucide-react";
import { featureFlags } from "@/lib/featureFlags";
import MockDataBadge from "@/components/MockDataBadge";
import useFansEngagementServices from "@/services/fansEngagementService";
import { StreamingRegion, TopSong, TopStreamer } from "@/types";

const MOCK_TOP_SONGS: TopSong[] = [
  { rank: 1, name: "Tomothy Nguyen", listenings: 127 },
  { rank: 2, name: "Tomothy Nguyen", listenings: 104 },
  { rank: 3, name: "Evan Howard", listenings: 14 },
  { rank: 4, name: "Victoria Robertson", listenings: 53 },
  { rank: 5, name: "Leslie Cooper", listenings: 14 },
];

const MOCK_STREAMING_REGIONS: StreamingRegion[] = [
  { name: "Nigeria", value: 45, color: "#9333EA" },
  { name: "Cameroon", value: 20, color: "#EC4899" },
  { name: "S/ Africa", value: 15, color: "#885FA8" },
  { name: "USA", value: 15, color: "#8B2635" },
  { name: "UK", value: 5, color: "#374151" },
];

const MOCK_TOP_STREAMERS: TopStreamer[] = [
  { rank: 1, name: "Tomothy Nguyen", duration: "30d 24h 60m" },
  { rank: 2, name: "Tomothy Nguyen", duration: "24d 24h 60m" },
  { rank: 3, name: "Evan Howard", duration: "20d 24h 60m" },
  { rank: 4, name: "Victoria Robertson", duration: "16d 24h 60m" },
  { rank: 5, name: "Leslie Cooper", duration: "10d 24h 60m" },
];

function topStreamingRegionPercent(streamingRegions: StreamingRegion[]): number {
  return streamingRegions[0]?.value ?? 0;
}

function FansEngagementGrid({
  topSongs,
  streamingRegions,
  topStreamers,
  isMock,
}: {
  topSongs: TopSong[];
  streamingRegions: StreamingRegion[];
  topStreamers: TopStreamer[];
  isMock: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white text-xl font-semibold flex items-center">
          Fans Engagement
          {isMock && <MockDataBadge label="fans-engagement" />}
        </h2>
        <div className="relative">
          <select className="bg-[#161616] border border-gray-700 rounded-lg px-4 pr-8 py-2 text-white text-sm appearance-none cursor-pointer hover:border-gray-600 transition-colors">
            <option>Last Week</option>
          </select>
          <ChevronDown
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
            size={16}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 5 Songs */}
        <div className="bg-[#1E1E1E] rounded-lg p-6">
          <h3 className="text-white font-semibold mb-4">Top 5 Songs</h3>
          <div className="space-y-3">
            {topSongs.map((song) => (
              <div key={song.rank} className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">{song.rank}.</span>
                <span className="text-white text-sm flex-1 ml-2">{song.name}</span>
                <span className="text-gray-400 text-sm">{song.listenings} listenings</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Streaming Regions */}
        <div className="bg-[#1E1E1E]  mx-auto rounded-lg p-6">
          <h3 className="text-gray-400 font-semibold mb-4">Top Streaming Regions</h3>
          <div className="flex items-center gap-6">
            {/* Pie Chart on Left */}
            <div className="relative flex-shrink-0">
              <ResponsiveContainer width={150} height={150}>
                <PieChart>
                  <Pie
                    data={streamingRegions}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {streamingRegions.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-white text-2xl font-bold">
                  {topStreamingRegionPercent(streamingRegions)}%
                </p>
              </div>
            </div>

            {/* Ranked List on Right */}
            <div className="flex-1 space-y-2">
              {streamingRegions.map((region, index) => (
                <div key={index} className="text-gray-400 text-sm">
                  <span>{index + 1}. </span>
                  <span className="text-white">{region.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Streamers */}
        <div className="bg-[#1E1E1E] rounded-lg p-6">
          <h3 className="text-white font-semibold mb-4">Top Streamers</h3>
          <div className="space-y-3">
            {topStreamers.map((streamer) => (
              <div key={streamer.rank} className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">{streamer.rank}.</span>
                <span className="text-white text-sm flex-1 ml-2">{streamer.name}</span>
                <span className="text-gray-400 text-sm">{streamer.duration}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FansEngagementSkeleton() {
  return (
    <div role="status" aria-label="Loading fans engagement" aria-busy="true">
      <h2 className="text-white text-xl font-semibold mb-4">Fans Engagement</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="bg-[#1E1E1E] rounded-lg p-6 h-48 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function LiveFansEngagement() {
  const { useGetFansEngagement } = useFansEngagementServices();
  const { data, isLoading, isError } = useGetFansEngagement();

  if (isLoading) return <FansEngagementSkeleton />;

  if (isError || !data?.data) {
    return (
      <div>
        <h2 className="text-white text-xl font-semibold mb-4">Fans Engagement</h2>
        <p className="text-red-400 text-sm">
          Failed to load fans engagement data. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <FansEngagementGrid
      topSongs={data.data.topSongs}
      streamingRegions={data.data.streamingRegions}
      topStreamers={data.data.topStreamers}
      isMock={false}
    />
  );
}

export default function FansEngagement() {
  if (featureFlags.useMockFansEngagement) {
    return (
      <FansEngagementGrid
        topSongs={MOCK_TOP_SONGS}
        streamingRegions={MOCK_STREAMING_REGIONS}
        topStreamers={MOCK_TOP_STREAMERS}
        isMock
      />
    );
  }
  return <LiveFansEngagement />;
}

export { FansEngagement };
