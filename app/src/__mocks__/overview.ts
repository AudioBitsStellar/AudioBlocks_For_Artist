import type { OverviewKpi } from "@/types";

/** Overview KPI cards — shaped like `GET /overview`, so it goes through the same formatting. */
export const MOCK_OVERVIEW_KPI: OverviewKpi = {
  songsPublished: 12,
  totalEarnings: 3250,
  listenersCount: 5000,
  mostStreamedRegion: "Nigeria",
};
