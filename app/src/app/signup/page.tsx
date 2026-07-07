import type { Metadata } from "next";
import SignupClient from "./SignupClient";

export const metadata: Metadata = {
  title: "Sign up | AudioBlocks",
  description:
    "Create an AudioBlocks artist account to upload music and manage your releases, earnings, and fans.",
};

export default function SignupPage() {
  return <SignupClient />;
}
