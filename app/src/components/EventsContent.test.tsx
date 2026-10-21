import { describe, it, expect } from "vitest";
import { summarizeEngagement } from "./EventsContent";
import type { EngagementTrendPoint, EventMetric } from "@/types/api";

const trend: EngagementTrendPoint[] = [
  { date: "2026-10-01", score: 10, attendees: 5 },
  { date: "2026-10-02", score: 20, attendees: 15 },
];

const apiMetrics: EventMetric[] = [
  { label: "Total Fans Reached", value: "99", descriptor: "all time", gradient: "from-a to-b" },
  { label: "Avg Engagement Rate", value: "9%", descriptor: "all time", gradient: "from-c to-d" },
  { label: "Fan Growth", value: "1%", descriptor: "all time", gradient: "from-e to-f" },
];

describe("summarizeEngagement", () => {
  it("derives the summary cards from the selected trend window", () => {
    const cards = summarizeEngagement(trend, "7", apiMetrics);

    expect(cards.map((card) => [card.label, card.value, card.descriptor])).toEqual([
      ["Total Fans Reached", "20", "Last 7 days"],
      ["Avg Engagement Rate", "15.0%", "Last 7 days"],
      ["Fan Growth", "+100.0%", "Last 7 days"],
    ]);
  });

  it("reuses the API gradient for each metric label", () => {
    const cards = summarizeEngagement(trend, "30", apiMetrics);

    expect(cards.map((card) => card.gradient)).toEqual(["from-a to-b", "from-c to-d", "from-e to-f"]);
  });

  it("returns the API metrics unchanged when there is no trend data", () => {
    expect(summarizeEngagement([], "30", apiMetrics)).toBe(apiMetrics);
  });
});
