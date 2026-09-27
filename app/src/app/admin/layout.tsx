import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ShieldCheck } from "lucide-react";

/**
 * Admin console chrome (issue #420).
 *
 * Deliberately `noindex`: the artist directory is an internal moderation tool
 * and must never appear in search results.
 */
export const metadata: Metadata = {
  title: "Admin console",
  description: "Internal AudioBlocks admin console for artist discovery and moderation.",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#151918]">
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-[#2A2A2A] bg-[#161616] px-4 sm:h-20 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            aria-label="AudioBlocks Home"
            className="rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D2045B]"
          >
            <Image src="/logo.png" alt="AudioBlocks Logo" width={90} height={50} priority />
          </Link>
          <span className="hidden items-center gap-2 rounded-full bg-[#2A2A2A] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#C9C9C9] sm:inline-flex">
            <ShieldCheck size={14} aria-hidden="true" />
            Admin
          </span>
        </div>
        <Link
          href="/dashboard/overview"
          className="flex min-w-11 items-center gap-2 rounded-lg px-2 py-2 text-sm text-white transition-colors hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D2045B]"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          {/* One text node, revealed from sm up — a second hidden copy would
              be read twice by assistive tech. */}
          <span className="sr-only sm:not-sr-only">Back to dashboard</span>
        </Link>
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1 px-4 py-6 focus:outline-none sm:px-8 sm:py-8">
        {children}
      </main>
    </div>
  );
}
