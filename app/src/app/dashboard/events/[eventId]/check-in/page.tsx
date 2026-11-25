"use client";

import { use } from "react";
import PathBreadcrumb from "@/components/PathBreadcrumb";
import dynamic from "next/dynamic";

const CheckInScanner = dynamic(() => import("@/components/events/CheckInScanner"));

interface CheckInPageProps {
  params: Promise<{
    eventId: string;
  }>;
}

export default function CheckInPage({ params }: CheckInPageProps) {
  const { eventId } = use(params);

  return (
    <div className="space-y-8">
      <PathBreadcrumb />
      <section className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-text-muted">Event Check-In</p>
        <h1 className="text-3xl font-bold text-text">Scan Tickets</h1>
      </section>
      <CheckInScanner eventId={eventId} />
    </div>
  );
}
