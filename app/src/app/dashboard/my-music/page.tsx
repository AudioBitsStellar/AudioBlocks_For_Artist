"use client";

import { useState } from "react";
import Breadcrumb from "@/components/Breadcrumb";
import ErrorBoundary from "@/components/ErrorBoundary";
import dynamic from "next/dynamic";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Album } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { ALBUMS_QUERY_KEY } from "@/services/albumService";

const MyMusicContent = dynamic(() => import("@/components/MyMusicContent"));

export default function MyMusicPage() {
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [boundaryKey, setBoundaryKey] = useState(0);
  const queryClient = useQueryClient();
  const route = useRouter();

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ALBUMS_QUERY_KEY });
    setBoundaryKey((prev) => prev + 1);
  };

  const handleBreadcrumbClick = () => {
    setSelectedAlbum(null);
  };

  const breadcrumbItems = selectedAlbum
    ? [
        { label: "My Music", onClick: handleBreadcrumbClick },
        { label: "collection" },
        { label: selectedAlbum.title, isActive: true },
      ]
    : [
        { label: "Overview", href: "/dashboard/overview" },
        { label: "My Music", isActive: true },
      ];

  return (
    <>
      <Breadcrumb
        items={breadcrumbItems}
        action={
          <button
            onClick={() => route.push("/dashboard/upload-music")}
            className="bg-[#D2045B] cursor-pointer hover:bg-[#B8043F] text-white font-semibold px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Add Music
          </button>
        }
      />
      <ErrorBoundary
        key={boundaryKey}
        fallbackTitle="Failed to load your music library"
        fallbackDescription="An error occurred while loading your albums and tracks. Check your connection and retry."
        retryLabel="Retry"
        onRetry={handleRetry}
      >
        <MyMusicContent onAlbumSelect={setSelectedAlbum} />
      </ErrorBoundary>
    </>
  );
}
