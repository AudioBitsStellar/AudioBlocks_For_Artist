/**
 * All mock data lives here. Once a surface's real API is live:
 *   1. Set its featureFlag to false
 *   2. Delete the relevant export from this file
 * No component logic needs to change.
 */

// ─── Overview Cards ──────────────────────────────────────────────────────────
export const MOCK_OVERVIEW_CARDS = [
  { title: 'Songs Published', value: '12', isFirst: true },
  { title: 'Total Earnings', value: '$3,250', isFirst: false },
  { title: 'Listeners Count', value: '$5,000.00', isFirst: false },
  { title: 'Most Streamed Region', value: '$50.00', isFirst: false },
];

// ─── Events ──────────────────────────────────────────────────────────────────
export const MOCK_EVENT_METRICS = [
  {
    label: 'Total Events',
    value: '12',
    descriptor: 'Live + Scheduled',
    gradient: 'from-[#D2045B]/60 via-[#885FA8]/40 to-[#4F46E5]/60',
  },
  {
    label: 'Ticket Earnings',
    value: '$3,250',
    descriptor: 'Past 30 days',
    gradient: 'from-[#1E1E1E] via-[#2A2A2A]/80 to-[#141414]',
  },
  {
    label: 'Total Purchases',
    value: '$5,000.00',
    descriptor: 'All-time GMV',
    gradient: 'from-[#1E1E1E] via-[#2A2A2A]/80 to-[#141414]',
  },
];

export const MOCK_EVENTS = [
  { id: 1, title: 'Echoes of the Soul', date: '24/08/2025', time: '8:30PM', tickets: '100/1000 Tickets Left', price: '0.005ETH', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80' },
  { id: 2, title: 'Echoes of the Soul', date: '24/08/2025', time: '8:30PM', tickets: '100/1000 Tickets Left', price: '0.005ETH', image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80' },
  { id: 3, title: 'Echoes of the Soul', date: '24/08/2025', time: '8:30PM', tickets: '100/1000 Tickets Left', price: '0.005ETH', image: 'https://images.unsplash.com/photo-1516280440619-37996c4e5b4e?auto=format&fit=crop&w=400&q=80' },
  { id: 4, title: 'Echoes of the Soul', date: '24/08/2025', time: '8:30PM', tickets: '100/1000 Tickets Left', price: '0.005ETH', image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafbd?auto=format&fit=crop&w=400&q=80' },
  { id: 5, title: 'Echoes of the Soul', date: '24/08/2025', time: '8:30PM', tickets: '100/1000 Tickets Left', price: '0.005ETH', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80' },
];

// ─── Merches ─────────────────────────────────────────────────────────────────
export const MOCK_MERCH_METRICS = [
  {
    label: 'Total Merch Items',
    value: '24',
    descriptor: 'Live + Draft',
    gradient: 'from-[#D2045B]/60 via-[#885FA8]/40 to-[#4F46E5]/60',
  },
  {
    label: 'Merch Revenue',
    value: '$3,250',
    descriptor: 'Past 30 days',
    gradient: 'from-[#1E1E1E] via-[#2A2A2A]/80 to-[#141414]',
  },
  {
    label: 'Average Basket',
    value: '$68.40',
    descriptor: 'Per order',
    gradient: 'from-[#1E1E1E] via-[#2A2A2A]/80 to-[#141414]',
  },
];

export const MOCK_MERCH_ITEMS = [
  { id: 1, title: 'Echoes of the Soul', detail: '100/1000 Units Left', date: '24/08/2025', time: '8:30PM', price: '0.005ETH', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80' },
  { id: 2, title: 'Echoes of the Soul', detail: '100/1000 Units Left', date: '24/08/2025', time: '8:30PM', price: '0.005ETH', image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80' },
  { id: 3, title: 'Echoes of the Soul', detail: '100/1000 Units Left', date: '24/08/2025', time: '8:30PM', price: '0.005ETH', image: 'https://images.unsplash.com/photo-1516280440619-37996c4e5b4e?auto=format&fit=crop&w=400&q=80' },
  { id: 4, title: 'Echoes of the Soul', detail: '100/1000 Units Left', date: '24/08/2025', time: '8:30PM', price: '0.005ETH', image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafbd?auto=format&fit=crop&w=400&q=80' },
  { id: 5, title: 'Echoes of the Soul', detail: '100/1000 Units Left', date: '24/08/2025', time: '8:30PM', price: '0.005ETH', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80' },
];
