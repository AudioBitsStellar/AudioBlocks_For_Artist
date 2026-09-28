import type { Metadata } from "next";
import ArtistSearch from "@/components/admin/ArtistSearch";
import ErrorBoundary from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "Artist search · Admin",
  description: "Search the AudioBlocks artist directory by name, handle, email or wallet address.",
};

export default function AdminArtistsPage() {
  return (
    <ErrorBoundary fallbackTitle="Artist search couldn't be loaded">
      <ArtistSearch />
    </ErrorBoundary>
  );
}
