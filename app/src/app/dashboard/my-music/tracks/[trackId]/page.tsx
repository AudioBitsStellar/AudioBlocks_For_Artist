'use client';

import PathBreadcrumb from '@/components/PathBreadcrumb';

interface TrackDetailPageProps {
  params: {
    trackId: string;
  };
}

export default function TrackDetailPage({ params }: TrackDetailPageProps) {
  return (
    <div className="space-y-8">
      <PathBreadcrumb />
      <section className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-text-muted">Track</p>
        <h1 className="text-3xl font-bold text-text">{params.trackId}</h1>
      </section>
    </div>
  );
}
