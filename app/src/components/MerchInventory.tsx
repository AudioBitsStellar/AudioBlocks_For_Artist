"use client";

import { useState } from "react";
import {
  Package,
  TrendingUp,
  AlertTriangle,
  Search,
  Filter,
  Loader2,
  ShoppingCart,
  ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { featureFlags } from "@/lib/featureFlags";
import MockDataBadge from "@/components/MockDataBadge";
import useMerchService, {
  MerchInventoryItem,
  MerchOrder,
  updateStock,
  formatPrice,
} from "@/services/merchService";
import EmptyState from "./shared/EmptyState";

const MOCK_INVENTORY: MerchInventoryItem[] = [
  { id: 1, title: "Echoes of the Soul Tee", stock: 150, reserved: 12 },
  { id: 2, title: "AudioBlocks Hoodie", stock: 45, reserved: 8 },
  { id: 3, title: "Limited Edition Vinyl", stock: 200, reserved: 34 },
  { id: 4, title: "Signed Poster", stock: 0, reserved: 0 },
  { id: 5, title: "Sticker Pack", stock: 500, reserved: 67 },
];

const MOCK_ORDERS: MerchOrder[] = [
  { id: 101, itemId: 1, itemTitle: "Echoes of the Soul Tee", quantity: 2, price: "29.99", status: "shipped", createdAt: "2025-08-20T10:00:00Z", updatedAt: "2025-08-22T14:30:00Z" },
  { id: 102, itemId: 3, itemTitle: "Limited Edition Vinyl", quantity: 1, price: "49.99", status: "pending", createdAt: "2025-08-24T08:15:00Z", updatedAt: "2025-08-24T08:15:00Z" },
  { id: 103, itemId: 5, itemTitle: "Sticker Pack", quantity: 3, price: "9.99", status: "processing", createdAt: "2025-08-25T16:00:00Z", updatedAt: "2025-08-25T16:00:00Z" },
  { id: 104, itemId: 2, itemTitle: "AudioBlocks Hoodie", quantity: 1, price: "59.99", status: "delivered", createdAt: "2025-08-18T12:00:00Z", updatedAt: "2025-08-21T09:00:00Z" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  processing: "bg-blue-500/20 text-blue-400",
  shipped: "bg-purple-500/20 text-purple-400",
  delivered: "bg-green-500/20 text-green-400",
  cancelled: "bg-red-500/20 text-red-400",
};

export default function MerchInventory() {
  const { useGetMerchOrders } = useMerchService();
  const { data: apiOrders, isLoading: ordersLoading } = useGetMerchOrders();

  const [inventory, setInventory] = useState<MerchInventoryItem[]>(
    featureFlags.useMockMerches ? MOCK_INVENTORY : []
  );
  const [orders] = useState<MerchOrder[]>(
    featureFlags.useMockMerches ? MOCK_ORDERS : (apiOrders ?? [])
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"title" | "stock" | "reserved">("title");
  const [adjustingId, setAdjustingId] = useState<number | null>(null);
  const [adjustValue, setAdjustValue] = useState("");

  const isLoading = ordersLoading && !featureFlags.useMockMerches;

  const filteredInventory = inventory
    .filter((item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "stock") return b.stock - a.stock;
      if (sortBy === "reserved") return b.reserved - a.reserved;
      return a.title.localeCompare(b.title);
    });

  const totalStock = inventory.reduce((sum, i) => sum + i.stock, 0);
  const totalReserved = inventory.reduce((sum, i) => sum + i.reserved, 0);
  const lowStockCount = inventory.filter((i) => i.stock > 0 && i.stock <= 10).length;
  const outOfStockCount = inventory.filter((i) => i.stock === 0).length;

  const handleStockAdjust = (id: number, change: number) => {
    setInventory((prev) => updateStock(prev, id, change));
    toast.success(`Stock ${change > 0 ? "increased" : "decreased"} successfully`);
  };

  const handleManualAdjust = (id: number) => {
    const val = parseInt(adjustValue, 10);
    if (isNaN(val)) return;
    handleStockAdjust(id, val);
    setAdjustingId(null);
    setAdjustValue("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#D2045B]" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[#A3A3A3]">Inventory</p>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            Merch Inventory
            {featureFlags.useMockMerches && <MockDataBadge label="inventory" />}
          </h1>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Stock", value: totalStock, icon: Package, gradient: "from-[#D2045B]/60 via-[#885FA8]/40 to-[#4F46E5]/60" },
          { label: "Reserved", value: totalReserved, icon: ShoppingCart, gradient: "from-[#1E1E1E] via-[#2A2A2A]/80 to-[#141414]" },
          { label: "Low Stock", value: lowStockCount, icon: AlertTriangle, gradient: "from-[#F59E0B]/60 via-[#FBBF24]/40 to-[#D97706]/60" },
          { label: "Out of Stock", value: outOfStockCount, icon: TrendingUp, gradient: "from-[#EF4444]/60 via-[#F87171]/40 to-[#DC2626]/60" },
        ].map((m) => (
          <div key={m.label} className="relative overflow-hidden rounded-3xl p-[1px]">
            <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${m.gradient}`} aria-hidden />
            <div className="relative flex h-full flex-col justify-between rounded-3xl bg-[#121212] px-6 py-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">{m.label}</span>
                <m.icon className="h-4 w-4 text-[#A3A3A3]" />
              </div>
              <p className="text-3xl font-semibold text-white">{m.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Inventory Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Stock Levels</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search inventory"
                maxLength={100}
                className="w-full rounded-full border border-[#2E2E2E] bg-[#111111] py-2 pl-10 pr-4 text-sm text-white placeholder:text-gray-500 focus:border-[#885FA8] focus:outline-none"
              />
            </div>
            <button
              onClick={() => setSortBy(sortBy === "stock" ? "title" : sortBy === "title" ? "reserved" : "stock")}
              className="flex items-center justify-center gap-1 rounded-full border border-[#2E2E2E] bg-[#111111] px-4 py-2 text-sm font-medium text-white transition-colors hover:border-[#885FA8]"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {sortBy === "title" ? "Name" : sortBy === "stock" ? "Stock" : "Reserved"}
            </button>
          </div>
        </div>

        {filteredInventory.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No inventory items"
            description="Create merch items to start tracking inventory."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#1F1F1F] bg-[#151818]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1F1F1F] text-left">
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">Item</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">Stock</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">Reserved</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">Available</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item) => {
                  const available = item.stock - item.reserved;
                  const status =
                    item.stock === 0 ? "Out of Stock" : item.stock <= 10 ? "Low Stock" : "In Stock";
                  const statusColor =
                    item.stock === 0
                      ? "text-red-400"
                      : item.stock <= 10
                        ? "text-yellow-400"
                        : "text-green-400";

                  return (
                    <tr key={item.id} className="border-b border-[#1F1F1F] last:border-0">
                      <td className="px-6 py-4 text-sm font-medium text-white">{item.title}</td>
                      <td className="px-6 py-4 text-sm text-white">{item.stock}</td>
                      <td className="px-6 py-4 text-sm text-[#A3A3A3]">{item.reserved}</td>
                      <td className="px-6 py-4 text-sm text-white">{available}</td>
                      <td className={`px-6 py-4 text-sm font-medium ${statusColor}`}>{status}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleStockAdjust(item.id, 10)}
                            className="rounded-full border border-[#2E2E2E] px-3 py-1 text-xs font-medium text-green-400 transition-colors hover:border-green-500"
                          >
                            +10
                          </button>
                          <button
                            onClick={() => handleStockAdjust(item.id, -10)}
                            disabled={item.stock < 10}
                            className="rounded-full border border-[#2E2E2E] px-3 py-1 text-xs font-medium text-red-400 transition-colors hover:border-red-500 disabled:opacity-40"
                          >
                            -10
                          </button>
                          {adjustingId === item.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={adjustValue}
                                onChange={(e) => setAdjustValue(e.target.value)}
                                className="w-16 rounded border border-[#2E2E2E] bg-[#111111] px-2 py-1 text-xs text-white focus:border-[#885FA8] focus:outline-none"
                                placeholder="Qty"
                              />
                              <button
                                onClick={() => handleManualAdjust(item.id)}
                                className="rounded-full bg-[#D2045B] px-2 py-1 text-xs text-white"
                              >
                                OK
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setAdjustingId(item.id)}
                              className="rounded-full border border-[#2E2E2E] px-3 py-1 text-xs font-medium text-[#A3A3A3] transition-colors hover:border-[#885FA8] hover:text-white"
                            >
                              Custom
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Orders */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Recent Orders</h2>
        {orders.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="No orders yet"
            description="Orders will appear here once fans start purchasing merch."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#1F1F1F] bg-[#151818]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1F1F1F] text-left">
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">Order</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">Item</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">Qty</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">Total</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-[#1F1F1F] last:border-0">
                    <td className="px-6 py-4 text-sm font-mono text-[#A3A3A3]">#{order.id}</td>
                    <td className="px-6 py-4 text-sm text-white">{order.itemTitle}</td>
                    <td className="px-6 py-4 text-sm text-white">{order.quantity}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-white">
                      {formatPrice(parseFloat(order.price) * order.quantity)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[order.status] ?? "bg-gray-500/20 text-gray-400"}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#A3A3A3]">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
