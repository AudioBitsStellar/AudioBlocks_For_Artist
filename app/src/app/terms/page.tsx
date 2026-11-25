import React from "react";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

export const metadata = {
  title: "Terms of Service | AudioBlocks for Artists",
  description: "Terms and conditions for artists using the AudioBlocks music platform.",
};

export const TERMS_VERSION = "1.0";
export const TERMS_EFFECTIVE_DATE = "January 1, 2026";

export default function TermsPage() {
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
            <div className="p-2.5 rounded-xl bg-pink-500/10 text-[#D2045B] border border-pink-500/20">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Terms of Service</h1>
              <p className="text-sm text-gray-400 mt-1">
                Version {TERMS_VERSION} &bull; Effective Date: {TERMS_EFFECTIVE_DATE}
              </p>
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl p-6 sm:p-8 space-y-6 bg-[#161616] border border-[#2A2A2A] leading-relaxed text-sm text-gray-300"
          data-testid="terms-content"
        >
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">1. Acceptance of Terms</h2>
            <p>
              By registering an artist account or accessing the AudioBlocks platform
              (&quot;Platform&quot;), you agree to be bound by these Terms of Service
              (&quot;Terms&quot;). If you are entering into these Terms on behalf of a band, label,
              or entity, you represent and warrant that you have full authority to bind that entity.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">2. Artist Accounts & Eligibility</h2>
            <p>
              Artists must be at least 18 years of age or have legal guardian consent. You agree to
              provide accurate, current, and complete registration information and to maintain the
              security of your credentials and linked Stellar wallets.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">3. Music Ownership & Licensing</h2>
            <p>
              <strong className="text-white">You retain 100% ownership of your music.</strong>{" "}
              AudioBlocks does not claim any copyright or master rights in the sound recordings or
              underlying compositions you upload. By uploading content, you grant AudioBlocks a
              non-exclusive, worldwide license solely to host, stream, transcode, and distribute
              your releases as directed by you.
            </p>
            <p>
              You represent and warrant that all content you publish does not infringe any
              third-party intellectual property, copyright, or trademark rights.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">
              4. Royalties & Stellar Soroban Contracts
            </h2>
            <p>
              AudioBlocks utilizes Stellar blockchain smart contracts (Soroban) and decentralized
              protocols to track streams and facilitate instantaneous royalty disbursements. All
              payouts are executed transparently to your designated Stellar public address without
              custodial holding.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">5. Prohibited Conduct</h2>
            <p>
              Artists may not artificially inflate stream numbers through bots or automated scripts,
              upload defamatory or unlawful audio, or impersonate other creators. Violations will
              result in immediate account suspension and catalog removal.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">6. Termination & Updates</h2>
            <p>
              You may terminate your account and remove your music at any time. AudioBlocks reserves
              the right to update these Terms with advance notification. Continued use following
              notice constitutes acceptance of the updated version.
            </p>
          </section>

          <section className="space-y-3 pt-4 border-t border-[#2A2A2A]">
            <h2 className="text-lg font-semibold text-white">7. Contact & Support</h2>
            <p>
              For legal inquiries or questions regarding these Terms, contact our compliance team at{" "}
              <a href="mailto:support@audioblocks.com" className="text-[#D2045B] hover:underline">
                support@audioblocks.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
