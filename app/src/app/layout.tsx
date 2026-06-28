import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import Provider from '@/context/provider';
import { Toaster } from 'sonner';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AudioBlocks - Artist Dashboard",
  description: "AudioBlocks artist dashboard for managing music, earnings, and fan engagement",
};

const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_API_BASE_URL",
  "NEXT_PUBLIC_API_URL"
];

function validateEnv() {
  const missing: string[] = [];
  if (typeof window === "undefined") {
    // Only validate server-side during rendering or build to avoid client-side mismatch
    for (const name of REQUIRED_ENV_VARS) {
      const val = process.env[name];
      if (!val) {
        missing.push(name);
      } else if (name.includes("API") && !val.startsWith("http://") && !val.startsWith("https://")) {
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
              The application failed to start because some required environment variables are missing or misconfigured:
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
              Please define these variables in your <code>.env.local</code> file and restart the dev server.
            </p>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Provider>
        {children}
          <Toaster />
        </Provider>
      </body>
    </html>
  );
}
