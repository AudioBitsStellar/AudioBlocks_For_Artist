"use client";

import { Users, Copy, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export default function ReferralProgramPage() {
  const [copied, setCopied] = useState(false);
  const referralLink = "https://audioblock.io/join?ref=artist123";

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
              className="flex-1 bg-background border border-border rounded-lg p-3 text-text font-mono text-sm"
            />
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-primary text-primary-contrast rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        </div>

        <div className="pt-6 border-t border-border grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-background rounded-lg p-4 border border-border text-center">
            <span className="text-3xl font-bold text-primary">12</span>
            <p className="text-sm text-text-muted mt-1">Total Referrals</p>
          </div>
          <div className="bg-background rounded-lg p-4 border border-border text-center">
            <span className="text-3xl font-bold text-primary">5</span>
            <p className="text-sm text-text-muted mt-1">Active Artists</p>
          </div>
          <div className="bg-background rounded-lg p-4 border border-border text-center">
            <span className="text-3xl font-bold text-primary">$340</span>
            <p className="text-sm text-text-muted mt-1">Total Earned</p>
          </div>
        </div>
      </div>
    </div>
  );
}
