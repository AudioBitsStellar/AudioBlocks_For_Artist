import { toArtistNotification } from "@/services/qualityCheckService";
import type { ArtistNotification } from "@/types/api";
import { MOCK_QUALITY_CHECKS } from "./qualityChecks";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

const BASE_MOCK_NOTIFICATIONS: ArtistNotification[] = [
  {
    id: "notif_1",
    kind: "newFan",
    title: "New fan",
    message: "Tomothy Nguyen started following you.",
    createdAt: ago(5 * MINUTE),
    read: false,
    href: "/dashboard/messages",
  },
  {
    id: "notif_2",
    kind: "earnings",
    title: "Royalty payout sent",
    message: "Your weekly royalty payout of 125.40 XLM was sent to your wallet.",
    createdAt: ago(2 * HOUR),
    read: false,
    href: "/dashboard/overview",
  },
  {
    id: "notif_3",
    kind: "eventReminder",
    title: "Show tomorrow",
    message: "Lagos Live Sessions starts tomorrow at 8:00 PM. 42 tickets remain.",
    createdAt: ago(5 * HOUR),
    read: false,
    href: "/dashboard/events",
  },
  {
    id: "notif_4",
    kind: "newFan",
    title: "New fan",
    message: "Victoria Robertson added “Midnight Drive” to a playlist.",
    createdAt: ago(26 * HOUR),
    read: true,
  },
  {
    id: "notif_5",
    kind: "earnings",
    title: "Sales milestone",
    message: "“Midnight Drive” passed 1,000 streams this month.",
    createdAt: ago(3 * 24 * HOUR),
    read: true,
    href: "/dashboard/analytics",
  },
];

/**
 * The demo feed: the hand-written events above plus one notification per mock
 * AI quality-check result, so the bell shows the #465 kinds in mock mode
 * without a backend.
 */
export const MOCK_NOTIFICATIONS: ArtistNotification[] = [
  ...BASE_MOCK_NOTIFICATIONS,
  ...MOCK_QUALITY_CHECKS.map(toArtistNotification),
];
