import type { EngagementTrendPoint, EventItem, EventMetric } from "@/types/api";
import type { CheckInResult, CheckInStats, EventTicket } from "@/types";

// ─── Events ──────────────────────────────────────────────────────────────────
export const MOCK_EVENT_METRICS: EventMetric[] = [
  {
    label: "Total Events",
    value: "12",
    descriptor: "Live + Scheduled",
    gradient: "from-[#D2045B]/60 via-[#885FA8]/40 to-[#4F46E5]/60",
  },
  {
    label: "Ticket Earnings",
    value: "$3,250",
    descriptor: "Past 30 days",
    gradient: "from-[#1E1E1E] via-[#2A2A2A]/80 to-[#141414]",
  },
  {
    label: "Total Purchases",
    value: "$5,000.00",
    descriptor: "All-time GMV",
    gradient: "from-[#1E1E1E] via-[#2A2A2A]/80 to-[#141414]",
  },
];

export const MOCK_EVENTS: EventItem[] = [
  {
    id: 1,
    title: "Echoes of the Soul",
    date: "24/08/2025",
    time: "8:30PM",
    tickets: "100/1000 Tickets Left",
    price: "0.005ETH",
    image:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: 2,
    title: "Echoes of the Soul",
    date: "24/08/2025",
    time: "8:30PM",
    tickets: "100/1000 Tickets Left",
    price: "0.005ETH",
    image:
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: 3,
    title: "Echoes of the Soul",
    date: "24/08/2025",
    time: "8:30PM",
    tickets: "100/1000 Tickets Left",
    price: "0.005ETH",
    image:
      "https://images.unsplash.com/photo-1516280440619-37996c4e5b4e?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: 4,
    title: "Echoes of the Soul",
    date: "24/08/2025",
    time: "8:30PM",
    tickets: "100/1000 Tickets Left",
    price: "0.005ETH",
    image:
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafbd?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: 5,
    title: "Echoes of the Soul",
    date: "24/08/2025",
    time: "8:30PM",
    tickets: "100/1000 Tickets Left",
    price: "0.005ETH",
    image:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80",
  },
];

// ─── Event Fan Engagement ────────────────────────────────────────────────────
export const MOCK_EVENT_ENGAGEMENT_METRICS: EventMetric[] = [
  {
    label: "Total Fans Reached",
    value: "8,432",
    descriptor: "Across all events",
    gradient: "from-[#EC4899]/60 via-[#885FA8]/40 to-[#6366F1]/60",
  },
  {
    label: "Avg Engagement Rate",
    value: "68.4%",
    descriptor: "Attendance + interactions",
    gradient: "from-[#10B981]/60 via-[#34D399]/40 to-[#059669]/60",
  },
  {
    label: "Fan Growth",
    value: "+23.5%",
    descriptor: "vs previous 30 days",
    gradient: "from-[#F59E0B]/60 via-[#FBBF24]/40 to-[#D97706]/60",
  },
];

/**
 * Mock engagement trend data for the last 30 days.
 * Each entry records a date and the engagement score for that day.
 */
export const MOCK_ENGAGEMENT_TREND: EngagementTrendPoint[] = [
  ...Array.from({ length: 30 }, (_, i) => {
    const d = new Date("2025-07-01");
    d.setDate(d.getDate() + i);
    const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    // Generate semi-realistic engagement scores with an upward trend + noise
    const base = 45 + i * 0.8;
    const noise = Math.floor(Math.random() * 18 - 8);
    const score = Math.min(98, Math.max(10, Math.round(base + noise)));
    const attendees = Math.floor(Math.random() * 200 + 50 + i * 5);
    return { date: dateStr, score, attendees };
  }),
];

// ─── Tickets & check-in ──────────────────────────────────────────────────────
export const MOCK_TICKETS: EventTicket[] = [
  { id: "TICK-001", attendeeName: "Alice Johnson", tier: "VIP", purchasedAt: "2025-08-20" },
  { id: "TICK-002", attendeeName: "Bob Smith", tier: "General", purchasedAt: "2025-08-21" },
  { id: "TICK-003", attendeeName: "Carol White", tier: "General", purchasedAt: "2025-08-22" },
  { id: "TICK-004", attendeeName: "David Lee", tier: "VIP", purchasedAt: "2025-08-23" },
];

export const MOCK_CHECK_IN_RESULTS: Record<string, CheckInResult> = {
  "TICKET-001": { ticketId: "TICKET-001", status: "valid", attendeeName: "Alice Johnson" },
  "TICKET-002": { ticketId: "TICKET-002", status: "valid", attendeeName: "Bob Smith" },
  "TICKET-003": {
    ticketId: "TICKET-003",
    status: "already_checked_in",
    attendeeName: "Carol White",
  },
  "FAKE-001": { ticketId: "FAKE-001", status: "invalid" },
};

export const MOCK_CHECK_IN_STATS: CheckInStats = { total: 500, checkedIn: 127, remaining: 373 };
