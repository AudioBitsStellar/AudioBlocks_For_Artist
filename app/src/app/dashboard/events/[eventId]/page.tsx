"use client";

import PathBreadcrumb from "@/components/PathBreadcrumb";

interface EventDetailPageProps {
  params: {
    eventId: string;
  };
}

export default function EventDetailPage({ params }: EventDetailPageProps) {
  return (
    <div className="space-y-8">
      <PathBreadcrumb />
      <section className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-text-muted">Event</p>
        <h1 className="text-3xl font-bold text-text">{params.eventId}</h1>
      </section>
    </div>
  );
}
