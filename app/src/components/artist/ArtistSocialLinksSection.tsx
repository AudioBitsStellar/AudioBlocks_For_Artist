"use client";

import React from "react";
import { Globe, Radio, ExternalLink, ShieldCheck, Share2 } from "lucide-react";
import { socialProfileUrl, SocialPlatformId } from "@/utils/linkedAccounts";

export interface SocialLinkItem {
  id: string;
  platform: SocialPlatformId | "website" | "stellar";
  handle: string;
  label?: string;
  url?: string;
  verified?: boolean;
}

interface ArtistSocialLinksSectionProps {
  links?: SocialLinkItem[];
  website?: string;
  twitter?: string;
  stellarAddress?: string;
  className?: string;
}

export default function ArtistSocialLinksSection({
  links,
  website,
  twitter,
  stellarAddress,
  className = "",
}: ArtistSocialLinksSectionProps) {
  // Aggregate explicit links or fallback to legacy props
  const allLinks: SocialLinkItem[] = [...(links || [])];

  if (website && !allLinks.some((l) => l.platform === "website")) {
    allLinks.push({
      id: "legacy-website",
      platform: "website",
      handle: website.replace(/^https?:\/\//, ""),
      url: website.startsWith("http") ? website : `https://${website}`,
    });
  }

  if (twitter && !allLinks.some((l) => l.platform === "x")) {
    const cleanTwitter = twitter.replace(/^@/, "");
    allLinks.push({
      id: "legacy-twitter",
      platform: "x",
      handle: `@${cleanTwitter}`,
      url: `https://x.com/${cleanTwitter}`,
    });
  }

  if (stellarAddress && !allLinks.some((l) => l.platform === "stellar")) {
    allLinks.push({
      id: "legacy-stellar",
      platform: "stellar",
      handle: `${stellarAddress.slice(0, 6)}...${stellarAddress.slice(-6)}`,
      label: "Stellar Account",
      url: `https://stellar.expert/explorer/public/account/${stellarAddress}`,
      verified: true,
    });
  }

  if (allLinks.length === 0) {
    return null;
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "website":
        return <Globe size={16} aria-hidden="true" className="text-emerald-400" />;
      case "stellar":
        return <ShieldCheck size={16} aria-hidden="true" className="text-purple-400" />;
      default:
        return <Radio size={16} aria-hidden="true" className="text-cyan-400" />;
    }
  };

  return (
    <section
      className={`rounded-2xl border border-[#1F1F1F] bg-[#111111] p-6 space-y-4 ${className}`}
      aria-labelledby="artist-social-links-heading"
    >
      <div className="flex items-center justify-between">
        <h2
          id="artist-social-links-heading"
          className="text-lg font-semibold text-white flex items-center gap-2"
        >
          <Share2 size={18} className="text-emerald-400" aria-hidden="true" />
          Social & Online Presence
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {allLinks.map((item) => {
          const href =
            item.url ||
            (item.platform === "website"
              ? item.handle.startsWith("http")
                ? item.handle
                : `https://${item.handle}`
              : socialProfileUrl(item.platform as SocialPlatformId, item.handle));

          return (
            <a
              key={item.id || item.handle}
              href={href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex items-center justify-between gap-3 rounded-xl border border-[#2A2A2A] bg-[#161616] px-4 py-3 text-sm text-gray-200 transition-all hover:bg-[#222222] hover:border-emerald-500/50 group focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <div className="flex items-center gap-2.5 truncate">
                {getPlatformIcon(item.platform)}
                <div className="truncate">
                  <span className="block font-medium text-white capitalize text-xs text-gray-400">
                    {item.label || item.platform}
                  </span>
                  <span className="block truncate text-sm text-gray-200 group-hover:text-emerald-400 transition-colors">
                    {item.handle}
                  </span>
                </div>
              </div>
              <ExternalLink
                size={14}
                className="text-gray-500 group-hover:text-white shrink-0 transition-colors"
              />
            </a>
          );
        })}
      </div>
    </section>
  );
}
