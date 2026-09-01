import type { Metadata } from "next";
import { generateMetadata } from "@/utils/metadata";

export const metadata: Metadata = generateMetadata({
  title: "Log in",
  description:
    "Log in to your AudioBlocks artist account to manage your music, earnings, and fan engagement.",
  url: "/login",
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
