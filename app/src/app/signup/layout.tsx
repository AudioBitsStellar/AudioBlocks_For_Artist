import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up — AudioBlocks",
  description: "Create your AudioBlocks artist account to upload and manage your music.",
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
