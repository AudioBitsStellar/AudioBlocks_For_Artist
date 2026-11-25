import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Provider from "@/context/provider";
import ThemeScript from "@/components/ThemeScript";
import RuntimeConfigScript from "@/components/RuntimeConfigScript";
import StellarNetworkBanner from "@/components/StellarNetworkBanner";
import WebVitalsReporter from "@/components/WebVitalsReporter";
import RootErrorBoundary from "@/components/RootErrorBoundary";
import OfflineIndicator from "@/components/OfflineIndicator";
import SupportFeedbackModal from "@/components/support/SupportFeedbackModal";
import { Toaster } from "sonner";
import { defaultMetadata } from "@/utils/metadata";
import ApiUnavailableBanner from "@/components/ApiUnavailableBanner";

// PERF-07: next/font self-hosts these at build time, so the browser never
// waits on a third-party font CDN, and a swap display strategy lets text paint
// in the fallback while the file loads. `adjustFontFallback` (on by default) sizes
// that fallback to the real face, which is what keeps the swap from shifting
// layout — the CLS budget in src/lib/performanceBudgets.ts is what a
// regression here would break.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = defaultMetadata;
export const dynamic = "force-dynamic";

const REQUIRED_ENV_VARS = ["NEXT_PUBLIC_API_BASE_URL", "NEXT_PUBLIC_API_URL"];

function validateEnv() {
  const missing: string[] = [];
  if (typeof window === "undefined") {
    // Only validate server-side during rendering or build to avoid client-side mismatch
    for (const name of REQUIRED_ENV_VARS) {
      const val = process.env[name];
      if (!val) {
        missing.push(name);
      } else if (
        name.includes("API") &&
        !val.startsWith("http://") &&
        !val.startsWith("https://")
      ) {
        missing.push(`${name} (must start with http:// or https://)`);
      }
    }
  }
  return missing;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const missingEnv = validateEnv();

  if (missingEnv.length > 0) {
    return (
      <html lang="en">
        <body className="bg-black text-white flex items-center justify-center min-h-screen p-6 font-sans">
          <div className="max-w-md w-full bg-zinc-900 border border-red-500/50 rounded-xl p-8 shadow-2xl text-center">
            <h1 className="text-2xl font-bold text-red-500 mb-4">Configuration Error</h1>
            <p className="text-zinc-400 mb-6">
              The application failed to start because some required environment variables are
              missing or misconfigured:
            </p>
            <ul className="text-left bg-black/40 border border-zinc-800 rounded-lg p-4 mb-6 space-y-2 text-sm font-mono text-zinc-300">
              {missingEnv.map((env) => (
                <li key={env} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  {env}
                </li>
              ))}
            </ul>
            <p className="text-xs text-zinc-500">
              Please define these variables in your <code>.env.local</code> file and restart the dev
              server.
            </p>
          </div>
        </body>
      </html>
    );
  }

  return (
    // `suppressHydrationWarning` is required: ThemeScript sets `class="dark"`
    // and `data-theme` on this element before React hydrates (#423).
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <RuntimeConfigScript />
        <ThemeScript />
        <StellarNetworkBanner />
        <WebVitalsReporter />
        <a
          href="#main-content"
          className="absolute left-4 top-4 z-[100] -translate-y-[200%] rounded-md bg-white px-4 py-2 font-semibold text-black shadow-lg transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-black"
        >
          Skip to main content
        </a>
        <Provider>
          <OfflineIndicator />
          <ApiUnavailableBanner />
          <RootErrorBoundary>{children}</RootErrorBoundary>
          <SupportFeedbackModal />
          <Toaster
            position="top-right"
            expand
            richColors
            closeButton
            toastOptions={{
              classNames: {
                toast: "font-sans",
              },
            }}
          />
        </Provider>
      </body>
    </html>
  );
}
