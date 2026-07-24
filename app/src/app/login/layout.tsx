import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in — AudioBlocks",
  description: "Log in to your AudioBlocks artist account to manage your music, earnings, and fan engagement.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
