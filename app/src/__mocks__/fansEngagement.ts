import type { StreamingRegion, TopSong, TopStreamer } from "@/types";

export const MOCK_TOP_SONGS: TopSong[] = [
  { rank: 1, name: "Tomothy Nguyen", listenings: 127 },
  { rank: 2, name: "Tomothy Nguyen", listenings: 104 },
  { rank: 3, name: "Evan Howard", listenings: 14 },
  { rank: 4, name: "Victoria Robertson", listenings: 53 },
  { rank: 5, name: "Leslie Cooper", listenings: 14 },
];

export const MOCK_STREAMING_REGIONS: StreamingRegion[] = [
  { name: "Nigeria", value: 45, color: "#9333EA" },
  { name: "Cameroon", value: 20, color: "#EC4899" },
  { name: "S/ Africa", value: 15, color: "#885FA8" },
  { name: "USA", value: 15, color: "#8B2635" },
  { name: "UK", value: 5, color: "#374151" },
];

export const MOCK_TOP_STREAMERS: TopStreamer[] = [
  { rank: 1, name: "Tomothy Nguyen", duration: "30d 24h 60m" },
  { rank: 2, name: "Tomothy Nguyen", duration: "24d 24h 60m" },
  { rank: 3, name: "Evan Howard", duration: "20d 24h 60m" },
  { rank: 4, name: "Victoria Robertson", duration: "16d 24h 60m" },
  { rank: 5, name: "Leslie Cooper", duration: "10d 24h 60m" },
];
