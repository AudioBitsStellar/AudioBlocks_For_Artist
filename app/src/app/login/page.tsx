import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Log in | AudioBlocks",
  description:
    "Log in to AudioBlocks to manage your music, earnings, and fan engagement from the artist dashboard.",
};

export default function LoginPage() {
  return <LoginClient />;
}
