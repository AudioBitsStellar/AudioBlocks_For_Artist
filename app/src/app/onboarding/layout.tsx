import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Artist Onboarding - AudioBlocks",
  description: "Complete your artist profile to start uploading music on AudioBlocks",
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
