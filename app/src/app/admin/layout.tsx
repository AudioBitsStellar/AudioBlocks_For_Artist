import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { verifyPrivyToken } from "@/lib/privy-server";

/**
 * Admin console chrome (issue #420, issue #520).
 *
 * Deliberately `noindex`: the artist directory is an internal moderation tool
 * and must never appear in search results.
 */
export const metadata: Metadata = {
  title: "Admin console",
  description: "Internal AudioBlocks admin console for artist discovery and moderation.",
  robots: { index: false, follow: false, nocache: true },
};

function decodeJwtRole(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const jsonStr = Buffer.from(padded, "base64").toString("utf-8");
    const payload = JSON.parse(jsonStr) as {
      role?: unknown;
      user_role?: unknown;
      user?: { role?: unknown };
      customMetadata?: { role?: unknown };
    };
    const role =
      payload.role ??
      payload.user_role ??
      payload.user?.role ??
      payload.customMetadata?.role;
    return typeof role === "string" ? role.toLowerCase() : null;
  } catch {
    return null;
  }
}

async function verifyIsAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const privyToken =
      cookieStore.get("privy-token")?.value ||
      cookieStore.get("privy-session")?.value;
    const appJwt =
      cookieStore.get("audioblocks_jwt")?.value ||
      cookieStore.get("token")?.value;

    if (privyToken) {
      if (process.env.NEXT_PUBLIC_PRIVY_APP_ID && process.env.PRIVY_APP_SECRET) {
        const result = await verifyPrivyToken(privyToken);
        if (result.success && result.claims) {
          const claims = result.claims as unknown as {
            role?: string;
            customMetadata?: { role?: string };
          };
          if (
            claims.role?.toLowerCase() === "admin" ||
            claims.customMetadata?.role?.toLowerCase() === "admin"
          ) {
            return true;
          }
        }
      }
      const privyRole = decodeJwtRole(privyToken);
      if (privyRole === "admin") return true;
    }

    if (appJwt) {
      const jwtRole = decodeJwtRole(appJwt);
      if (jwtRole === "admin") return true;
    }

    return false;
  } catch {
    return false;
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const isAdmin = await verifyIsAdmin();
  if (!isAdmin) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-text">
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
          <span className="sr-only sm:not-sr-only">Back to dashboard</span>
        </Link>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 px-4 py-6 focus:outline-none sm:px-8 sm:py-8"
      >
        {children}
      </main>
    </div>
  );
}
