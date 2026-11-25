import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | AudioBlocks for Artists",
  description: "Privacy policy and data protection practices for AudioBlocks artists.",
};

export const PRIVACY_VERSION = "1.0";
export const PRIVACY_EFFECTIVE_DATE = "January 1, 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-gray-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Privacy Policy</h1>
              <p className="text-sm text-gray-400 mt-1">
                Version {PRIVACY_VERSION} &bull; Effective Date: {PRIVACY_EFFECTIVE_DATE}
              </p>
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl p-6 sm:p-8 space-y-6 bg-[#161616] border border-[#2A2A2A] leading-relaxed text-sm text-gray-300"
          data-testid="privacy-content"
        >
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">1. Information We Collect</h2>
            <p>
              When you register as an artist, we collect your display name, username, email address,
              and optional profile information (bio, social links, artwork). When you link a Stellar
              wallet, we record your public Stellar account address.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">2. How We Use Your Information</h2>
            <p>
              We use collected information to administer your artist workspace, host and stream your
              audio catalog, calculate streaming metrics, communicate platform updates, and prevent
              fraudulent streaming activities.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">
              3. Stellar Blockchain Public Transparency
            </h2>
            <p>
              Transactions processed on the Stellar blockchain (such as royalty distributions, tips,
              and NFT minting) are publicly recorded by the network. Your public wallet address and
              on-chain transactions are permanent, immutable, and viewable on public ledger
              explorers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">4. Third-Party Services</h2>
            <p>
              We integrate with trusted providers for platform functionality, including Privy for
              authentication and decentralized wallet onboarding, Cloudflare R2 / AWS S3 for secure
              media storage, and Sentry for error tracking and reliability monitoring.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">5. Data Retention & Security</h2>
            <p>
              We implement industry-standard encryption, rate-limiting, and strict access controls
              to protect your data. You may request deletion of your account and personal
              information at any time by submitting a request to our privacy team.
            </p>
          </section>

          <section className="space-y-3 pt-4 border-t border-[#2A2A2A]">
            <h2 className="text-lg font-semibold text-white">6. Your Rights & Privacy Inquiries</h2>
            <p>
              You have the right to access, rectify, or delete your personal data. For
              privacy-related questions, contact our Data Protection Officer at{" "}
              <a href="mailto:privacy@audioblocks.com" className="text-emerald-400 hover:underline">
                privacy@audioblocks.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
