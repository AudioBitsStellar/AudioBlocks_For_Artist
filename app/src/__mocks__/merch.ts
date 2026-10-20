import type {
  MerchInventoryItem,
  MerchItem,
  MerchMetric,
  MerchOrder,
} from "@/services/merchService";

export const MOCK_MERCH_METRICS: MerchMetric[] = [
  {
    label: "Total Merch Items",
    value: "24",
    descriptor: "Live + Draft",
    gradient: "from-[#D2045B]/60 via-[#885FA8]/40 to-[#4F46E5]/60",
  },
  {
    label: "Merch Revenue",
    value: "$3,250",
    descriptor: "Past 30 days",
    gradient: "from-[#1E1E1E] via-[#2A2A2A]/80 to-[#141414]",
  },
  {
    label: "Average Basket",
    value: "$68.40",
    descriptor: "Per order",
    gradient: "from-[#1E1E1E] via-[#2A2A2A]/80 to-[#141414]",
  },
];

export const MOCK_MERCH_ITEMS: MerchItem[] = [
  {
    id: 1,
    title: "Echoes of the Soul",
    detail: "100/1000 Units Left",
    date: "24/08/2025",
    time: "8:30PM",
    price: "0.005ETH",
    image:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: 2,
    title: "Echoes of the Soul",
    detail: "100/1000 Units Left",
    date: "24/08/2025",
    time: "8:30PM",
    price: "0.005ETH",
    image:
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: 3,
    title: "Echoes of the Soul",
    detail: "100/1000 Units Left",
    date: "24/08/2025",
    time: "8:30PM",
    price: "0.005ETH",
    image:
      "https://images.unsplash.com/photo-1516280440619-37996c4e5b4e?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: 4,
    title: "Echoes of the Soul",
    detail: "100/1000 Units Left",
    date: "24/08/2025",
    time: "8:30PM",
    price: "0.005ETH",
    image:
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafbd?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: 5,
    title: "Echoes of the Soul",
    detail: "100/1000 Units Left",
    date: "24/08/2025",
    time: "8:30PM",
    price: "0.005ETH",
    image:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80",
  },
];

// ─── Inventory & orders ──────────────────────────────────────────────────────
export const MOCK_INVENTORY: MerchInventoryItem[] = [
  { id: 1, title: "Echoes of the Soul Tee", stock: 150, reserved: 12 },
  { id: 2, title: "AudioBlocks Hoodie", stock: 45, reserved: 8 },
  { id: 3, title: "Limited Edition Vinyl", stock: 200, reserved: 34 },
  { id: 4, title: "Signed Poster", stock: 0, reserved: 0 },
  { id: 5, title: "Sticker Pack", stock: 500, reserved: 67 },
];

export const MOCK_ORDERS: MerchOrder[] = [
  {
    id: 101,
    itemId: 1,
    itemTitle: "Echoes of the Soul Tee",
    quantity: 2,
    price: "29.99",
    status: "shipped",
    createdAt: "2025-08-20T10:00:00Z",
    updatedAt: "2025-08-22T14:30:00Z",
  },
  {
    id: 102,
    itemId: 3,
    itemTitle: "Limited Edition Vinyl",
    quantity: 1,
    price: "49.99",
    status: "pending",
    createdAt: "2025-08-24T08:15:00Z",
    updatedAt: "2025-08-24T08:15:00Z",
  },
  {
    id: 103,
    itemId: 5,
    itemTitle: "Sticker Pack",
    quantity: 3,
    price: "9.99",
    status: "processing",
    createdAt: "2025-08-25T16:00:00Z",
    updatedAt: "2025-08-25T16:00:00Z",
  },
  {
    id: 104,
    itemId: 2,
    itemTitle: "AudioBlocks Hoodie",
    quantity: 1,
    price: "59.99",
    status: "delivered",
    createdAt: "2025-08-18T12:00:00Z",
    updatedAt: "2025-08-21T09:00:00Z",
  },
];
