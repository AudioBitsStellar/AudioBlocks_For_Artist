"use client";

import { use } from "react";
import PathBreadcrumb from "@/components/PathBreadcrumb";

interface EventDetailPageProps {
  params: Promise<{
    eventId: string;
  }>;
}

export default function EventDetailPage({ params }: EventDetailPageProps) {
  const { eventId } = use(params);

  return (
    <div className="space-y-8">
      <PathBreadcrumb />
      <section className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-text-muted">Event</p>
        <h1 className="text-3xl font-bold text-text">{eventId}</h1>
      </section>
    </div>
  );
}
