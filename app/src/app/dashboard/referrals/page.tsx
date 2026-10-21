"use client";

import { Users, Copy, CheckCircle2, Share2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// TODO: Replace with actual profile query when available
function useArtistProfile() {
  return {
    handle: "artist123", // Placeholder - should come from usePrivy or profile API
    referralCode: null, // Placeholder - should come from backend if available
  };
}

export default function ReferralProgramPage() {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const profile = useArtistProfile();

  const baseUrl = process.env.NEXT_PUBLIC_LISTENER_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://audioblocks.io";
  const referralCode = profile.referralCode || profile.handle;
  const referralLink = `${baseUrl}/join?ref=${referralCode}`;

  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setCopyError(false);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      setCopyError(true);
      toast.error("Failed to copy. Please select and copy manually.");
    }
  };

  const handleShare = async () => {
    if (!canShare) return;

    try {
      await navigator.share({
        title: "Join AudioBlocks",
        text: "Check out AudioBlocks - a platform for artists to share and monetize their music!",
        url: referralLink,
      });
    } catch (error) {
      // User canceled or share failed - no need to show error
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold text-text flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          Referral Program
        </h1>
        <p className="text-text-muted mt-2">
          Invite other artists and earn a percentage of their first-year earnings.
        </p>
      </header>

      <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
        <div>
          <h3 className="font-semibold text-lg text-text">Your Referral Link</h3>
          <p className="text-sm text-text-muted mt-1">
            Share this link with your network to start earning.
          </p>

          <div className="mt-4 flex gap-2">
            <input
              type="text"
              readOnly
              value={referralLink}
              onClick={(e) => {
                if (copyError) {
                  e.currentTarget.select();
                }
              }}
              className="flex-1 bg-background border border-border rounded-lg p-3 text-text font-mono text-sm"
              aria-label="Your referral link"
            />
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-primary text-primary-contrast rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
              aria-label="Copy referral link"
            >
              {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
            {canShare && (
              <button
                onClick={handleShare}
                className="px-4 py-2 bg-surface-sunken border border-border text-text rounded-lg font-medium hover:bg-surface transition-colors flex items-center gap-2"
                aria-label="Share referral link"
              >
                <Share2 size={18} />
                Share
              </button>
            )}
          </div>
          
          {copyError && (
            <p className="mt-2 text-sm text-error flex items-center gap-1">
              <AlertCircle size={14} />
              Copy failed. Click the link above to select and copy manually.
            </p>
          )}
        </div>

        <div className="pt-6 border-t border-border">
          <p className="text-sm text-text-muted mb-4">
            Referral statistics are coming soon. Check back later to see your impact!
          </p>
        </div>
      </div>
    </div>
  );
}
