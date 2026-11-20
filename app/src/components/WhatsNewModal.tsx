"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, X, ExternalLink, CheckCircle } from "lucide-react";
import { ChangelogRelease, isUnreleased } from "@/lib/changelog";

export const WHATS_NEW_STORAGE_KEY = "audioblocks:whats-new:last-seen";

interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
  latestRelease?: ChangelogRelease | null;
}

export default function WhatsNewModal({
  isOpen,
  onClose,
  latestRelease,
}: WhatsNewModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleDismiss = () => {
    if (dontShowAgain && latestRelease && typeof window !== "undefined") {
      const releaseId = isUnreleased(latestRelease)
        ? "unreleased"
        : latestRelease.version;
      localStorage.setItem(WHATS_NEW_STORAGE_KEY, releaseId);
    }
    onClose();
  };

  if (!isOpen) return null;

  const versionLabel = latestRelease
    ? isUnreleased(latestRelease)
      ? "Upcoming Features"
      : `Version ${latestRelease.version} (${latestRelease.date})`
    : "Latest Updates";

  // Gather top items from latest release
  const highlights = latestRelease
    ? latestRelease.sections.flatMap((section) =>
        section.entries.map((entry) => ({
          type: section.type,
          summary: entry.summary,
        })),
      ).slice(0, 5)
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="whats-new-title"
    >
      <div className="relative w-full max-w-lg bg-[#181f1b] border border-[#2d3d2d] rounded-2xl shadow-2xl p-6 text-white overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between mb-4 pb-4 border-b border-[#2d3d2d]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Sparkles size={22} aria-hidden="true" />
            </div>
            <div>
              <h2 id="whats-new-title" className="text-xl font-bold text-white">
                What&apos;s New
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">{versionLabel}</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Close what's new dialog"
            className="text-gray-400 hover:text-white rounded-lg p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Content Highlights */}
        <div className="my-4 space-y-3 max-h-[320px] overflow-y-auto pr-1">
          {highlights.length > 0 ? (
            highlights.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-[#131715] border border-[#243327] rounded-xl flex items-start gap-3"
              >
                <CheckCircle
                  className="text-emerald-400 mt-0.5 shrink-0"
                  size={16}
                  aria-hidden="true"
                />
                <div className="text-sm text-gray-200 leading-snug">
                  <span className="inline-block text-[11px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded mr-2 bg-emerald-500/20 text-emerald-300">
                    {item.type}
                  </span>
                  {item.summary}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400 py-4 text-center">
              Explore the latest features and platform improvements in release notes.
            </p>
          )}
        </div>

        {/* Footer controls */}
        <div className="mt-6 pt-4 border-t border-[#2d3d2d] flex flex-col sm:flex-row items-center justify-between gap-4">
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-[#2d3d2d] bg-[#121614] text-emerald-500 focus:ring-emerald-400"
            />
            <span>Don&apos;t show again for this release</span>
          </label>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <Link
              href="/dashboard/changelog"
              onClick={handleDismiss}
              className="text-xs text-emerald-400 hover:underline inline-flex items-center gap-1 font-medium"
            >
              Full release notes <ExternalLink size={12} aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={handleDismiss}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
