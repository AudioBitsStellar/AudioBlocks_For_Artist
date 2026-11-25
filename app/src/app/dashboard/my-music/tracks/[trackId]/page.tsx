"use client";

import { use } from "react";
import PathBreadcrumb from "@/components/PathBreadcrumb";

interface TrackDetailPageProps {
  params: Promise<{
    trackId: string;
  }>;
}

export default function TrackDetailPage({ params }: TrackDetailPageProps) {
  const { trackId } = use(params);

  return (
    <div className="space-y-8">
      <PathBreadcrumb />
      <section className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-text-muted">Track</p>
        <h1 className="text-3xl font-bold text-text">{trackId}</h1>
      </section>
    </div>
  );
}
