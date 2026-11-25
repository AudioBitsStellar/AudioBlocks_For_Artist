import PrivyProvider from "@/context/PrivyProvider";

export default function ArtistSignupLayout({ children }: { children: React.ReactNode }) {
  return <PrivyProvider>{children}</PrivyProvider>;
}
