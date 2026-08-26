"use client";

import { useState } from "react";
import {
  Settings,
  GripVertical,
  Eye,
  EyeOff,
  RotateCcw,
  Palette,
  LayoutGrid,
  X,
} from "lucide-react";
import {
  useDashboardCustomization,
  type DashboardWidget,
} from "@/context/DashboardCustomizationContext";

const ACCENT_COLORS = [
  { label: "Pink", value: "#D2045B" },
  { label: "Purple", value: "#885FA8" },
  { label: "Blue", value: "#3B82F6" },
  { label: "Green", value: "#10B981" },
  { label: "Orange", value: "#F97316" },
];

const CARD_STYLES = [
  { label: "Default", value: "default" as const },
  { label: "Compact", value: "compact" as const },
  { label: "Spacious", value: "spacious" as const },
];

export default function DashboardCustomizationPanel() {
  const { widgets, theme, toggleWidget, reorderWidgets, setTheme, resetToDefaults } =
    useDashboardCustomization();
  const [isOpen, setIsOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const sortedWidgets = [...widgets].sort((a, b) => a.order - b.order);

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    reorderWidgets(dragIndex, index);
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-full border border-[#2E2E2E] bg-[#111111] px-4 py-2 text-sm font-medium text-white transition-colors hover:border-[#885FA8]"
        aria-label="Customize dashboard"
      >
        <Settings className="h-4 w-4" />
        Customize
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative w-full max-w-sm bg-[#161616] border-l border-[#2A2A2A] overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2A2A2A] bg-[#161616] px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Customize Dashboard</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-[#A3A3A3] hover:text-white"
                aria-label="Close customization panel"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-8 p-6">
              {/* Widget Visibility & Order */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 text-[#A3A3A3]" />
                  <h3 className="text-sm font-semibold text-white">Widgets</h3>
                </div>
                <p className="text-xs text-[#6F6F6F]">
                  Toggle visibility or drag to reorder dashboard sections.
                </p>
                <div className="space-y-1">
                  {sortedWidgets.map((widget, index) => (
                    <div
                      key={widget.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors cursor-grab active:cursor-grabbing ${
                        dragIndex === index
                          ? "border-[#D2045B] bg-[#D2045B]/10"
                          : "border-[#1F1F1F] bg-[#111111] hover:border-[#2E2E2E]"
                      }`}
                    >
                      <GripVertical className="h-4 w-4 text-[#6F6F6F] flex-shrink-0" />
                      <span className="flex-1 text-sm text-white">{widget.label}</span>
                      <button
                        onClick={() => toggleWidget(widget.id)}
                        className={`flex-shrink-0 rounded-full p-1.5 transition-colors ${
                          widget.visible
                            ? "text-green-400 hover:bg-green-400/10"
                            : "text-[#6F6F6F] hover:bg-[#222]"
                        }`}
                        aria-label={`${widget.visible ? "Hide" : "Show"} ${widget.label}`}
                      >
                        {widget.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Theme */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-[#A3A3A3]" />
                  <h3 className="text-sm font-semibold text-white">Theme</h3>
                </div>

                {/* Accent Color */}
                <div className="space-y-2">
                  <label className="text-xs text-[#A3A3A3]">Accent Color</label>
                  <div className="flex gap-2">
                    {ACCENT_COLORS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setTheme({ accentColor: c.value })}
                        className={`h-8 w-8 rounded-full border-2 transition-colors ${
                          theme.accentColor === c.value
                            ? "border-white scale-110"
                            : "border-transparent hover:scale-105"
                        }`}
                        style={{ backgroundColor: c.value }}
                        aria-label={`${c.label} accent color`}
                      />
                    ))}
                  </div>
                </div>

                {/* Card Style */}
                <div className="space-y-2">
                  <label className="text-xs text-[#A3A3A3]">Card Density</label>
                  <div className="flex gap-2">
                    {CARD_STYLES.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setTheme({ cardStyle: s.value })}
                        className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                          theme.cardStyle === s.value
                            ? "bg-[#D2045B] text-white"
                            : "bg-[#222] text-[#A3A3A3] hover:text-white"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Show Metrics */}
                <div className="flex items-center justify-between">
                  <label className="text-xs text-[#A3A3A3]">Show KPI Metrics</label>
                  <button
                    onClick={() => setTheme({ showMetrics: !theme.showMetrics })}
                    className={`relative h-5 w-9 rounded-full transition-colors ${
                      theme.showMetrics ? "bg-[#D2045B]" : "bg-[#333]"
                    }`}
                  >
                    <div
                      className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                        theme.showMetrics ? "translate-x-4" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Reset */}
              <button
                onClick={resetToDefaults}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#2E2E2E] px-4 py-3 text-sm font-medium text-[#A3A3A3] transition-colors hover:border-red-500 hover:text-red-400"
              >
                <RotateCcw className="h-4 w-4" />
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
