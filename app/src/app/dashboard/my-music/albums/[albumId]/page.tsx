"use client";

import { use } from "react";
import PathBreadcrumb from "@/components/PathBreadcrumb";

interface AlbumDetailPageProps {
  params: Promise<{
    albumId: string;
  }>;
}

export default function AlbumDetailPage({ params }: AlbumDetailPageProps) {
  const { albumId } = use(params);

  return (
    <div className="space-y-8">
      <PathBreadcrumb />
      <section className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-text-muted">Album</p>
        <h1 className="text-3xl font-bold text-text">{albumId}</h1>
      </section>
    </div>
  );
}
