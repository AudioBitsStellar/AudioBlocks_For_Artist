import type { Metadata } from "next";
import { generateMetadata } from "@/utils/metadata";

export const metadata: Metadata = generateMetadata({
  title: "Verify your email",
  description:
    "Confirm the email address on your AudioBlocks artist account to finish setting up your workspace.",
  url: "/verify-email",
});

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
