"use client";

import Link from "next/link";
import Image from "next/image";
import { AlertTriangle, ArrowLeft, Home, RefreshCw } from "lucide-react";

interface BrandedErrorPageProps {
  kind: "not-found" | "error";
  onRetry?: () => void;
  reference?: string;
}

export default function BrandedErrorPage({ kind, onRetry, reference }: BrandedErrorPageProps) {
  const notFound = kind === "not-found";

  return (
    <main
      id="main-content"
      className="flex min-h-[70vh] items-center justify-center bg-[#09090b] px-6 py-16 text-white"
    >
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#141416] px-8 py-12 text-center shadow-2xl sm:px-12">
        <Image
          src="/logo.png"
          alt="AudioBlocks"
          width={160}
          height={48}
          priority
          className="mx-auto mb-10 h-12 w-auto"
        />
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-pink-500/30 bg-pink-500/10 text-pink-400">
          {notFound ? (
            <span className="text-xl font-bold" aria-hidden="true">
              404
            </span>
          ) : (
            <AlertTriangle className="h-7 w-7" aria-hidden="true" />
          )}
        </div>
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-pink-400">
          {notFound ? "Page not found" : "Something went wrong"}
        </p>
        <h1 className="mb-4 text-3xl font-bold sm:text-4xl">
          {notFound ? "This page went off the playlist." : "We hit an unexpected error."}
        </h1>
        <p className="mx-auto mb-8 max-w-md text-sm leading-6 text-zinc-400">
          {notFound
            ? "The link may be incorrect, or the page may have moved. Head back to your dashboard or start again from home."
            : "Your work is safe. Try loading the page again, or return to your dashboard."}
        </p>
        {reference && <p className="mb-6 text-xs text-zinc-500">Reference: {reference}</p>}
        <div className="flex flex-wrap justify-center gap-3">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-pink-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-pink-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try again
            </button>
          )}
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
