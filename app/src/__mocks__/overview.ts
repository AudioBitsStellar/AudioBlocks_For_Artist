import artistStatsResponse from "./openapi/artist-stats.json";
import { overviewFromStats, type ArtistStats } from "@/services/overviewService";

export const MOCK_ARTIST_STATS = artistStatsResponse.data as ArtistStats;
export const MOCK_OVERVIEW_DATA = overviewFromStats(MOCK_ARTIST_STATS);
