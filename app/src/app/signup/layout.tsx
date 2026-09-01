import type { Metadata } from "next";
import { generateMetadata } from "@/utils/metadata";

export const metadata: Metadata = generateMetadata({
  title: "Sign up",
  description:
    "Create your AudioBlocks artist account to upload and manage your music. Join the Web3 music revolution.",
  url: "/signup",
});

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
